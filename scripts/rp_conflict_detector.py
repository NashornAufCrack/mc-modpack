#!/usr/bin/env python3
"""
Resource Pack Konflikt- und Kollisions-Detektor
Analysiert Resource Packs auf:
1. Datei- und Asset-Kollisionen (welche Packs überschreiben dieselben Texturen/Modelle/Shaders)
2. Veraltete Core-Shader & GUI-Breakage (z. B. Immersive Interfaces)
3. Pack-Format-Inkompatibilitäten (gegenüber 26.3 / Format 97.1)
4. Reihenfolge-Analyse (welches Pack gewinnt bei Kollision in options.txt / packed_packs)
"""

import sys, os, io, re, json, zipfile, argparse, collections
from pathlib import Path

FMT_CURRENT = 97.1

def inspect_pack(zip_path: Path):
    res = {
        "filename": zip_path.name,
        "size": zip_path.stat().st_size,
        "format": None,
        "supported_formats": None,
        "is_outdated_26_3": False,
        "has_core_shaders": False,
        "core_shaders": [],
        "gui_files": [],
        "models": [],
        "blockstates": [],
        "textures": [],
        "all_files": {}, # path -> (size, crc32)
    }

    try:
        with zipfile.ZipFile(zip_path, "r") as z:
            # 1. pack.mcmeta analysieren
            meta_name = next((n for n in z.namelist() if n.lower().endswith("pack.mcmeta") and n.count("/") <= 1), None)
            if meta_name:
                try:
                    raw = re.sub(r"^\ufeff", "", z.read(meta_name).decode("utf-8", "replace"))
                    m = json.loads(raw)
                    p = m.get("pack", {})
                    fmt = p.get("pack_format")
                    sf = p.get("supported_formats")
                    res["format"] = fmt
                    res["supported_formats"] = sf

                    # Formate ermitteln
                    hi = fmt if isinstance(fmt, (int, float)) else 0
                    if isinstance(sf, list) and len(sf) == 2:
                        hi = max(hi, sf[1])
                    elif isinstance(sf, dict):
                        hi = max(hi, sf.get("max_inclusive", 0))
                    for ov in m.get("overlays", {}).get("entries", []):
                        osf = ov.get("formats", ov.get("pack", {}).get("supported_formats"))
                        if isinstance(osf, list) and len(osf) == 2:
                            hi = max(hi, osf[1])

                    # 26.3 braucht Format 97.1
                    if hi < 97:
                        res["is_outdated_26_3"] = True
                except Exception as e:
                    res["mcmeta_error"] = str(e)

            # 2. Dateibaum scannen
            for info in z.infolist():
                if info.is_dir():
                    continue
                name = info.filename.replace("\\", "/").lower()
                if "pack.mcmeta" in name or "pack.png" in name or "__macosx" in name or ".ds_store" in name:
                    continue

                res["all_files"][name] = (info.file_size, info.CRC)

                if "shaders/core/" in name or "shaders/include/" in name:
                    res["has_core_shaders"] = True
                    res["core_shaders"].append(name)
                elif "textures/gui/" in name or "optifine/gui/" in name or "textures/gui/sprites/" in name:
                    res["gui_files"].append(name)
                elif "models/" in name:
                    res["models"].append(name)
                elif "blockstates/" in name:
                    res["blockstates"].append(name)
                elif "textures/" in name:
                    res["textures"].append(name)

    except Exception as e:
        res["error"] = str(e)

    return res


def analyze_directory(rp_dir: Path, options_txt: Path = None, folderpack_json: Path = None):
    zips = sorted([p for p in rp_dir.glob("*.zip") if p.is_file()])
    if not zips:
        # Check subfolders (z. B. Modpack/)
        modpack_sub = rp_dir / "Modpack"
        if modpack_sub.is_dir():
            zips = sorted([p for p in modpack_sub.glob("*.zip") if p.is_file()])

    print(f"📦 Scanne {len(zips)} Resource Packs in: {rp_dir}")

    packs_data = {}
    file_registry = collections.defaultdict(list) # file -> list of (pack_fn, size, crc)

    for zp in zips:
        data = inspect_pack(zp)
        packs_data[zp.name] = data
        for fpath, (sz, crc) in data["all_files"].items():
            file_registry[fpath].append((zp.name, sz, crc))

    # Kollisionen filtern (nur wenn mindestens 2 Packs dieselbe Datei beinhalten)
    collisions = {f: lst for f, lst in file_registry.items() if len(lst) > 1}

    # Nur echte Konflikte (unterschiedliche Prüfsumme)
    differing_collisions = {}
    for f, lst in collisions.items():
        crcs = set(x[2] for x in lst)
        if len(crcs) > 1:
            differing_collisions[f] = lst

    # Kategorisieren
    shader_conflicts = {f: lst for f, lst in differing_collisions.items() if "shader" in f}
    gui_conflicts = {f: lst for f, lst in differing_collisions.items() if "gui" in f}
    model_conflicts = {f: lst for f, lst in differing_collisions.items() if "model" in f or "blockstate" in f}
    texture_conflicts = {f: lst for f, lst in differing_collisions.items() if "textures" in f and "gui" not in f}

    # Paar-Kollisionsmatrix: packA vs packB -> Anzahl kollidierender Dateien
    pair_collisions = collections.defaultdict(lambda: collections.defaultdict(int))
    pair_details = collections.defaultdict(lambda: collections.defaultdict(list))

    for f, lst in differing_collisions.items():
        pack_names = [x[0] for x in lst]
        for i in range(len(pack_names)):
            for j in range(i + 1, len(pack_names)):
                p1, p2 = sorted([pack_names[i], pack_names[j]])
                pair_collisions[p1][p2] += 1
                if len(pair_details[p1][p2]) < 8:
                    pair_details[p1][p2].append(f)

    # 4. Aktive Lade-Reihenfolge auslesen
    load_order = []
    if options_txt and options_txt.is_file():
        try:
            content = options_txt.read_text(encoding="utf-8", errors="ignore")
            for line in content.splitlines():
                if line.startswith("resourcePacks:"):
                    raw = line.split(":", 1)[1].strip()
                    arr = json.loads(raw)
                    # In options.txt: Letztes Element hat HÖCHSTE Priorität!
                    load_order = [os.path.basename(x.replace("file/", "").replace("Modpack/", "")) for x in reversed(arr)]
                    break
        except Exception:
            pass

    return {
        "total_packs": len(zips),
        "total_collisions": len(differing_collisions),
        "shader_conflicts_count": len(shader_conflicts),
        "gui_conflicts_count": len(gui_conflicts),
        "model_conflicts_count": len(model_conflicts),
        "texture_conflicts_count": len(texture_conflicts),
        "packs": packs_data,
        "shader_conflicts": shader_conflicts,
        "gui_conflicts": gui_conflicts,
        "model_conflicts": model_conflicts,
        "texture_conflicts": texture_conflicts,
        "pair_collisions": {p1: dict(p2s) for p1, p2s in pair_collisions.items()},
        "pair_details": {p1: dict(p2s) for p1, p2s in pair_details.items()},
        "load_order": load_order,
    }


def print_report(res):
    print("\n" + "=" * 65)
    print("🔍 RESOURCE PACK PRÜFBERICHT (26.3)")
    print("=" * 65)
    print(f"Anzahl geprüfter Packs:           {res['total_packs']}")
    print(f"Dateikollisionen (verschieden):   {res['total_collisions']}")
    print(f" - Shader-Kollisionen (Kritisch): {res['shader_conflicts_count']}")
    print(f" - GUI-Kollisionen (Kritisch):    {res['gui_conflicts_count']}")
    print(f" - Modell/Blockstate-Kollisionen: {res['model_conflicts_count']}")
    print(f" - Textur-Überdeckungen:          {res['texture_conflicts_count']}")
    print("-" * 65)

    # Veraltete Packs
    outdated = [fn for fn, d in res["packs"].items() if d["is_outdated_26_3"]]
    if outdated:
        print("\n⚠️ VERALTETE PACKS (nicht für 26.3 / Format 97 ausgelegt):")
        for fn in outdated:
            p = res["packs"][fn]
            print(f"  • {fn} (Format {p['format']}, supported: {p['supported_formats']})")

    # Packs mit Core-Shadern
    shaders = [fn for fn, d in res["packs"].items() if d["has_core_shaders"]]
    if shaders:
        print("\n⚡ PACKS MIT CORE-SHADERN (können UI / Rendern bei 26.3 brechen):")
        for fn in shaders:
            p = res["packs"][fn]
            print(f"  • {fn} ({len(p['core_shaders'])} Shader-Dateien, z.B. {p['core_shaders'][:2]})")

    # Stärkste Überschneidungs-Paare
    pairs = []
    for p1, p2s in res["pair_collisions"].items():
        for p2, count in p2s.items():
            pairs.append((count, p1, p2))
    pairs.sort(reverse=True)

    if pairs:
        print("\n💥 TOP-KOLLISIONEN ZWISCHEN ZWEI PACKS:")
        for count, p1, p2 in pairs[:10]:
            print(f"  [{count} Dateien] {p1}  ⚔️  {p2}")
            samples = res["pair_details"].get(p1, {}).get(p2, [])
            for s in samples[:3]:
                print(f"     ↳ {s}")

    print("\n" + "=" * 65)


def main():
    parser = argparse.ArgumentParser(description="Resource Pack Conflict Detector")
    parser.add_argument("--profile", type=str, help="Pfad zum Modrinth/Minecraft Profil-Ordner")
    parser.add_argument("--dir", type=str, help="Pfad zum resourcepacks-Ordner")
    parser.add_argument("--json", type=str, help="Ausgabe als JSON-Datei speichern")
    args = parser.parse_args()

    rp_dir = None
    opt_file = None

    if args.profile:
        prof = Path(args.profile)
        rp_dir = prof / "resourcepacks"
        opt_file = prof / "options.txt"
    elif args.dir:
        rp_dir = Path(args.dir)
    else:
        # Default fallback
        rp_dir = Path("run/resourcepacks")
        if not rp_dir.exists():
            rp_dir = Path("resourcepacks")

    if not rp_dir or not rp_dir.exists():
        print(f"❌ Ordner existiert nicht: {rp_dir}")
        sys.exit(1)

    result = analyze_directory(rp_dir, options_txt=opt_file)
    print_report(result)

    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
        print(f"💾 Bericht gespeichert: {args.json}")

if __name__ == "__main__":
    main()
