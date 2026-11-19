#!/usr/bin/env python3
"""
Tiefen-Abhängigkeitsprüfung direkt aus den JAR-Dateien:
Liest 'fabric.mod.json' (inkl. verschachtelter JiJ-'jars') aus jeder Mod-JAR aus,
extrahiert 'depends', 'breaks', 'recommends', 'suggests' und 'conflicts' und
gleicht diese mit dem Katalog und der Ziel-Minecraft-Version ab.
Ergebnis wird in data/jar-inspection.json gespeichert und verhindert
Abstürze durch Mixin-Kollisionen und inkompatible Versionen.
"""

import io
import json
import os
import sys
import urllib.request
import zipfile
from pathlib import Path

# Sofortiges Flushen der Ausgaben
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)

REPO_DIR = Path(__file__).resolve().parent.parent
if str(REPO_DIR) not in sys.path:
    sys.path.insert(0, str(REPO_DIR))

from scripts.fabric_semver import matches_predicate

FILES_PATH = REPO_DIR / "data" / "files.json"
CACHE_PATH = REPO_DIR / "data" / "jar-inspection.json"
PROJ_PATH = REPO_DIR / "config" / "project.json"

with open(PROJ_PATH, "r", encoding="utf-8") as _pf:
    MC_VERSION = json.load(_pf)["minecraftVersion"]


def inspect_jar_bytes(data: bytes, sha1: str, ver: str, mc_version: str = MC_VERSION) -> dict:
    """Liest fabric.mod.json sowie verschachtelte JiJ-JARs ('jars') aus einem JAR-Byte-Stream."""
    zf = zipfile.ZipFile(io.BytesIO(data))
    fmj_content = None
    namelist = set(zf.namelist())

    if "fabric.mod.json" in namelist:
        raw_text = zf.read("fabric.mod.json").decode("utf-8-sig", errors="ignore")
        fmj_content = json.loads(raw_text, strict=False)

    if not fmj_content:
        return {
            "sha1": sha1,
            "version": ver,
            "mod_id": None,
            "note": "Keine fabric.mod.json gefunden",
        }

    mod_id = fmj_content.get("id")
    depends = dict(fmj_content.get("depends") or {})
    breaks = dict(fmj_content.get("breaks") or {})
    recommends = dict(fmj_content.get("recommends") or {})
    suggests = dict(fmj_content.get("suggests") or {})
    conflicts = dict(fmj_content.get("conflicts") or {})
    broken_jij = None

    for j in fmj_content.get("jars") or []:
        nested_file = j.get("file") if isinstance(j, dict) else None
        if not nested_file or nested_file not in namelist:
            continue
        try:
            with zipfile.ZipFile(io.BytesIO(zf.read(nested_file))) as nzf:
                if "fabric.mod.json" in nzf.namelist():
                    nested_raw = nzf.read("fabric.mod.json").decode("utf-8-sig", errors="ignore")
                    nested_fmj = json.loads(nested_raw, strict=False)
                    nested_deps = nested_fmj.get("depends") or {}
                    nested_mc = nested_deps.get("minecraft") if isinstance(nested_deps, dict) else None
                    if nested_mc and not matches_predicate(mc_version, nested_mc):
                        depends["minecraft"] = nested_mc
                        broken_jij = nested_file
                        break
        except Exception:
            continue

    entry = {
        "sha1": sha1,
        "version": ver,
        "jar_version": fmj_content.get("version"),
        "mod_id": mod_id,
        "depends": depends,
        "breaks": breaks,
        "recommends": recommends,
        "suggests": suggests,
        "conflicts": conflicts,
    }
    if broken_jij:
        entry["broken_jij"] = broken_jij
    return entry


def run_inspection(files=None, cache=None, save=True, mc_version: str = MC_VERSION, fetcher=None):
    if files is None:
        if not FILES_PATH.exists():
            print("data/files.json nicht gefunden.")
            sys.exit(1)
        with open(FILES_PATH, "r", encoding="utf-8") as f:
            files = json.load(f)

    if cache is None:
        cache = {}
        if CACHE_PATH.exists():
            try:
                with open(CACHE_PATH, "r", encoding="utf-8") as f:
                    cache = json.load(f)
            except Exception:
                cache = {}

    print("=== JAR-Inspektion (fabric.mod.json) ===")
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
        if save:
            with open(CACHE_PATH, "w", encoding="utf-8") as f:
                json.dump(cache, f, ensure_ascii=False, indent=2)

    for slug, f in mods_to_inspect:
        url = f[0]
        sha1 = f[2]
        ver = f[6]

        try:
            if fetcher is not None:
                data = fetcher(url, slug)
            else:
                req = urllib.request.Request(url, headers={"User-Agent": "mc-modpack-jar-inspector"})
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = resp.read()

            cache[slug] = inspect_jar_bytes(data, sha1, ver, mc_version=mc_version)
            inspected += 1
            if inspected % 10 == 0:
                save_cache()
                print(f"  [{inspected}/{len(mods_to_inspect)}] Gespeichert ({slug})...")

        except Exception as e:
            errors += 1
            print(f"  [Fehler] {slug}: {e}")

    save_cache()
    print("\nJAR-Inspektion abgeschlossen!")
    print(f"- Neu analysiert: {inspected}")
    print(f"- Fehler: {errors}")
    print(f"- Gesamtergebnisse im Cache: {len(cache)}")
    return cache


if __name__ == "__main__":
    run_inspection()
