import urllib.request
import urllib.parse
import json
import re
from pathlib import Path

REPO_DIR = Path("a:/Claude Projekt 1/mc-modpack")
UA = {"User-Agent": "mc-modpack-batch-adder (github.com/NashornAufCrack/mc-modpack)"}

# Define the 13 new items with their target category, subcategory, and any custom basis requirements
ITEMS_TO_ADD = [
    {
        "slug": "default-hd-128x",
        "pt": "r",
        "cat": "R",
        "sub": "Texturen",
        "basis": []
    },
    {
        "slug": "miniature-shader",
        "pt": "s",
        "cat": "S",
        "sub": "Shader",
        "basis": []
    },
    {
        "slug": "full-brightness-toggle",
        "pt": "m",
        "cat": "G",
        "sub": "Gameplay",
        "basis": []
    },
    {
        "slug": "brays-zombie-overhaul-fresh-animations",
        "pt": "r",
        "cat": "R",
        "sub": "Fresh Animations",
        "basis": ["fresh-animations"]
    },
    {
        "slug": "whimscape-x-fresh-animations",
        "pt": "r",
        "cat": "R",
        "sub": "Fresh Animations",
        "basis": ["fresh-animations"]
    },
    {
        "slug": "als-boss-rush-x-fresh-animations",
        "pt": "r",
        "cat": "R",
        "sub": "Fresh Animations",
        "basis": ["fresh-animations"]
    },
    {
        "slug": "blue-netherite",
        "pt": "r",
        "cat": "R",
        "sub": "Texturen",
        "basis": []
    },
    {
        "slug": "fresh-animations-quivers",
        "pt": "r",
        "cat": "R",
        "sub": "Fresh Animations",
        "basis": ["fresh-animations"]
    },
    {
        "slug": "default-hd-512x",
        "pt": "r",
        "cat": "R",
        "sub": "Texturen",
        "basis": []
    },
    {
        "slug": "excal",
        "pt": "r",
        "cat": "R",
        "sub": "Texturen",
        "basis": []
    },
    {
        "slug": "excalibur-fresh-animations",
        "pt": "r",
        "cat": "R",
        "sub": "Fresh Animations",
        "basis": ["excal", "fresh-animations"]
    },
    {
        "slug": "stained-glass-ultra",
        "pt": "r",
        "cat": "R",
        "sub": "Texturen",
        "basis": []
    },
    {
        "slug": "dont-punch-my-tacz",
        "pt": "m",
        "cat": "G",
        "sub": "Kompatibilität",
        "basis": []
    }
]

# Load target files
with open(REPO_DIR / "data" / "files.json", "r", encoding="utf-8") as f:
    files_d = json.load(f)

with open(REPO_DIR / "data" / "app-data.json", "r", encoding="utf-8") as f:
    app_d = json.load(f)

with open(REPO_DIR / "data" / "mods.json", "r", encoding="utf-8") as f:
    mods_list = json.load(f)

with open(REPO_DIR / "data" / "media.json", "r", encoding="utf-8") as f:
    media_d = json.load(f)

with open(REPO_DIR / "data" / "media-app.json", "r", encoding="utf-8") as f:
    media_app_d = json.load(f)

for item in ITEMS_TO_ADD:
    slug = item["slug"]
    pt_char = item["pt"]
    cat = item["cat"]
    sub = item["sub"]
    basis = item["basis"]

    print(f"\n>>> Verarbeite: {slug} ({pt_char})")

    # 1. Modrinth Projekt
    req = urllib.request.Request(f"https://api.modrinth.com/v2/project/{slug}", headers=UA)
    with urllib.request.urlopen(req) as resp:
        proj = json.load(resp)

    title = proj.get("title", slug)
    desc = proj.get("description", "")
    icon_url = proj.get("icon_url")
    gallery = proj.get("gallery", [])

    # YouTube-Videos aus Body
    body = proj.get("body", "")
    vids = re.findall(r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})', body)
    vids = list(dict.fromkeys(vids))

    # 2. Version für 26.3
    loaders = ["iris", "optifine"] if pt_char == "s" else ["minecraft"] if pt_char == "r" else ["datapack"] if pt_char == "d" else ["fabric"]
    loaders_param = urllib.parse.quote(json.dumps(loaders))
    gv_param = urllib.parse.quote(json.dumps(["26.3"]))

    v_url = f"https://api.modrinth.com/v2/project/{slug}/version?game_versions={gv_param}&loaders={loaders_param}"
    req = urllib.request.Request(v_url, headers=UA)
    try:
        with urllib.request.urlopen(req) as resp:
            versions = json.load(resp)
    except Exception:
        versions = []

    if not versions:
        v_url = f"https://api.modrinth.com/v2/project/{slug}/version?game_versions={gv_param}"
        req = urllib.request.Request(v_url, headers=UA)
        try:
            with urllib.request.urlopen(req) as resp:
                versions = json.load(resp)
        except Exception:
            versions = []

    if not versions:
        print(f"WARNUNG: Keine 26.3 Version für {slug} gefunden!")
        continue

    # Pick version
    ver_obj = next((v for v in versions if v.get("version_type") == "release"), versions[0])
    v_files = ver_obj.get("files", [])
    primary_file = next((f for f in v_files if f.get("primary")), v_files[0])

    file_url = primary_file.get("url")
    file_name = primary_file.get("filename")
    sha1 = primary_file.get("hashes", {}).get("sha1")
    sha512 = primary_file.get("hashes", {}).get("sha512")
    file_size = primary_file.get("size", 0)
    version_num = ver_obj.get("version_number", "1.0.0")

    # Dependencies auflösen
    req_deps = [d.get("project_id") for d in ver_obj.get("dependencies", []) if d.get("dependency_type") == "required" and d.get("project_id")]
    dep_slugs = []
    for pid in req_deps:
        try:
            req = urllib.request.Request(f"https://api.modrinth.com/v2/project/{pid}", headers=UA)
            with urllib.request.urlopen(req) as resp:
                dep_proj = json.load(resp)
                dep_slugs.append(dep_proj.get("slug", pid))
        except Exception:
            dep_slugs.append(pid)

    # Wenn dont-punch-my-tacz, verknüpfe punchy-fpa
    if slug == "dont-punch-my-tacz" and "punchy-fpa" not in dep_slugs:
        dep_slugs.append("punchy-fpa")
    # Wenn full-brightness-toggle, verknüpfe collective
    if slug == "full-brightness-toggle" and "collective" not in dep_slugs:
        dep_slugs.append("collective")

    print(f"  Gefundene Version: {version_num} ({file_name})")
    print(f"  Abhängigkeiten: {dep_slugs}")

    # 3. In data/files.json
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

    # 4. In data/app-data.json
    hq_imgs = [g.get("raw_url") or g.get("url") for g in gallery if g.get("url")]
    thumb_imgs = [g.get("url") for g in gallery if g.get("url")]

    mod_entry = {
        "slug": slug,
        "name": title,
        "cat": cat,
        "sub": sub,
        "ampel": "G" if pt_char in ("r", "s") else "Y",
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
        "seite": "client" if pt_char in ("r", "s") or proj.get("server_side") == "unsupported" else "beide"
    }

    # In app_d["mods"] ersetzen oder anfügen
    app_d["mods"] = [m for m in app_d["mods"] if m["slug"] != slug] + [mod_entry]
    app_d["files"][slug] = files_d[slug]

    # In app_d["x"]["basisfehlt"] eintragen falls basis definiert
    if basis:
        app_d["x"]["basisfehlt"][slug] = basis

    # 5. In data/mods.json
    mods_list = [m for m in mods_list if m["slug"] != slug] + [mod_entry]

    # 6. In media.json & media-app.json
    med_entry = {
        "bilder": hq_imgs if hq_imgs else thumb_imgs,
        "hq": hq_imgs,
        "icon": icon_url,
        "videos": vids,
        "links": {
            "source": proj.get("source_url"),
            "wiki": proj.get("wiki_url")
        }
    }
    media_d[slug] = med_entry
    media_app_d[slug] = med_entry

# Speichern
with open(REPO_DIR / "data" / "files.json", "w", encoding="utf-8") as f:
    json.dump(files_d, f, ensure_ascii=False, indent=2)

with open(REPO_DIR / "quelle" / "files.json", "w", encoding="utf-8") as f:
    json.dump(files_d, f, ensure_ascii=False, indent=2)

with open(REPO_DIR / "data" / "app-data.json", "w", encoding="utf-8") as f:
    json.dump(app_d, f, ensure_ascii=False, indent=2)

with open(REPO_DIR / "data" / "mods.json", "w", encoding="utf-8") as f:
    json.dump(mods_list, f, ensure_ascii=False, indent=2)

with open(REPO_DIR / "data" / "media.json", "w", encoding="utf-8") as f:
    json.dump(media_d, f, ensure_ascii=False, indent=2)

with open(REPO_DIR / "data" / "media-app.json", "w", encoding="utf-8") as f:
    json.dump(media_app_d, f, ensure_ascii=False, indent=2)

# Update daten-embed.js
with open(REPO_DIR / "pruefung" / "daten-embed.js", "w", encoding="utf-8") as f:
    f.write("window.CATALOG_EMBED = " + json.dumps({"appData": app_d, "mediaData": media_d}, ensure_ascii=False) + ";\n")

print("\n>>> Alle 13 neuen Items erfolgreich hinzugefügt und synchronisiert!")
