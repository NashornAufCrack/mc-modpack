#!/usr/bin/env python3
"""
scripts/prepare_headless_run.py
Staging-Skript für den Headless-Runtime- und Stresstest.
Lädt Mods und Resource Packs herunter, erzeugt options.txt,
packed_packs.folderpack.json und injiziert das Stress-Test-Datapack.
"""
import sys
import os
import json
import urllib.request
import hashlib
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
RUN_DIR = BASE_DIR / "run"

# Mods, die auf Headless-Cloud-Servern ohne physische Grafikkarte (Vulkan/Mesh-Shader)
# übersprungen werden müssen (werden lokal auf der RTX 3080 getestet)
GPU_EXCLUSIVE = {"voxy", "voxy-server-side"}

def load_data():
    with open(DATA_DIR / "files.json", "r", encoding="utf-8") as f:
        files = json.load(f)
    with open(DATA_DIR / "mods.json", "r", encoding="utf-8") as f:
        mods_list = json.load(f)
    mods_by_slug = {m["slug"]: m for m in mods_list}
    return files, mods_by_slug

def sanitize_filename(name: str) -> str:
    import re
    # Entfernt §-Farbcodes und Nicht-ASCII
    clean = re.sub(r'§[0-9a-fk-or]', '', name, flags=re.IGNORECASE)
    clean = re.sub(r'[^\x20-\x7E]', '', clean)
    clean = clean.replace('\\', '_').replace('/', '_').replace(':', '_').replace('*', '_')
    clean = clean.replace('?', '_').replace('"', '_').replace('<', '_').replace('>', '_').replace('|', '_')
    return clean.strip() or "unnamed_pack.zip"

def download_file(url: str, dest: Path, expected_sha1: str = None) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and expected_sha1:
        with open(dest, "rb") as f:
            if hashlib.sha1(f.read()).hexdigest() == expected_sha1:
                return True # Bereits aktuell im Cache
    encoded_url = url.replace(" ", "%20")
    print(f"  📥 Lade herunter: {dest.name} ...")
    try:
        req = urllib.request.Request(
            encoded_url,
            headers={"User-Agent": "NashornAufCrack-Modpack-CI/1.0"}
        )
        with urllib.request.urlopen(req, timeout=30) as resp, open(dest, "wb") as out_file:
            out_file.write(resp.read())
        return True
    except Exception as e:
        print(f"  ❌ FEHLER beim Download von {dest.name}: {e}")
        return False

def resolve_dependencies(selected_slugs: list[str], files: dict) -> list[str]:
    """Sammelt alle transitiven Abhängigkeiten aus files[slug][5] rekursiv ein."""
    resolved = set()
    queue = list(selected_slugs)
    while queue:
        slug = queue.pop(0)
        if slug in resolved or slug not in files:
            continue
        resolved.add(slug)
        entry = files[slug]
        deps = entry[5] if len(entry) > 5 and isinstance(entry[5], list) else []
        for d in deps:
            if d not in resolved and d in files:
                queue.append(d)
    return list(resolved)

def setup_stress_test_datapack(world_dir: Path):
    """Erzeugt das In-Game Stresstest-Datapack in der Testwelt."""
    dp_dir = world_dir / "datapacks" / "modpack_stress_test"
    dp_dir.mkdir(parents=True, exist_ok=True)

    mcmeta = {
        "pack": {
            "pack_format": 55,
            "description": "Headless Client Stress Test Datapack"
        }
    }
    with open(dp_dir / "pack.mcmeta", "w", encoding="utf-8") as f:
        json.dump(mcmeta, f, indent=2)

    func_dir = dp_dir / "data" / "modpack_stress" / "function"
    func_dir.mkdir(parents=True, exist_ok=True)

    # load.mcfunction: Gamerules & Scoreboard initialisieren
    load_mc = """# Initialisierung des Stress-Tests
gamerule doDaylightCycle false
gamerule doWeatherCycle false
gamerule doMobSpawning false
gamerule commandBlockOutput false
scoreboard objectives add stress_timer dummy
scoreboard players set @a stress_timer 0
gamemode creative @a
say [Stress-Test] Welt betreten - Starte Chunk-, Entity- und 3D-Model-Test!
"""
    with open(func_dir / "load.mcfunction", "w", encoding="utf-8") as f:
        f.write(load_mc)

    # tick.mcfunction: Chunk-Teleports, Mob-Spawns, 3D-Items
    tick_mc = """# Stress-Test Tick-Steuerung
scoreboard players add @a stress_timer 1

# Sekunde 1 (Tick 20): Erster Teleport (Chunk-Laden forcieren)
execute as @a[scores={stress_timer=20}] at @s run tp @s ~35 90 ~35

# Sekunde 3 (Tick 60): Entity-Modelle & Fresh Animations prüfen
execute as @a[scores={stress_timer=60}] at @s run summon zombie ~2 ~ ~2
execute as @a[scores={stress_timer=60}] at @s run summon skeleton ~-2 ~ ~2
execute as @a[scores={stress_timer=60}] at @s run summon pig ~2 ~ ~-2
execute as @a[scores={stress_timer=60}] at @s run summon villager ~-2 ~ ~-2

# Sekunde 6 (Tick 120): Zweiter Teleport in neues Chunk-Gebiet
execute as @a[scores={stress_timer=120}] at @s run tp @s ~-60 85 ~60

# Sekunde 8 (Tick 160): 3D-Items in Haupthand & Nebenhand geben
execute as @a[scores={stress_timer=160}] at @s run item replace entity @s weapon.mainhand with minecraft:diamond_sword
execute as @a[scores={stress_timer=160}] at @s run item replace entity @s weapon.offhand with minecraft:shield

# Sekunde 11 (Tick 220): 3D-Bogen und Feuerzeug (Hyper-Punchy / 3D-Items)
execute as @a[scores={stress_timer=220}] at @s run item replace entity @s weapon.mainhand with minecraft:bow
execute as @a[scores={stress_timer=240}] at @s run item replace entity @s weapon.mainhand with minecraft:flint_and_steel

# Sekunde 15 (Tick 300): Dritter Teleport
execute as @a[scores={stress_timer=300}] at @s run tp @s ~70 80 ~-70

# Sekunde 20 (Tick 400): Erfolgreich abgeschlossen!
execute as @a[scores={stress_timer=400}] at @s run say [Stress-Test] ERFOLG! Alle Chunks, Animationen und 3D-Modelle ohne Crash geladen!
"""
    with open(func_dir / "tick.mcfunction", "w", encoding="utf-8") as f:
        f.write(tick_mc)

    # Tags registrieren
    tags_dir = dp_dir / "data" / "minecraft" / "tags" / "function"
    tags_dir.mkdir(parents=True, exist_ok=True)
    with open(tags_dir / "load.json", "w", encoding="utf-8") as f:
        json.dump({"values": ["modpack_stress:load"]}, f, indent=2)
    with open(tags_dir / "tick.json", "w", encoding="utf-8") as f:
        json.dump({"values": ["modpack_stress:tick"]}, f, indent=2)

    print("  ✅ Stress-Test-Datapack erfolgreich generiert.")

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Bereitet Headless-Run vor.")
    parser.add_argument("--preset", choices=["perf", "visual", "plus"], default=None, help="Preset-Name")
    parser.add_argument("--mods", type=str, default="", help="Kommagetrennte Liste oder JSON-Array von Mod-Slugs")
    parser.add_argument("--resourcepacks", type=str, default="", help="Kommagetrennte Liste oder JSON-Array von Resource-Pack-Slugs")
    args = parser.parse_args()

    files, mods_by_slug = load_data()

    selected_mods = []
    selected_rps = []

    if args.preset:
        print(f"📦 Verwende Standard-Preset: {args.preset}")
        # Aus mods.json Presets ermitteln
        with open(DATA_DIR / "mods.json", "r", encoding="utf-8") as f:
            all_mods = json.load(f)
        for m in all_mods:
            s = m["slug"]
            pt = m.get("pt", "m")
            cat = m.get("cat", "P")
            rolle = m.get("rolle", "")
            pflicht = m.get("pflicht", False)

            if pt == "m":
                if cat == "P" or pflicht or rolle == "K":
                    selected_mods.append(s)
                elif args.preset in ("visual", "plus") and cat in ("V", "B"):
                    selected_mods.append(s)
                elif args.preset == "plus":
                    selected_mods.append(s)
            elif pt == "r" and args.preset in ("visual", "plus"):
                selected_rps.append(s)
    else:
        # Benutzerdefinierte Liste
        if args.mods:
            try:
                selected_mods = json.loads(args.mods)
            except Exception:
                selected_mods = [s.strip() for s in args.mods.split(",") if s.strip()]
        if args.resourcepacks:
            try:
                selected_rps = json.loads(args.resourcepacks)
            except Exception:
                selected_rps = [s.strip() for s in args.resourcepacks.split(",") if s.strip()]

    # Zwingend packed-packs mitnehmen
    if "packed-packs" not in selected_mods and "packed-packs" in files:
        selected_mods.append("packed-packs")

    # Transitive Abhängigkeiten rekursiv auflösen
    all_mod_slugs = resolve_dependencies(selected_mods, files)
    print(f"🔍 Aufgelöste Mods ({len(all_mod_slugs)} Stück inkl. transitive Libraries)")
    print(f"🎨 Ausgewählte Resource Packs ({len(selected_rps)} Stück)")

    # 1. Mods herunterladen
    mods_run_dir = RUN_DIR / "mods"
    mods_run_dir.mkdir(parents=True, exist_ok=True)

    for slug in all_mod_slugs:
        if slug in GPU_EXCLUSIVE:
            print(f"  ⏭️ Überspringe GPU-exklusiven Mod im Headless-Runner: {slug}")
            continue
        entry = files.get(slug)
        if not entry:
            print(f"  ⚠️ Warnung: Slug '{slug}' nicht in files.json gefunden!")
            continue
        url, raw_fname, _, sha1 = entry[0], entry[1], entry[2], entry[3]
        if not raw_fname.endswith(".jar"):
            continue
        safe_fname = sanitize_filename(raw_fname)
        dest = mods_run_dir / safe_fname
        download_file(url, dest, sha1)

    # 2. Resource Packs herunterladen
    rp_folder = RUN_DIR / "resourcepacks" / "Modpack"
    rp_folder.mkdir(parents=True, exist_ok=True)

    rp_filenames = []
    for slug in selected_rps:
        entry = files.get(slug)
        if not entry:
            continue
        url, raw_fname, _, sha1 = entry[0], entry[1], entry[2], entry[3]
        safe_fname = sanitize_filename(raw_fname)
        dest = rp_folder / safe_fname
        if download_file(url, dest, sha1):
            rp_filenames.append(safe_fname)

    # 3. packed_packs.folderpack.json anlegen
    folderpack_json = {
        "module": True,
        "packIds": [f"file/Modpack/{fname}" for fname in rp_filenames]
    }
    with open(rp_folder / "packed_packs.folderpack.json", "w", encoding="utf-8") as f:
        json.dump(folderpack_json, f, indent=2)
    print("  ✅ packed_packs.folderpack.json erstellt.")

    # 4. options.txt schreiben
    # In Minecraft options.txt werden Resource Packs in umgekehrter Reihenfolge notiert
    rp_options_order = ["vanilla"] + [f"file/Modpack/{fn}" for fn in reversed(rp_filenames)]
    options_lines = [
        "renderDistance:10",
        "simulationDistance:8",
        "maxFps:60",
        "enableVsync:false",
        "mipmapLevels:4",
        "biomeBlendRadius:2",
        f"resourcePacks:{json.dumps(rp_options_order)}"
    ]
    with open(RUN_DIR / "options.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(options_lines) + "\n")
    print("  ✅ run/options.txt erstellt.")

    # 5. Stresstest-Datapack in Saves injizieren
    setup_stress_test_datapack(RUN_DIR / "saves" / "test_world")

    print("\n🚀 Headless-Vorbereitung erfolgreich abgeschlossen!")

if __name__ == "__main__":
    main()
