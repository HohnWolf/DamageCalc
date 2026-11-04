import json
import os
import sys
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
import numpy as np

class ChampionsNet(nn.Module):
    def __init__(self, input_dim=64):
        super().__init__()
        self.fc1 = nn.Linear(input_dim, 128)
        self.fc2 = nn.Linear(128, 64)
        self.fc3 = nn.Linear(64, 1)

    def forward(self, x):
        h1 = F.relu(self.fc1(x))
        h2 = F.relu(self.fc2(h1))
        return self.fc3(h2)

def train_and_export():
    base_dir = os.path.dirname(__file__)
    dataset_path = os.path.join(base_dir, "dataset.json")
    buffer_path = os.path.join(base_dir, "replay_buffer.json")

    if not os.path.exists(dataset_path):
        print(f"Error: {dataset_path} does not exist. Run master_loop_20.js or train_pipeline.js first.")
        return

    with open(dataset_path, "r", encoding="utf-8") as f:
        new_data = json.load(f)

    # Sliding-Window Replay Buffer (prevents catastrophic forgetting across generations)
    max_buffer_size = 20000
    buffer_data = []
    if os.path.exists(buffer_path):
        try:
            with open(buffer_path, "r", encoding="utf-8") as bf:
                buffer_data = json.load(bf)
        except Exception:
            buffer_data = []

    combined = buffer_data + new_data
    if len(combined) > max_buffer_size:
        combined = combined[-max_buffer_size:]

    try:
        with open(buffer_path, "w", encoding="utf-8") as bf:
            json.dump(combined, bf)
    except Exception:
        pass

    # Train on current generation + random replay sample for fast, stable multi-team convergence
    if len(buffer_data) > 3000:
        replay_idx = np.random.choice(len(buffer_data), size=3000, replace=False)
        train_data = new_data + [buffer_data[i] for i in replay_idx]
    else:
        train_data = combined

    print(f"Loaded {len(new_data)} new turns (Training set with Replay Buffer: {len(train_data)} turns).")

    model = ChampionsNet(input_dim=64)
    weights_path = os.path.join(base_dir, "..", "data", "ai_weights.json")
    if os.path.exists(weights_path):
        try:
            with open(weights_path, "r", encoding="utf-8") as wf:
                old_w = json.load(wf)
            with torch.no_grad():
                model.fc1.weight.copy_(torch.tensor(old_w["W1"]).reshape(128, 64))
                model.fc1.bias.copy_(torch.tensor(old_w["b1"]))
                model.fc2.weight.copy_(torch.tensor(old_w["W2"]).reshape(64, 128))
                model.fc2.bias.copy_(torch.tensor(old_w["b2"]))
                model.fc3.weight.copy_(torch.tensor(old_w["W3"]).reshape(1, 64))
                model.fc3.bias.copy_(torch.tensor(old_w["b3"]))
            print("Loaded previous generation weights for continuous multi-team transfer learning.")
        except Exception as e:
            print(f"Note: Starting with fresh weights ({e})")

    epochs = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    optimizer = optim.AdamW(model.parameters(), lr=0.0008, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    for epoch in range(epochs):
        total_loss = 0.0
        correct_win_preds = 0
        win_samples = 0
        total_samples = 0

        indices = np.random.permutation(len(train_data))

        for idx in indices:
            sample = train_data[idx]
            cands = sample["features"]
            chosen = sample["chosenIndex"]
            reward = float(sample["reward"])

            if len(cands) == 0 or chosen >= len(cands):
                continue

            cands_tensor = torch.tensor(cands, dtype=torch.float32) # [K, 64]
            q_values = model(cands_tensor).squeeze(-1) # [K]

            # 1. Q-Value regression: predict return of chosen action
            target_q = torch.tensor(reward, dtype=torch.float32)
            mse_loss = F.smooth_l1_loss(q_values[chosen], target_q)

            # 2. Tactical Blunder Penalty across all candidates (indices 57..60 encode doubleProtect, speedConflict, friendlyFire, immuneOrWaste)
            blunder_mask = (cands_tensor[:, 57:61].sum(dim=1) > 0.5)
            blunder_loss = torch.tensor(0.0)
            if blunder_mask.any():
                blunder_loss = F.relu(q_values[blunder_mask] - (-0.9)).mean()

            # 3. Preference loss: for winning lines, maximize probability of chosen move
            if reward > 0:
                ce_loss = F.cross_entropy(q_values.unsqueeze(0), torch.tensor([chosen], dtype=torch.long))
                loss = mse_loss + 0.45 * ce_loss + 0.35 * blunder_loss
                win_samples += 1
                if torch.argmax(q_values).item() == chosen:
                    correct_win_preds += 1
            else:
                median_q = torch.median(q_values)
                margin_loss = F.relu(q_values[chosen] - median_q + 0.25)
                loss = mse_loss + 0.35 * margin_loss + 0.35 * blunder_loss

            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            total_loss += loss.item()
            total_samples += 1

        scheduler.step()
        avg_loss = total_loss / max(total_samples, 1)
        win_acc = (correct_win_preds / max(win_samples, 1)) * 100.0
        print(f"Epoch {epoch + 1:2d}/{epochs:2d} | Loss: {avg_loss:.4f} | Win Move Accuracy: {win_acc:.1f}%")

    model.eval()

    # 1. Export to ONNX
    onnx_path = os.path.join(base_dir, "champions_bot.onnx")
    dummy_input = torch.randn(1, 64, dtype=torch.float32)
    try:
        torch.onnx.export(
            model,
            dummy_input,
            onnx_path,
            input_names=["candidate_features"],
            output_names=["action_score"],
            dynamic_axes={"candidate_features": {0: "batch_size"}, "action_score": {0: "batch_size"}},
            opset_version=14,
            dynamo=False
        )
    except Exception:
        pass

    # 2. Export Weights to JSON for zero-dependency high-speed JS inference
    weights = {
        "W1": model.fc1.weight.detach().cpu().numpy().flatten().tolist(),
        "b1": model.fc1.bias.detach().cpu().numpy().tolist(),
        "W2": model.fc2.weight.detach().cpu().numpy().flatten().tolist(),
        "b2": model.fc2.bias.detach().cpu().numpy().tolist(),
        "W3": model.fc3.weight.detach().cpu().numpy().flatten().tolist(),
        "b3": model.fc3.bias.detach().cpu().numpy().tolist(),
        "input_dim": 64,
        "h1_dim": 128,
        "h2_dim": 64
    }

    with open(weights_path, "w", encoding="utf-8") as f:
        json.dump(weights, f)
    print(f"Exported Native JS Weights to: {weights_path} ({os.path.getsize(weights_path) // 1024} KB)")

if __name__ == "__main__":
    train_and_export()
