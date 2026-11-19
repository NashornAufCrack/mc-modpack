import json
from pathlib import Path

REPO_DIR = Path(__file__).resolve().parent.parent
APP_PATH = REPO_DIR / "data" / "app-data.json"
INSP_PATH = REPO_DIR / "data" / "jar-inspection.json"
FILES_PATH = REPO_DIR / "data" / "files.json"


def build_jar_rules(app_data, insp, files):
    """Build jar_rules mapping for app-data.json from non-stale jar-inspection entries."""
    jar_rules = {}
    for slug, item in files.items():
        if len(item) > 8 and item[8] != "m":
            continue
        info = insp.get(slug, {})
        if not info or (len(item) > 2 and info.get("sha1") != item[2]):
            continue
        breaks = info.get("breaks", {})
        conflicts = info.get("conflicts", {})
        mc = info.get("depends", {}).get("minecraft")
        mid = info.get("mod_id") or slug
        jar_ver = info.get("jar_version")

        if breaks or conflicts or mc or (mid and mid != slug) or jar_ver:
            rule = {
                "id": mid,
                "mc": mc,
                "breaks": breaks,
                "conflicts": conflicts,
            }
            if jar_ver:
                rule["ver"] = jar_ver
            jar_rules[slug] = rule
    return jar_rules


def main():
    with open(APP_PATH, "r", encoding="utf-8") as f:
        app_data = json.load(f)

    with open(INSP_PATH, "r", encoding="utf-8") as f:
        insp = json.load(f)

    with open(FILES_PATH, "r", encoding="utf-8") as f:
        files = json.load(f)

    jar_rules = build_jar_rules(app_data, insp, files)
    app_data["jar_rules"] = jar_rules

    with open(APP_PATH, "w", encoding="utf-8") as f:
        json.dump(app_data, f, ensure_ascii=False, indent=2)

    # Update daten-embed.js
    with open(REPO_DIR / "data" / "media.json", "r", encoding="utf-8") as f:
        media_d = json.load(f)

    with open(REPO_DIR / "pruefung" / "daten-embed.js", "w", encoding="utf-8") as f:
        f.write("window.CATALOG_EMBED = " + json.dumps({"appData": app_data, "mediaData": media_d}, ensure_ascii=False) + ";\n")

    print(f"Erfolgreich {len(jar_rules)} JAR-Kompatibilitätsregeln in app-data.json und daten-embed.js eingebettet!")


if __name__ == "__main__":
    main()
