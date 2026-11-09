import urllib.request
import json
from pathlib import Path

REPO_DIR = Path("a:/Claude Projekt 1/mc-modpack")
FILES_PATH = REPO_DIR / "data" / "files.json"
APP_PATH = REPO_DIR / "data" / "app-data.json"

with open(FILES_PATH, "r", encoding="utf-8") as f:
    files = json.load(f)

with open(APP_PATH, "r", encoding="utf-8") as f:
    app_data = json.load(f)

NAME = {m["slug"]: m["name"] for m in app_data["mods"]}
PIN = {"sodium", "iris", "voxy", "photon-shader", "moreculling", "wandering-traveler"}
LOADERS = {
    "m": ["fabric"],
    "r": ["minecraft"],
    "s": ["iris", "optifine"],
    "d": ["datapack"]
}

UA = {"User-Agent": "mc-modpack-update-auditor (github.com/NashornAufCrack/mc-modpack)"}
A = "https://api.modrinth.com/v2"

is_mr = lambda s: str(files[s][0]).startswith("https://cdn.modrinth.com/")

print(f"=== LIVE-UPDATE-CHECK FÜR MINECRAFT 26.3 ===")
print(f"Gesamtanzahl Dateien im Katalog: {len(files)}")

# Group by type
all_updates = []
all_betas = []
all_pinned = []
all_uptodate = []

for t, loaders in LOADERS.items():
    slugs = [s for s in files if (files[s][8] if len(files[s]) > 8 else "m") == t and is_mr(s) and files[s][2]]
    print(f"\nPrüfe Typ '{t}' ({len(slugs)} Dateien mit Loadern {loaders})...")
    
    for i in range(0, len(slugs), 300):
        chunk = slugs[i:i+300]
        hashes = [files[s][2] for s in chunk]
        body = json.dumps({
            "hashes": hashes,
            "algorithm": "sha1",
            "loaders": loaders,
            "game_versions": ["26.3"]
        }).encode("utf-8")
        
        req = urllib.request.Request(
            f"{A}/version_files/update",
            data=body,
            headers={**UA, "Content-Type": "application/json"}
        )
        
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                upd_data = json.load(resp)
        except Exception as e:
            print(f"Fehler bei Batch {i}: {e}")
            continue
            
        for s in chunk:
            h = files[s][2]
            v = upd_data.get(h)
            cur_ver = files[s][6]
            m_name = NAME.get(s, files[s][7] or s)
            
            if v and v.get("files") and v.get("version_number") != cur_ver:
                new_ver = v.get("version_number")
                v_type = v.get("version_type")
                
                if s in PIN:
                    all_pinned.append({
                        "slug": s,
                        "name": m_name,
                        "typ": t,
                        "cur": cur_ver,
                        "neu": new_ver,
                        "art": v_type,
                        "grund": "absichtlich festgelegte Version (Stabilität / Kompatibilität)"
                    })
                elif v_type != "release":
                    all_betas.append({
                        "slug": s,
                        "name": m_name,
                        "typ": t,
                        "cur": cur_ver,
                        "neu": new_ver,
                        "art": v_type,
                        "grund": f"neuere {v_type}-Version verfügbar"
                    })
                else:
                    all_updates.append({
                        "slug": s,
                        "name": m_name,
                        "typ": t,
                        "cur": cur_ver,
                        "neu": new_ver,
                        "art": v_type,
                        "date": v.get("date_published", "")[:10]
                    })
            else:
                all_uptodate.append(s)

print("\n" + "=" * 65)
print(f"ERGEBNISSE:")
print(f"  ✅ Vollständig auf dem neuesten Release-Stand: {len(all_uptodate)} Inhalte")
print(f"  🔒 Bewusst festgehaltene Versionen (Schutz vor Abstürzen): {len(all_pinned)}")
print(f"  🧪 Neuere Beta-/Alpha-Versionen verfügbar: {len(all_betas)}")
print(f"  📦 Neuere finale Releases verfügbar: {len(all_updates)}")
print("=" * 65)

if all_updates:
    print("\n📦 NEUE STABILE RELEASES VERFÜGBAR:")
    for u in all_updates:
        print(f"  - [{u['typ'].upper()}] {u['name']} ({u['slug']}): {u['cur']} -> {u['neu']} (vom {u['date']})")

if all_pinned:
    print("\n🔒 BEWUSST FESTGEHALTENE VERSIONEN (Schutz vor Abstürzen):")
    for p in all_pinned:
        print(f"  - [{p['typ'].upper()}] {p['name']} ({p['slug']}): {p['cur']} (Neuer: {p['neu']} [{p['art']}]) -> {p['grund']}")

if all_betas:
    print(f"\n🧪 BETA-/ALPHA-VERSIONEN ({len(all_betas)} Stück, im stabilen Katalog ignoriert):")
    for b in all_betas[:10]:
        print(f"  - [{b['typ'].upper()}] {b['name']} ({b['slug']}): {b['cur']} -> {b['neu']} [{b['art']}]")
    if len(all_betas) > 10:
        print(f"  ... und {len(all_betas) - 10} weitere experimentelle Betas")
