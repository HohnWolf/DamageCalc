using System.Text.Json;
using PKHeX.Core;

// Kommandozeilen-Werkzeug für Vergleichstests von Rattata Labs gegen PKHeX.Core
//   dump <sav>                 -> JSON: Spielstand + alle Pokémon (Felder, Legalität)
//   blank <version> <out>      -> leeren Spielstand der Version erzeugen
//   fill <version> <out> [n]   -> Spielstand mit n legalen Pokémon (PKHeX-Generator) füllen
static object Mon(PKM pk, string where)
{
    var la = new LegalityAnalysis(pk);
    var moves = new ushort[4]; pk.GetMoves(moves);
    var ivs = new[] { pk.IV_HP, pk.IV_ATK, pk.IV_DEF, pk.IV_SPA, pk.IV_SPD, pk.IV_SPE };
    var evs = new[] { pk.EV_HP, pk.EV_ATK, pk.EV_DEF, pk.EV_SPA, pk.EV_SPD, pk.EV_SPE };
    return new {
        where, species = pk.Species, form = pk.Form, level = pk.CurrentLevel, exp = pk.EXP, nature = (int)pk.Nature,
        ability = pk.Ability, abilityNum = pk.AbilityNumber, pid = pk.PID, ec = pk.EncryptionConstant, tid = pk.TID16, sid = pk.SID16,
        ot = pk.OriginalTrainerName, nick = pk.Nickname, isNick = pk.IsNicknamed, gender = pk.Gender, shiny = pk.IsShiny, ball = pk.Ball,
        item = pk.HeldItem, moves, pp = new[] { pk.Move1_PP, pk.Move2_PP, pk.Move3_PP, pk.Move4_PP }, ppups = new[] { pk.Move1_PPUps, pk.Move2_PPUps, pk.Move3_PPUps, pk.Move4_PPUps },
        ivs, evs, friendship = pk.CurrentFriendship, isEgg = pk.IsEgg, lang = pk.Language, version = (int)pk.Version, metLevel = pk.MetLevel, metLoc = pk.MetLocation,
        stats = new[] { pk.Stat_HPMax, pk.Stat_ATK, pk.Stat_DEF, pk.Stat_SPA, pk.Stat_SPD, pk.Stat_SPE },
        checksumOk = pk.ChecksumValid, valid = la.Valid,
        problems = Problems(la)
    };
}

var cmd = args.Length > 0 ? args[0] : "";
var jo = new JsonSerializerOptions { WriteIndented = false };
if (cmd == "dump")
{
    var sav = SaveUtil.GetSaveFile(args[1]);
    if (sav == null) { Console.WriteLine("{\"error\":\"unbekannt\"}"); return 1; }
    var list = new List<object>();
    for (int i = 0; i < sav.PartyCount; i++) list.Add(Mon(sav.GetPartySlotAtIndex(i), "p" + i));
    for (int b = 0; b < sav.BoxCount; b++) for (int s = 0; s < sav.BoxSlotCount; s++)
    { var pk = sav.GetBoxSlotAtIndex(b, s); if (pk.Species != 0) list.Add(Mon(pk, b + ":" + s)); }
    var res = new { game = sav.Version.ToString(), gen = sav.Generation, ot = sav.OT, tid = sav.TID16, sid = sav.SID16, money = sav.Money,
        checksumsValid = sav.ChecksumsValid, checksumInfo = sav.ChecksumInfo, partyCount = sav.PartyCount, boxCount = sav.BoxCount, mons = list };
    Console.WriteLine(JsonSerializer.Serialize(res, jo));
    return 0;
}
if (cmd == "blank" || cmd == "fill" || cmd == "fillinto")
{
    // fillinto <vorhandener Spielstand> <out> <n>: füllt einen echten/initialisierten Spielstand
    SaveFile sav = cmd == "fillinto" ? SaveUtil.GetSaveFile(args[1]) : BlankSaveFile.Get(Enum.Parse<GameVersion>(args[1]), "RATTATA", LanguageID.English);
    if (sav is SAV4HGSS && sav.Version == GameVersion.Any) sav.Version = GameVersion.HG;
    var ver = sav.Version switch { GameVersion.RS => GameVersion.R, GameVersion.FRLG => GameVersion.FR, GameVersion.DP => GameVersion.D, GameVersion.HGSS => GameVersion.HG, GameVersion.BW => GameVersion.B, GameVersion.B2W2 => GameVersion.B2, _ => sav.Version };
    int n = args.Length > 3 ? int.Parse(args[3]) : 0;
    if (cmd != "blank")
    {
        var rnd = new Random(1234); int placed = 0, tries = 0;
        var tr = new SimpleTrainerInfo(ver) { OT = "RATTATA", TID16 = 12345, SID16 = 54321, Language = 2, Context = sav.Context };
        while (placed < n && tries++ < n * 40)
        {
            ushort sp = (ushort)rnd.Next(1, sav.MaxSpeciesID + 1);
            if (!sav.Personal.IsSpeciesInGame(sp)) continue;
            var blank = EntityBlank.GetBlank(sav);
            blank.Species = sp;
            var enc = EncounterMovesetGenerator.GenerateEncounters(blank, tr, ReadOnlyMemory<ushort>.Empty, ver).FirstOrDefault();
            if (enc == null) continue;
            var pk = enc.ConvertToPKM(tr);
            var conv = EntityConverter.ConvertToType(pk, sav.PKMType, out _);
            if (conv == null || !new LegalityAnalysis(conv).Valid) continue;
            if (placed < 6) sav.SetPartySlotAtIndex(conv, placed); else sav.SetBoxSlotAtIndex(conv, (placed - 6) / sav.BoxSlotCount, (placed - 6) % sav.BoxSlotCount);
            placed++;
        }
        Console.Error.WriteLine("platziert " + placed);
    }
    var bytes = sav.Write().ToArray();
    // leere 3DS-Spielstände haben keinen BEEF-Fußteil; damit Spiel/PKHeX/Rattata Labs sie erkennen, Magic setzen und Prüfsummen neu schreiben
    if (sav.Generation >= 6 && bytes.Length > 0x1F0 && BitConverter.ToUInt32(bytes, bytes.Length - 0x1F0) != 0x42454546)
    {
        BitConverter.GetBytes(0x42454546u).CopyTo(bytes, bytes.Length - 0x1F0);
        var again = SaveUtil.GetSaveFile(bytes);
        if (again != null) bytes = again.Write().ToArray();
    }
    File.WriteAllBytes(args[2], bytes);
    return 0;
}
Console.WriteLine("dump <sav> | blank <version> <out> | fill <version> <out> <n>");
return 2;
static string[] Problems(LegalityAnalysis la)
{
    var ctx = LegalityLocalizationContext.Create(la, "en");
    var list = new List<string>();
    foreach (var r in la.Results) if (!r.Valid) list.Add(r.Identifier + ": " + ctx.Humanize(r));
    return list.ToArray();
}
