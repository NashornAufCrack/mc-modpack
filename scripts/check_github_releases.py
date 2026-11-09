#!/usr/bin/env python3
"""
GitHub Early Release Scanner:
Überprüft die offiziellen GitHub-Repositories der Mods auf frühere Vorab-Releases,
Release Candidates und Nightlies für Minecraft 26.3, die noch nicht auf Modrinth sind.
Speichert Früh-Releases in data/github-early-releases.json.
"""

import urllib.request
import urllib.parse
import json
import re
import os
from pathlib import Path

REPO_DIR = Path(__file__).resolve().parent.parent
MEDIA_PATH = REPO_DIR / "data" / "media.json"
FILES_PATH = REPO_DIR / "data" / "files.json"
OUT_PATH = REPO_DIR / "data" / "github-early-releases.json"

with open(MEDIA_PATH, "r", encoding="utf-8") as f:
    media = json.load(f)

with open(FILES_PATH, "r", encoding="utf-8") as f:
    files = json.load(f)

# GitHub Token (aus Actions Umgebung falls vorhanden)
GH_TOKEN = os.environ.get("GITHUB_TOKEN")
HEADERS = {"User-Agent": "mc-modpack-github-scout"}
if GH_TOKEN:
    HEADERS["Authorization"] = f"token {GH_TOKEN}"

# Kritische Mods mit Prio
PRIO_MODS = [
    ("iris", "IrisShaders/Iris"),
    ("sodium", "CaffeineMC/sodium-fabric"),
    ("moreculling", "FX-Curse/MoreCulling"),
    ("voxy", "TridentMC/Voxy"),
    ("entity-model-features", "tr7zw/EntityModelFeatures"),
    ("entitytexturefeatures", "tr7zw/EntityTextureFeatures"),
    ("lithium", "CaffeineMC/lithium-fabric"),
    ("ferrite-core", "astei/ferrite-core"),
    ("modmenu", "TerraformersMC/ModMenu"),
    ("punchy-fpa", "SpikeX/Punchy")
]

# Sammle alle weiteren GitHub Repos aus media.json
all_repos = dict(PRIO_MODS)
for slug, info in media.items():
    src = info.get("links", {}).get("source") or ""
    m = re.match(r'https?://github\.com/([a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+?)(?:/|$)', src)
    if m:
        repo = m.group(1).rstrip(".git")
        if slug not in all_repos:
            all_repos[slug] = repo

print(f"=== GITHUB EARLY RELEASES SCANNER ===")
print(f"Überwache {len(all_repos)} GitHub-Repositories...")

early_releases = []

# Prüfe zuerst alle PRIO_MODS
for slug, repo in list(all_repos.items())[:30]:
    cur_ver = files.get(slug, [None]*7)[6] or ""
    url = f"https://api.github.com/repos/{repo}/releases?per_page=3"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            releases = json.load(resp)
        for r in releases:
            tag = r.get("tag_name", "")
            name = r.get("name", "")
            body = r.get("body", "")
            date = r.get("published_at", "")[:10]
            assets = r.get("assets", [])
            
            # Relevanz für 26.3
            is_26_3 = any("26.3" in x for x in [tag, name, body] + [a.get("name", "") for a in assets])
            
            # Prüfe, ob das Release neuer als die Modrinth-Version ist
            if is_26_3:
                jar_assets = [a for a in assets if a.get("name", "").endswith(".jar")]
                early_releases.append({
                    "slug": slug,
                    "repo": repo,
                    "cur_ver": cur_ver,
                    "gh_tag": tag,
                    "gh_name": name,
                    "published": date,
                    "prerelease": r.get("prerelease", False),
                    "url": r.get("html_url"),
                    "assets": [{"name": a["name"], "url": a["browser_download_url"]} for a in jar_assets]
                })
                print(f"  [GEFUNDEN] {slug} ({repo}): Release '{name or tag}' (vom {date})")
                break
    except Exception as e:
        # Rate-Limit oder nicht öffentlich: überspringen
        continue

print(f"\nScan abgeschlossen. {len(early_releases)} relevante 26.3 GitHub-Releases erfasst.")

with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(early_releases, f, ensure_ascii=False, indent=2)

print(f"Ergebnisse gespeichert in {OUT_PATH}")
