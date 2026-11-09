#!/usr/bin/env python3
"""
Wendet Foto- und Video-Entscheidungen aus data/media-urteile.json auf
data/media.json und data/media-app.json an und wertet Bilder automatisch
auf die höchste verfügbare Auflösung (HQ/Raw) auf.
"""

import json
import os
import re
import sys
from pathlib import Path

REPO_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_DIR / "data"
URTEILE_PATH = DATA_DIR / "media-urteile.json"

if len(sys.argv) > 1:
    URTEILE_PATH = Path(sys.argv[1])

if not URTEILE_PATH.exists():
    print(f"Fehler: Datei '{URTEILE_PATH}' existiert nicht.")
    sys.exit(1)

with open(URTEILE_PATH, "r", encoding="utf-8") as f:
    urteile = json.load(f)

rejected_imgs = urteile.get("rejected_imgs", {})
video_status = urteile.get("video_status", {})

print(f"=== Medien-Entscheidungen anwenden ===")
print(f"Urteile: {sum(len(v) for v in rejected_imgs.values())} abgelehnte Bilder in {len(rejected_imgs)} Mods, {len(video_status)} Video-Bewertungen.")

def get_hash(u):
    m = re.search(r'/images/([0-9a-f]{40})', u)
    return m.group(1).lower() if m else None

def get_base(u):
    base = u.split('?')[0].split('/')[-1]
    return re.sub(r'(_350)?\.(webp|png|jpe?g|gif)$', '', base, flags=re.I).lower()

total_rem = 0
total_upg = 0
total_app = 0
total_vid = 0

for fpath in [DATA_DIR / "media.json", DATA_DIR / "media-app.json"]:
    if not fpath.exists():
        continue

    with open(fpath, "r", encoding="utf-8") as f:
        media = json.load(f)

    file_rem = 0
    file_upg = 0
    file_app = 0
    file_vid = 0

    for slug, e in media.items():
        bad_list = rejected_imgs.get(slug, [])
        bad_set = set(bad_list)
        bad_hashes = {get_hash(u) for u in bad_list if get_hash(u)}
        bad_bases = {get_base(u) for u in bad_list if get_base(u)}

        def is_bad(u):
            if u in bad_set:
                return True
            h = get_hash(u)
            if h and h in bad_hashes:
                return True
            b = get_base(u)
            if b and b in bad_bases:
                return True
            return False

        b_orig = list(e.get("bilder", []))
        hq_orig = list(e.get("hq", []))

        # 1. Abgelehnte Bilder entfernen
        b_clean = [u for u in b_orig if not is_bad(u)]
        hq_clean = [u for u in hq_orig if not is_bad(u)]
        file_rem += (len(b_orig) - len(b_clean))

        # 2. HQ-Zuordnungskarten aufbauen
        hq_by_hash = {get_hash(u): u for u in hq_clean if get_hash(u)}
        hq_by_base = {get_base(u): u for u in hq_clean if get_base(u)}
        can_use_index = (len(b_orig) == len(hq_orig) and len(b_orig) > 0)

        upgraded_b = []
        used_hq = set()

        # 3. Aufwertung auf höhere Qualität
        for i, u in enumerate(b_clean):
            h = get_hash(u)
            base = get_base(u)
            upgraded_u = u

            if h and h in hq_by_hash and "_350.webp" in u:
                upgraded_u = hq_by_hash[h]
                file_upg += 1
            elif can_use_index and i < len(hq_orig) and not is_bad(hq_orig[i]) and "_350.webp" in u:
                upgraded_u = hq_orig[i]
                file_upg += 1
            elif base and base in hq_by_base and ("_350" in u or "thumb" in u):
                upgraded_u = hq_by_base[base]
                file_upg += 1

            upgraded_b.append(upgraded_u)
            used_hq.add(upgraded_u)

        # 4. Duplikate verhindern & Reihenfolge beibehalten
        final_b = []
        seen = set()
        for u in upgraded_b:
            if u not in seen and not is_bad(u):
                seen.add(u)
                final_b.append(u)

        # 5. Nicht 100% zuordenbare HQ-Bilder zur Ansicht ergänzen
        for h in hq_clean:
            if h not in seen and not is_bad(h):
                seen.add(h)
                final_b.append(h)
                file_app += 1

        e["bilder"] = final_b
        e["hq"] = hq_clean

        # Auch aus 'extra' entfernen, falls vorhanden
        if "extra" in e:
            e["extra"] = [u for u in e["extra"] if not is_bad(u)]

    # 6. Video-Urteile einpflegen
    for k, status in video_status.items():
        if ":" in k:
            slug, vid_id = k.split(":", 1)
            if slug in media and "videos" in media[slug]:
                for v in media[slug]["videos"]:
                    if v.get("id") == vid_id:
                        v["status"] = status
                        file_vid += 1

    with open(fpath, "w", encoding="utf-8") as f:
        json.dump(media, f, ensure_ascii=False, indent=2)

    print(f"{fpath.name}: {file_rem} Bilder entfernt, {file_upg} auf HQ aufgewertet, {file_app} weitere HQ-Bilder ergänzt, {file_vid} Videos aktualisiert.")
    total_rem = max(total_rem, file_rem)
    total_upg = max(total_upg, file_upg)
    total_app = max(total_app, file_app)
    total_vid = max(total_vid, file_vid)

# Embed-Script für Offline-Prüfseite aktualisieren
if (DATA_DIR / "app-data.json").exists() and (DATA_DIR / "media-app.json").exists():
    with open(DATA_DIR / "app-data.json", "r", encoding="utf-8") as f:
        app_d = json.load(f)
    with open(DATA_DIR / "media-app.json", "r", encoding="utf-8") as f:
        media_d = json.load(f)
    embed_path = REPO_DIR / "pruefung" / "daten-embed.js"
    with open(embed_path, "w", encoding="utf-8") as f:
        f.write("window.CATALOG_EMBED = " + json.dumps({"appData": app_d, "mediaData": media_d}, ensure_ascii=False) + ";\n")
    print(f"pruefung/daten-embed.js aktualisiert.")

print(f"\nErfolgreich abgeschlossen!")
print(f"- Entfernte abgelehnte Bilder: {total_rem}")
print(f"- Auf maximale HQ-Auflösung aufgewertet: {total_upg}")
print(f"- Zusätzliche HQ-Bilder im Katalog sichtbar gemacht: {total_app}")
print(f"- Aktualisierte Videos: {total_vid}")
