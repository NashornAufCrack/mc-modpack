#!/usr/bin/env python3
"""
Tiefen-Abhängigkeitsprüfung direkt aus den JAR-Dateien:
Liest 'fabric.mod.json' aus jeder Mod-JAR aus, extrahiert 'depends', 'breaks'
und 'recommends' und gleicht diese mit dem Katalog ab.
Ergebnis wird in data/jar-inspection.json gespeichert und verhindert
Abstürze durch Mixin-Kollisionen und inkompatible Versionen.
"""

import json
import os
import sys
import zipfile
import io
import urllib.request
from pathlib import Path

# Sofortiges Flushen der Ausgaben
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(line_buffering=True)

REPO_DIR = Path(__file__).resolve().parent.parent
FILES_PATH = REPO_DIR / "data" / "files.json"
CACHE_PATH = REPO_DIR / "data" / "jar-inspection.json"

if not FILES_PATH.exists():
    print("data/files.json nicht gefunden.")
    sys.exit(1)

with open(FILES_PATH, "r", encoding="utf-8") as f:
    files = json.load(f)

cache = {}
if CACHE_PATH.exists():
    try:
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            cache = json.load(f)
    except Exception:
        cache = {}

print(f"=== JAR-Inspektion (fabric.mod.json) ===")
print(f"Prüfe {len(files)} Dateien... ({len(cache)} bereits im Cache)")

mods_to_inspect = []
for slug, f in files.items():
    typ = f[8] if len(f) > 8 else "m"
    url = f[0]
    sha1 = f[2]
    if typ == "m" and url.endswith(".jar"):
        if slug not in cache or cache[slug].get("sha1") != sha1:
            mods_to_inspect.append((slug, f))

print(f"Neu zu analysierende JARs: {len(mods_to_inspect)}")

inspected = 0
errors = 0

def save_cache():
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

for slug, f in mods_to_inspect:
    url = f[0]
    sha1 = f[2]
    ver = f[6]
    title = f[7] or slug

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "mc-modpack-jar-inspector"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = resp.read()

        zf = zipfile.ZipFile(io.BytesIO(data))
        fmj_content = None

        if "fabric.mod.json" in zf.namelist():
            raw_text = zf.read("fabric.mod.json").decode("utf-8-sig", errors="ignore")
            fmj_content = json.loads(raw_text, strict=False)

        if fmj_content:
            mod_id = fmj_content.get("id")
            depends = fmj_content.get("depends", {})
            breaks = fmj_content.get("breaks", {})
            recommends = fmj_content.get("recommends", {})
            suggests = fmj_content.get("suggests", {})
            conflicts = fmj_content.get("conflicts", {})

            cache[slug] = {
                "sha1": sha1,
                "version": ver,
                "mod_id": mod_id,
                "depends": depends,
                "breaks": breaks,
                "recommends": recommends,
                "suggests": suggests,
                "conflicts": conflicts
            }
        else:
            cache[slug] = {
                "sha1": sha1,
                "version": ver,
                "mod_id": None,
                "note": "Keine fabric.mod.json gefunden"
            }

        inspected += 1
        if inspected % 10 == 0:
            save_cache()
            print(f"  [{inspected}/{len(mods_to_inspect)}] Gespeichert ({slug})...")

    except Exception as e:
        errors += 1
        print(f"  [Fehler] {slug}: {e}")

save_cache()
print(f"\nJAR-Inspektion abgeschlossen!")
print(f"- Neu analysiert: {inspected}")
print(f"- Fehler: {errors}")
print(f"- Gesamtergebnisse im Cache: {len(cache)}")
