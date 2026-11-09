#!/usr/bin/env python3
"""
Stellt die besten neuen Kandidaten aus data/candidates.json vor.
Filtert nach Popularität/Hype und schließt Duplikate (z.B. Mod bereits vorhanden,
oder Versuch, dieselbe Mod als Datapack hinzuzufügen) strikt aus.
"""

import json
from pathlib import Path

REPO_DIR = Path(__file__).resolve().parent.parent
CANDIDATES_PATH = REPO_DIR / "data" / "candidates.json"
APP_PATH = REPO_DIR / "data" / "app-data.json"

if not CANDIDATES_PATH.exists() or not APP_PATH.exists():
    print("Fehler: candidates.json oder app-data.json fehlt.")
    exit(1)

with open(APP_PATH, "r", encoding="utf-8") as f:
    app_data = json.load(f)

existing_slugs = {m["slug"] for m in app_data["mods"]}
existing_names = {m["name"].lower().strip() for m in app_data["mods"]}

with open(CANDIDATES_PATH, "r", encoding="utf-8") as f:
    cand_data = json.load(f)

mr_list = cand_data.get("modrinth", [])

# Sammle alle Mod-Kandidaten, um Datapack-Doppelungen auszuschließen
mod_candidate_names = {c["name"].lower().strip() for c in mr_list if c.get("pt") == "mod"}
mod_candidate_slugs = {c["slug"] for c in mr_list if c.get("pt") == "mod"}

clean_mr = []
seen_slugs = set()

for c in mr_list:
    slug = c["slug"]
    name = c["name"].lower().strip()
    pt = c.get("pt", "mod")

    # Bereits im Katalog?
    if slug in existing_slugs or name in existing_names or slug in seen_slugs:
        continue

    # Niemals dieselbe Mod zusätzlich als Datapack vorschlagen!
    if pt == "datapack":
        if name in existing_names or slug in existing_slugs:
            continue
        if name in mod_candidate_names or slug in mod_candidate_slugs:
            continue

    # Nur Fabric-kompatible Inhalte bei Mods
    cats = c.get("cats", [])
    if pt == "mod" and "fabric" not in cats:
        continue

    seen_slugs.add(slug)
    clean_mr.append(c)

clean_mr.sort(key=lambda x: (x.get("follows", 0) * 10 + x.get("dl", 0)), reverse=True)

print(f"=== TOP KANDIDATEN (Neu & Gehypt) ===")
print(f"Gefundene saubere Kandidaten: {len(clean_mr)}\n")

for i, c in enumerate(clean_mr[:10], 1):
    pt_name = "Shader" if c.get("pt") in ("s", "shader") else "Resource Pack" if c.get("pt") in ("r", "resourcepack") else "Datapack" if c.get("pt") in ("d", "datapack") else "Mod"
    dl_fmt = f"{c.get('dl', 0):,}".replace(",", ".")
    print(f"{i}. [{pt_name}] {c['name']} (Slug: {c['slug']})")
    print(f"   Downloads: {dl_fmt} · Follows: {c.get('follows', 0)}")
    print(f"   Beschreibung: {c.get('desc', 'Keine Beschreibung')}")
    print(f"   Modrinth: https://modrinth.com/{c.get('pt', 'mod')}/{c['slug']}")
    print(f"   -> Zum Hinzufügen: 'Ja, füge {c['slug']} hinzu'\n")
