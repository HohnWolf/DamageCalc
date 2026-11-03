import json
import os
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
    dataset_path = os.path.join(os.path.dirname(__file__), "dataset.json")
    if not os.path.exists(dataset_path):
        print(f"Error: {dataset_path} does not exist. Run train_pipeline.js first.")
        return

    print("Loading dataset from JSON...")
    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"Loaded {len(data)} training turns.")

    model = ChampionsNet(input_dim=64)
    weights_path = os.path.join(os.path.dirname(__file__), "..", "data", "ai_weights.json")
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
            print("Successfully initialized model with previous iteration weights for continuous transfer learning!")
        except Exception as e:
            print(f"Note: Starting with fresh weights ({e})")

    import sys
    epochs = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    optimizer = optim.AdamW(model.parameters(), lr=0.001, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    print(f"Starting PyTorch training for {epochs} epochs...")

    for epoch in range(epochs):
        total_loss = 0.0
        correct_win_preds = 0
        total_samples = 0

        # Shuffle samples
        indices = np.random.permutation(len(data))

        for idx in indices:
            sample = data[idx]
            cands = sample["features"]
            chosen = sample["chosenIndex"]
            reward = float(sample["reward"]) # +1.0 for winner, -1.0 for loser

            if len(cands) == 0:
                continue

            cands_tensor = torch.tensor(cands, dtype=torch.float32) # [K, 64]
            q_values = model(cands_tensor).squeeze(-1) # [K]

            # 1. Q-Value regression: predict return of chosen action
            target_q = torch.tensor(reward, dtype=torch.float32)
            mse_loss = F.smooth_l1_loss(q_values[chosen], target_q)

            # 2. Preference loss: for winning lines, maximize probability of chosen move
            if reward > 0:
                ce_loss = F.cross_entropy(q_values.unsqueeze(0), torch.tensor([chosen], dtype=torch.long))
                loss = mse_loss + 0.5 * ce_loss
            else:
                # For losing lines, margin loss: chosen action should be lower than median
                median_q = torch.median(q_values)
                margin_loss = F.relu(q_values[chosen] - median_q + 0.2)
                loss = mse_loss + 0.3 * margin_loss

            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            total_loss += loss.item()
            total_samples += 1

            if reward > 0 and torch.argmax(q_values).item() == chosen:
                correct_win_preds += 1

        scheduler.step()
        avg_loss = total_loss / max(total_samples, 1)
        win_acc = (correct_win_preds / max(total_samples, 1)) * 100.0
        print(f"Epoch {epoch + 1:2d}/{epochs:2d} | Loss: {avg_loss:.4f} | Win Move Accuracy: {win_acc:.1f}%")

    model.eval()

    # 1. Export to ONNX
    onnx_path = os.path.join(os.path.dirname(__file__), "champions_bot.onnx")
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
        print(f"Exported ONNX model to: {onnx_path}")
    except Exception as e:
        print(f"ONNX export warning: {e}")

    # 2. Export Weights to JSON for zero-dependency high-speed JS inference
    weights_path = os.path.join(os.path.dirname(__file__), "..", "data", "ai_weights.json")
    weights = {
        "W1": model.fc1.weight.detach().cpu().numpy().flatten().tolist(), # [128, 64] -> flat 8192
        "b1": model.fc1.bias.detach().cpu().numpy().tolist(),            # [128]
        "W2": model.fc2.weight.detach().cpu().numpy().flatten().tolist(), # [64, 128] -> flat 8192
        "b2": model.fc2.bias.detach().cpu().numpy().tolist(),            # [64]
        "W3": model.fc3.weight.detach().cpu().numpy().flatten().tolist(), # [1, 64] -> flat 64
        "b3": model.fc3.bias.detach().cpu().numpy().tolist(),            # [1]
        "input_dim": 64,
        "h1_dim": 128,
        "h2_dim": 64
    }

    with open(weights_path, "w", encoding="utf-8") as f:
        json.dump(weights, f)
    print(f"Exported Native JS Weights to: {weights_path} ({os.path.getsize(weights_path) // 1024} KB)")

if __name__ == "__main__":
    train_and_export()
