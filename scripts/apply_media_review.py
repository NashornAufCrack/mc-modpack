#!/usr/bin/env python3
# Wendet Foto- und Video-Urteile auf data/media.json und data/media-app.json an.
# Aufruf: python scripts/apply_media_review.py [pfad/zu/media-urteile.json]
import json, os, sys

review_file = sys.argv[1] if len(sys.argv) > 1 else "data/media-urteile.json"
if not os.path.exists(review_file):
    print(f"Keine Urteilsdatei unter '{review_file}' gefunden.")
    print("Exportiere deine Entscheidungen auf der Prüfseite und speichere sie als data/media-urteile.json ab.")
    sys.exit(1)

with open(review_file, "r", encoding="utf-8") as f:
    urteile = json.load(f)

# Format von urteile:
# {
#   "rejected_imgs": { "slug": ["url1", "url2"] },
#   "video_status": { "slug:videoId": "ok" | "nein" }
# }
rejected_imgs = urteile.get("rejected_imgs", {})
video_status = urteile.get("video_status", {})

print(f"Lade Urteile: {sum(len(v) for v in rejected_imgs.values())} abgelehnte Bilder, {len(video_status)} Video-Urteile.")

for fpath in ["data/media.json", "data/media-app.json"]:
    if not os.path.exists(fpath):
        continue
    with open(fpath, "r", encoding="utf-8") as f:
        media = json.load(f)
    
    img_rem = 0
    vid_upd = 0
    for slug, bad_list in rejected_imgs.items():
        if slug in media:
            bad_set = set(bad_list)
            b_orig = media[slug].get("bilder", [])
            hq_orig = media[slug].get("hq", [])
            media[slug]["bilder"] = [u for u in b_orig if u not in bad_set]
            media[slug]["hq"] = [u for u in hq_orig if u not in bad_set]
            img_rem += (len(b_orig) - len(media[slug]["bilder"]))

    for k, status in video_status.items():
        if ":" in k:
            slug, vid_id = k.split(":", 1)
            if slug in media and "videos" in media[slug]:
                for v in media[slug]["videos"]:
                    if v.get("id") == vid_id:
                        v["status"] = status
                        vid_upd += 1

    with open(fpath, "w", encoding="utf-8") as f:
        json.dump(media, f, ensure_ascii=False, indent=2)
    print(f"{fpath}: {img_rem} Bilder entfernt, {vid_upd} Videos aktualisiert.")

print("Fertig! Alle Urteile wurden dauerhaft in die Projektdaten übernommen.")
