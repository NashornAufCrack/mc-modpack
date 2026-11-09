#!/usr/bin/env python3
"""
Stellt die besten neuen Kandidaten aus data/candidates.json und data/social-hype.json vor.
Filtert nach Popularität/Hype und schließt Duplikate (z.B. Mod bereits vorhanden,
oder Versuch, dieselbe Mod als Datapack hinzuzufügen) strikt aus.
Kategorisiert übersichtlich in Gameplay, Resource Packs, Shader, Datapacks & Social-Hypes.
"""

import json
import re
from pathlib import Path

REPO_DIR = Path(__file__).resolve().parent.parent
CANDIDATES_PATH = REPO_DIR / "data" / "candidates.json"
SOCIAL_PATH = REPO_DIR / "data" / "social-hype.json"
APP_PATH = REPO_DIR / "data" / "app-data.json"

if not APP_PATH.exists():
    print("Fehler: app-data.json fehlt.")
    exit(1)

with open(APP_PATH, "r", encoding="utf-8") as f:
    app_data = json.load(f)

existing_slugs = {m["slug"] for m in app_data["mods"]}
norm = lambda s: re.sub(r'[^a-z0-9]+', '', str(s or '').lower())
existing_names = {norm(m["name"]) for m in app_data["mods"]}
existing_mods_names = [norm(m["name"]) for m in app_data["mods"] if (m.get("pt") or "m") == "m"]

# Konzepte, die bereits als Mods existieren (damit niemals als Datapack vorgeschlagen)
MOD_CONCEPTS = [
    "dynamiclight", "veinminer", "waypoint", "minimap", "zoom", "culling",
    "fastleafdecay", "sodium", "iris", "lithium", "ferritecore", "appleskin",
    "xaero", "jei", "wthit", "jade", "presencefootsteps", "soundphysics"
]

def is_datapack_duplicate(title, slug):
    t_norm = norm(title)
    s_norm = norm(slug)
    for m in existing_mods_names:
        if m in t_norm or t_norm in m:
            return True
    for c in MOD_CONCEPTS:
        if c in t_norm or c in s_norm:
            return True
    return False

# 1. Social Hype
social_items = []
if SOCIAL_PATH.exists():
    with open(SOCIAL_PATH, "r", encoding="utf-8") as f:
        try:
            s_data = json.load(f)
            for it in s_data:
                slug = it["slug"]
                if slug in existing_slugs or norm(it["name"]) in existing_names:
                    continue
                if it.get("pt") == "datapack" and is_datapack_duplicate(it["name"], slug):
                    continue
                social_items.append(it)
        except Exception:
            pass

# 2. Modrinth / Curseforge Kandidaten
cand_items = []
if CANDIDATES_PATH.exists():
    with open(CANDIDATES_PATH, "r", encoding="utf-8") as f:
        try:
            c_data = json.load(f)
            mr_list = c_data.get("modrinth", [])
            seen = set(existing_slugs)
            for c in mr_list:
                slug = c["slug"]
                name_norm = norm(c["name"])
                pt = c.get("pt", "mod")
                if slug in seen or name_norm in existing_names:
                    continue
                if pt == "datapack" and is_datapack_duplicate(c["name"], slug):
                    continue
                if pt == "mod" and "fabric" not in c.get("cats", []):
                    continue
                seen.add(slug)
                cand_items.append(c)
        except Exception:
            pass

LIB_KEYWORDS = {"library", "api", "config", "kotlin", "architectury", "cloth", "yacl"}
def is_lib(item):
    name = item["name"].lower()
    cats = [c.lower() for c in item.get("cats", [])]
    return any(k in name for k in LIB_KEYWORDS) or "library" in cats

gameplay_mods = [c for c in cand_items if c.get("pt") == "mod" and not is_lib(c)]
gameplay_mods.sort(key=lambda x: x.get("follows", 0) * 10 + x.get("dl", 0), reverse=True)

lib_mods = [c for c in cand_items if c.get("pt") == "mod" and is_lib(c)]
lib_mods.sort(key=lambda x: x.get("follows", 0) * 10 + x.get("dl", 0), reverse=True)

resource_packs = [c for c in cand_items if c.get("pt") in ("r", "resourcepack")]
resource_packs.sort(key=lambda x: x.get("follows", 0) * 10 + x.get("dl", 0), reverse=True)

shaders = [c for c in cand_items if c.get("pt") in ("s", "shader")]
shaders.sort(key=lambda x: x.get("follows", 0) * 10 + x.get("dl", 0), reverse=True)

datapacks = [c for c in cand_items if c.get("pt") in ("d", "datapack")]
datapacks.sort(key=lambda x: x.get("follows", 0) * 10 + x.get("dl", 0), reverse=True)

print("=" * 70)
print("  🚀 MOD- & HYPE-KANDIDATEN FÜR MINECRAFT 26.3 (FABRIC)")
print("=" * 70 + "\n")

if social_items:
    print("🔥 1. FRISCH AUS AKTUELLEN YOUTUBE- & SOCIAL-MEDIA SHOWCASES")
    print("-" * 65)
    for i, c in enumerate(social_items[:5], 1):
        v = c.get("source_video", {})
        print(f" {i}. [{c.get('pt', 'mod').upper()}] {c['name']} (Slug: {c['slug']})")
        print(f"    Folgt: {c.get('follows', 0)} · Downloads: {c.get('dl', 0):,}".replace(",", "."))
        print(f"    Beschreibung: {c.get('desc', '')[:100]}...")
        if v.get('url'):
            print(f"    Showcase-Video: {v.get('title')} ({v.get('url')})")
        print(f"    Modrinth: https://modrinth.com/{c.get('pt', 'mod')}/{c['slug']}")
        print(f"    👉 Hinzufügen mit: 'Ja, füge {c['slug']} hinzu'\n")

print("\n🎮 2. TOP GAMEPLAY- & QOL-MODS (Beliebteste Fabric 26.3 Mods)")
print("-" * 65)
for i, c in enumerate(gameplay_mods[:5], 1):
    print(f" {i}. {c['name']} (Slug: {c['slug']})")
    print(f"    Downloads: {c.get('dl', 0):,} · Follows: {c.get('follows', 0)}".replace(",", "."))
    print(f"    Beschreibung: {c.get('desc', '')[:100]}...")
    print(f"    Modrinth: https://modrinth.com/mod/{c['slug']}")
    print(f"    👉 Hinzufügen mit: 'Ja, füge {c['slug']} hinzu'\n")

print("\n🎨 3. TOP RESOURCE PACKS (Texturen & Visuals 26.3)")
print("-" * 65)
for i, c in enumerate(resource_packs[:4], 1):
    print(f" {i}. {c['name']} (Slug: {c['slug']})")
    print(f"    Downloads: {c.get('dl', 0):,} · Follows: {c.get('follows', 0)}".replace(",", "."))
    print(f"    Beschreibung: {c.get('desc', '')[:100]}...")
    print(f"    Modrinth: https://modrinth.com/resourcepack/{c['slug']}")
    print(f"    👉 Hinzufügen mit: 'Ja, füge {c['slug']} hinzu'\n")

print("\n🌟 4. TOP SHADERPACKS (Iris 26.3)")
print("-" * 65)
for i, c in enumerate(shaders[:4], 1):
    print(f" {i}. {c['name']} (Slug: {c['slug']})")
    print(f"    Downloads: {c.get('dl', 0):,} · Follows: {c.get('follows', 0)}".replace(",", "."))
    print(f"    Beschreibung: {c.get('desc', '')[:100]}...")
    print(f"    Modrinth: https://modrinth.com/shader/{c['slug']}")
    print(f"    👉 Hinzufügen mit: 'Ja, füge {c['slug']} hinzu'\n")

if datapacks:
    print("\n📦 5. TOP DATAPACKS (Echte Datapacks - keine Mod-Dopplungen!)")
    print("-" * 65)
    for i, c in enumerate(datapacks[:3], 1):
        print(f" {i}. {c['name']} (Slug: {c['slug']})")
        print(f"    Downloads: {c.get('dl', 0):,} · Follows: {c.get('follows', 0)}".replace(",", "."))
        print(f"    Beschreibung: {c.get('desc', '')[:100]}...")
        print(f"    Modrinth: https://modrinth.com/datapack/{c['slug']}")
        print(f"    👉 Hinzufügen mit: 'Ja, füge {c['slug']} hinzu'\n")
