#!/usr/bin/env python3
"""
Social Media & Hype Scout für Minecraft 26.3 (Fabric):
- Durchsucht YouTube-Showcases, virale Trends und Mod-Vorstellungen.
- Findet modspezifische Erwähnungen und prüft diese gegen die Modrinth-API für 26.3 Fabric.
- Schließt bereits im Katalog vorhandene Inhalte aus.
- Duplikat-Schutz: Verhindert strikt, dass Mods als Datapacks vorgeschlagen werden.
- Verknüpft gefundene Mods direkt mit dem Video-Beweis.
- Schreibt data/social-hype.json.
"""

import urllib.request
import urllib.parse
import json
import re
from pathlib import Path

REPO_DIR = Path(__file__).resolve().parent.parent
APP_PATH = REPO_DIR / "data" / "app-data.json"
OUT_PATH = REPO_DIR / "data" / "social-hype.json"

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"}
MR_UA = {"User-Agent": "mc-modpack-social-scout (github.com/NashornAufCrack/mc-modpack)"}

with open(APP_PATH, "r", encoding="utf-8") as f:
    app_data = json.load(f)

existing_slugs = {m["slug"] for m in app_data["mods"]}
norm = lambda s: re.sub(r'[^a-z0-9]+', '', str(s or '').lower())
existing_names = {norm(m["name"]) for m in app_data["mods"]}
existing_mods = {norm(m["name"]) for m in app_data["mods"] if (m.get("pt") or "m") == "m"}

SEARCH_QUERIES = [
    ("minecraft mods 26.3 showcase", "mod"),
    ("minecraft viral mods tiktok 26.3", "mod"),
    ("minecraft aesthetic mods 26.3 fabric", "mod"),
    ("best minecraft shaders 26.3 iris", "shader"),
    ("minecraft 26.3 resource packs showcase", "resourcepack"),
    ("minecraft 26.3 datapacks", "datapack")
]

print("=== Social Media & Video Hype Scout gestartet ===", flush=True)

found_candidates = []
seen_slugs = set(existing_slugs)

for query, target_pt in SEARCH_QUERIES:
    print(f"Suche Trends für: '{query}'...", flush=True)
    url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(query)}"
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"  Fehler bei Suche '{query}': {e}", flush=True)
        continue

    # Extrahiere Video-IDs und Titel
    matches = re.findall(r'"videoId":"([a-zA-Z0-9_-]{11})".*?"title":\{"runs":\[\{"text":"([^"]+)"\}\]', html)
    
    unique_candidates = []
    seen_titles = set()
    for vid, full_title in matches:
        if full_title in seen_titles:
            continue
        seen_titles.add(full_title)
        
        # Säubere Titel von typischen Boilerplate-Wörtern
        cleaned = re.sub(r'(?i)\b(minecraft|mods?|fabric|forge|neoforge|showcase|top \d+|best \d+|\d{4}|26\.3|\(fabric\)|\(neoforge\)|part \d+|update|trailer|review)\b', '', full_title)
        cleaned = re.sub(r'[|:!?-]+', ' ', cleaned).strip()
        words = [w for w in cleaned.split() if len(w) > 2]
        if words:
            cand_name = " ".join(words[:4])
            unique_candidates.append((vid, full_title, cand_name))
        if len(unique_candidates) >= 10:
            break

    for vid, full_title, candidate_name in unique_candidates:
        facets = [["versions:26.3"]]
        if target_pt == "mod":
            facets.append(["project_type:mod"])
            facets.append(["categories:fabric"])
        elif target_pt == "shader":
            facets.append(["project_type:shader"])
        elif target_pt == "resourcepack":
            facets.append(["project_type:resourcepack"])
        elif target_pt == "datapack":
            facets.append(["project_type:datapack"])
            
        mr_url = f"https://api.modrinth.com/v2/search?query={urllib.parse.quote(candidate_name)}&limit=2&facets={urllib.parse.quote(json.dumps(facets))}"
        mr_req = urllib.request.Request(mr_url, headers=MR_UA)
        try:
            with urllib.request.urlopen(mr_req, timeout=4) as mr_resp:
                mr_data = json.load(mr_resp)
                hits = mr_data.get("hits", [])
                for h in hits:
                    slug = h["slug"]
                    h_name_norm = norm(h["title"])
                    
                    if slug in seen_slugs or h_name_norm in existing_names:
                        continue
                        
                    # Niemals dieselbe Mod als Datapack vorschlagen!
                    if h.get("project_type") == "datapack" and h_name_norm in existing_mods:
                        continue
                        
                    seen_slugs.add(slug)
                    found_candidates.append({
                        "slug": slug,
                        "name": h["title"],
                        "pt": h.get("project_type", target_pt),
                        "desc": h.get("description", ""),
                        "dl": h.get("downloads", 0),
                        "follows": h.get("follows", 0),
                        "icon": h.get("icon_url"),
                        "gallery": h.get("gallery", [])[:4],
                        "source_video": {
                            "id": vid,
                            "url": f"https://www.youtube.com/watch?v={vid}",
                            "title": full_title
                        },
                        "query": query
                    })
                    print(f"  -> GEFUNDEN: {h['title']} ({slug}) aus Video '{full_title}'", flush=True)
                    break
        except Exception:
            continue

print(f"\nGesamtanzahl Social-Media / Video-Kandidaten: {len(found_candidates)}", flush=True)

with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(found_candidates, f, ensure_ascii=False, indent=2)

print(f"Ergebnisse gespeichert in {OUT_PATH}", flush=True)
