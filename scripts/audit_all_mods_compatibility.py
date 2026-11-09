import json
import sys
import io
from pathlib import Path

REPO_DIR = Path("a:/Claude Projekt 1/mc-modpack")
sys.path.insert(0, str(REPO_DIR))

from scripts.solve_pack_compatibility import test_mod_set, files, app_data

LOCKED = [m["slug"] for m in app_data["mods"] if (m["cat"] == "P" and m.get("rolle") == "K") or m.get("pflicht")]
PERF_EXTRAS = ["moreculling", "entityculling", "immediatelyfast", "modernfix-mvus", "badoptimizations", "c2me-fabric", "scalablelux", "sodium-extra", "reeses-sodium-options", "sodium", "lithium", "ferrite-core"]
BASE_SET = set(LOCKED + PERF_EXTRAS)

print(f"Prüfe alle {len(app_data['mods'])} Katalog-Mods einzeln gegen das Basis-Leistungspaket ({len(BASE_SET)} Mods)...")

broken_mods = []
for m in app_data["mods"]:
    slug = m["slug"]
    if (m.get("pt") or "m") != "m" or slug not in files:
        continue
    
    test_set = list(BASE_SET | {slug})
    
    # Run test
    old_stdout = sys.stdout
    sys.stdout = io.StringIO()
    ok = test_mod_set(test_set, slug)
    out_log = sys.stdout.getvalue()
    sys.stdout = old_stdout
    
    if not ok:
        broken_mods.append((slug, m["name"], out_log.strip()))

if broken_mods:
    print(f"\n❌ GEFUNDENE INKOMPATIBILITÄTEN: {len(broken_mods)}")
    for slug, name, log in broken_mods:
        print(f"\n--- {name} ({slug}) ---")
        for line in log.split("\n"):
            if "❌" in line:
                print(f"  {line}")
else:
    print(f"\n🎉 PERFEKT: Ausnahmslos JEDER einzelne Mod im Katalog ist 100% kompatibel mit dem Basis-Leistungspaket!")
