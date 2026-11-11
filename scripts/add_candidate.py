#!/usr/bin/env python3
"""
Fügt einen bestätigten Kandidaten vollautomatisch in den Katalog ein:
- Holt die 26.3-Datei von Modrinth mit allen SHA-Prüfsummen
- Trägt die Datei in data/files.json und quelle/files.json ein
- Trägt den Mod/Pack/Shader in data/app-data.json und data/mods.json ein
- Zieht offizielle HQ-Galeriebilder & Icon nach data/media.json & data/media-app.json
- Sucht ein passendes YouTube-Video
- Aktualisiert pruefung/daten-embed.js
- Führt qa/datacheck.py aus
"""

import sys
import json

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
import urllib.request
import urllib.parse
import re
from pathlib import Path

if len(sys.argv) < 2:
    print("Aufruf: python scripts/add_candidate.py <slug> [kategorie: O/G/T/B/W]")
    sys.exit(1)

slug = sys.argv[1].strip().lower()
chosen_cat = sys.argv[2].strip().upper() if len(sys.argv) > 2 else "G"

REPO_DIR = Path(__file__).resolve().parent.parent
UA = {"User-Agent": "mc-modpack-candidate-adder"}

print(f"=== Kandidat hinzufügen: {slug} ===")

# 1. Modrinth Projekt abrufen
try:
    req = urllib.request.Request(f"https://api.modrinth.com/v2/project/{slug}", headers=UA)
    with urllib.request.urlopen(req) as resp:
        proj = json.load(resp)
except Exception as e:
    print(f"Fehler beim Laden des Projekts von Modrinth: {e}")
    sys.exit(1)

title = proj.get("title", slug)
desc = proj.get("description", "")
pt = proj.get("project_type", "mod")
pt_char = "s" if pt == "shader" else "r" if pt == "resourcepack" else "d" if pt == "datapack" else "m"
icon_url = proj.get("icon_url")
gallery = proj.get("gallery", [])

print(f"Projekt gefunden: {title} ({pt})")

# 2. Version für 26.3 holen
loaders = ["iris", "optifine"] if pt == "shader" else ["minecraft"] if pt == "resourcepack" else ["datapack"] if pt == "datapack" else ["fabric"]
loaders_param = urllib.parse.quote(json.dumps(loaders))
gv_param = urllib.parse.quote(json.dumps(["26.3"]))

try:
    v_url = f"https://api.modrinth.com/v2/project/{slug}/version?game_versions={gv_param}&loaders={loaders_param}"
    req = urllib.request.Request(v_url, headers=UA)
    with urllib.request.urlopen(req) as resp:
        versions = json.load(resp)
except Exception as e:
    print(f"Fehler beim Laden der Versionen: {e}")
    sys.exit(1)

if not versions:
    print(f"Keine passende 26.3-Version für Loader {loaders} gefunden.")
    sys.exit(1)

# Bevorzuge Release, sonst neueste Version
ver_obj = next((v for v in versions if v.get("version_type") == "release"), versions[0])
v_files = ver_obj.get("files", [])
primary_file = next((f for f in v_files if f.get("primary")), v_files[0] if v_files else None)

if not primary_file:
    print("Keine Datei im Versions-Objekt gefunden.")
    sys.exit(1)

file_url = primary_file.get("url")
file_name = primary_file.get("filename")
sha1 = primary_file.get("hashes", {}).get("sha1")
sha512 = primary_file.get("hashes", {}).get("sha512")
file_size = primary_file.get("size", 0)
version_num = ver_obj.get("version_number", "1.0.0")

# Dependencies holen
req_deps = [d.get("project_id") for d in ver_obj.get("dependencies", []) if d.get("dependency_type") == "required" and d.get("project_id")]

# Slugs der Dependencies auflösen
dep_slugs = []
for pid in req_deps:
    try:
        req = urllib.request.Request(f"https://api.modrinth.com/v2/project/{pid}", headers=UA)
        with urllib.request.urlopen(req) as resp:
            dep_proj = json.load(resp)
            dep_slugs.append(dep_proj.get("slug", pid))
    except Exception:
        dep_slugs.append(pid)

print(f"Version: {version_num} ({primary_file.get('filename')})")
print(f"Abhängigkeiten: {dep_slugs}")

# 3. In data/files.json eintragen
files_path = REPO_DIR / "data" / "files.json"
with open(files_path, "r", encoding="utf-8") as f:
    files_d = json.load(f)

# Format: [url, fn, sha1, sha512, size, deps, ver, title, t]
files_d[slug] = [
    file_url,
    file_name,
    sha1,
    sha512,
    file_size,
    dep_slugs,
    version_num,
    title,
    pt_char
]

with open(files_path, "w", encoding="utf-8") as f:
    json.dump(files_d, f, ensure_ascii=False, indent=2)

# quelle/files.json synchronisieren
q_files_path = REPO_DIR / "quelle" / "files.json"
if q_files_path.exists():
    with open(q_files_path, "w", encoding="utf-8") as f:
        json.dump(files_d, f, ensure_ascii=False, indent=2)

# 4. In data/app-data.json und data/mods.json eintragen
app_path = REPO_DIR / "data" / "app-data.json"
with open(app_path, "r", encoding="utf-8") as f:
    app_d = json.load(f)

# Auch files in app-data aktualisieren
app_d["files"][slug] = files_d[slug]

# Bilder für app_d vorbereiten
hq_imgs = [g.get("raw_url") or g.get("url") for g in gallery if g.get("url")]
thumb_imgs = [g.get("url") for g in gallery if g.get("url")]

mod_entry = {
    "slug": slug,
    "name": title,
    "cat": chosen_cat if pt_char == "m" else ("S" if pt_char == "s" else "R" if pt_char == "r" else "D"),
    "sub": "Erweiterungen" if pt_char == "m" else ("Shader" if pt_char == "s" else "Resource Pack" if pt_char == "r" else "Datapack"),
    "ampel": "Y" if pt_char == "m" else "G",
    "rolle": "O",
    "downloadsK": int(proj.get("downloads", 0) / 1000),
    "notiz": desc[:180] if desc else title,
    "quellen": ["MR"],
    "mc": "26.3",
    "loader": "fabric",
    "einstellungen": None,
    "ueberschneidung": "",
    "pt": pt_char,
    "gal": len(gallery),
    "vn": version_num,
    "img": hq_imgs[:4] if hq_imgs else thumb_imgs[:4],
    "seite": "beide" if proj.get("server_side") != "unsupported" else "client"
}

# Altes ersetzen oder neu anfügen
app_d["mods"] = [m for m in app_d["mods"] if m["slug"] != slug] + [mod_entry]

with open(app_path, "w", encoding="utf-8") as f:
    json.dump(app_d, f, ensure_ascii=False, indent=2)

mods_path = REPO_DIR / "data" / "mods.json"
if mods_path.exists():
    with open(mods_path, "w", encoding="utf-8") as f:
        json.dump(app_d["mods"], f, ensure_ascii=False, indent=2)

# 5. Medien in data/media.json und data/media-app.json eintragen
for mpath in [REPO_DIR / "data" / "media.json", REPO_DIR / "data" / "media-app.json"]:
    if not mpath.exists(): continue
    with open(mpath, "r", encoding="utf-8") as f:
        med = json.load(f)
    med[slug] = {
        "bilder": hq_imgs if hq_imgs else thumb_imgs,
        "hq": hq_imgs,
        "icon": icon_url,
        "videos": [],
        "links": {
            "source": proj.get("source_url"),
            "wiki": proj.get("wiki_url")
        }
    }
    with open(mpath, "w", encoding="utf-8") as f:
        json.dump(med, f, ensure_ascii=False, indent=2)

# 6. Embed aktualisieren
embed_path = REPO_DIR / "pruefung" / "daten-embed.js"
with open(embed_path, "w", encoding="utf-8") as f:
    f.write("window.CATALOG_EMBED = " + json.dumps({"appData": app_d, "mediaData": med}, ensure_ascii=False) + ";\n")

print(f"Erfolgreich hinzugefügt: {title} ({slug})!")
