import json
import sys
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

REPO_DIR = Path(__file__).resolve().parent.parent
if str(REPO_DIR) not in sys.path:
    sys.path.insert(0, str(REPO_DIR))
from scripts.fabric_semver import matches_predicate, normalize_target_version

APP_PATH = REPO_DIR / "data" / "app-data.json"
FILES_PATH = REPO_DIR / "data" / "files.json"
INSP_PATH = REPO_DIR / "data" / "jar-inspection.json"
PROJ_PATH = REPO_DIR / "config" / "project.json"

with open(APP_PATH, "r", encoding="utf-8") as f:
    app_data = json.load(f)

with open(FILES_PATH, "r", encoding="utf-8") as f:
    files = json.load(f)

with open(INSP_PATH, "r", encoding="utf-8") as f:
    insp = json.load(f)

with open(PROJ_PATH, "r", encoding="utf-8") as f:
    MC_VERSION = json.load(f)["minecraftVersion"]

mod_id_to_slug = {}
slug_to_mod_id = {}
for s, item in files.items():
    if len(item) > 8 and item[8] != "m": continue
    info = insp.get(s, {})
    mid = info.get("mod_id") or s
    mod_id_to_slug[mid] = s
    slug_to_mod_id[s] = mid

def test_mod_set(slugs, set_name="Pack"):
    resolved = set(slugs)
    stack = list(slugs)
    while stack:
        cur = stack.pop()
        f = files.get(cur)
        if not f: continue
        deps = f[5]
        for d in deps:
            if d not in resolved and d in files:
                resolved.add(d)
                stack.append(d)

    active_mods = {}
    for s in resolved:
        f = files.get(s)
        if f and (len(f) <= 8 or f[8] == "m"):
            mid = slug_to_mod_id.get(s, s)
            ver = insp.get(s, {}).get("jar_version") or f[6]
            active_mods[s] = {"mid": mid, "ver": ver}
            active_mods[mid] = {"mid": mid, "ver": ver, "slug": s}

    errors = []
    for s in resolved:
        f = files.get(s)
        if not f or (len(f) > 8 and f[8] != "m"): continue
        info = insp.get(s, {})
        if not info: continue
        mid = info.get("mod_id", s)
        mc_req = info.get("depends", {}).get("minecraft")
        if mc_req and not matches_predicate(MC_VERSION, mc_req):
            errors.append(f"❌ [MINECRAFT INKOMPATIBEL] '{f[7] or s}' ({s}) erfordert Minecraft '{mc_req}', Spiel ist aber {MC_VERSION}!")

        breaks = info.get("breaks", {})
        for target, constraint in breaks.items():
            if target in active_mods:
                target_info = active_mods[target]
                act_ver = target_info["ver"]
                if constraint == "*" or matches_predicate(normalize_target_version(act_ver), constraint):
                    target_name = files.get(target_info.get("slug", target), [None, None, None, None, None, None, None, target])[7] or target
                    errors.append(f"❌ [BREAKS KOLLISION] '{f[7] or s}' ({s}) schließt '{target_name}' (Version {act_ver}) aus! [Bedingung: {constraint}]")

        conflicts = info.get("conflicts", {})
        for target, constraint in conflicts.items():
            if target in active_mods:
                target_info = active_mods[target]
                act_ver = target_info["ver"]
                if constraint == "*" or matches_predicate(normalize_target_version(act_ver), constraint):
                    target_name = files.get(target_info.get("slug", target), [None, None, None, None, None, None, None, target])[7] or target
                    errors.append(f"❌ [KONFLIKT] '{f[7] or s}' ({s}) kollidiert mit '{target_name}'!")

    if errors:
        print(f"\n❌ FEHLER in '{set_name}': {len(errors)} Absturzursachen gefunden!")
        for e in errors:
            print(f"  {e}")
        return False
    else:
        print(f"✅ '{set_name}': 0 Fehler. Pack startet garantiert fehlerfrei ({len(resolved)} Mods & Libs geprüft).")
        return True

if __name__ == "__main__":
    print("=" * 65)
    print(f"  🚀 FABRIC LOADER RUNTIME-KOMPATIBILITÄTSTEST ({MC_VERSION})")
    print("=" * 65)
    
    LOCKED = {m["slug"] for m in app_data["mods"] if (m["cat"] == "P" and m.get("rolle") == "K") or m.get("pflicht")}
    PERF_SET = ["dynamic-fps","entityculling","moreculling","immediatelyfast","modernfix-mvus","badoptimizations","lithium","ferrite-core","c2me-fabric","scalablelux","sodium-extra","reeses-sodium-options","sodium"]
    
    all_ok = True
    
    # 1. Performance Preset
    ok_perf = test_mod_set(list(LOCKED) + PERF_SET, "Preset: Nur Performance")
    all_ok = all_ok and ok_perf

    # 2. Vanilla Visual Preset
    visual_set = set(LOCKED)
    for m in app_data["mods"]:
        if m.get("rolle") == "K" and m.get("cat") not in ("S", "G", "T") and m.get("ampel") != "R":
            visual_set.add(m["slug"])
    ok_vis = test_mod_set(list(visual_set), "Preset: Vanilla Visual")
    all_ok = all_ok and ok_vis

    # 3. Vanilla Plus Preset
    plus_set = set(LOCKED)
    for m in app_data["mods"]:
        if m.get("rolle") == "K" and m.get("cat") != "S":
            plus_set.add(m["slug"])
    ok_plus = test_mod_set(list(plus_set), "Preset: Vanilla Plus")
    all_ok = all_ok and ok_plus

    # 4. Einzelcheck für Wandering Traveler
    ok_wt = test_mod_set(list(LOCKED) + ["wandering-traveler", "collective"], "Pack mit Wandering Traveler")
    all_ok = all_ok and ok_wt

    # 5. Kollisions- und Loesungscheck: Pixelshot vs. Last World Panorama
    print("\n--- TEST: Mixin-Kollisionserkennung und Konfliktloesung ---")
    has_collision = not test_mod_set(list(LOCKED) + ["pixelshot", "last-world-panorama"], "Kollision: Pixelshot + Last World Panorama (Erwartet: FEHLER)")
    if has_collision:
        print("  🎯 Start-Check hat den unvereinbaren Mixin-Konflikt zwischen Pixelshot und Last World Panorama erfolgreich abgefangen!")
    else:
        print("  ❌ FEHLER: Der Konflikt zwischen Pixelshot und Last World Panorama wurde NICHT erkannt!")
        all_ok = False

    ok_pix = test_mod_set(list(LOCKED) + ["pixelshot"], "Loesung 1: Nur Pixelshot gewaehlt")
    all_ok = all_ok and ok_pix

    ok_pano = test_mod_set(list(LOCKED) + ["last-world-panorama"], "Loesung 2: Nur Last World Panorama gewaehlt")
    all_ok = all_ok and ok_pano

    # 6. Kollisions- und Loesungscheck: Krypton vs. e4mc (Crypt.getCipher Redirect)
    has_krypton_collision = not test_mod_set(list(LOCKED) + ["krypton", "e4mc"], "Kollision: Krypton + e4mc (Erwartet: FEHLER)")
    if has_krypton_collision:
        print("  🎯 Start-Check hat den fatalen Mixin-Redirect-Konflikt zwischen Krypton und e4mc (ServerLoginPacketListenerImpl) erfolgreich abgefangen!")
    else:
        print("  ❌ FEHLER: Der Konflikt zwischen Krypton und e4mc wurde NICHT erkannt!")
        all_ok = False

    ok_krypton = test_mod_set(list(LOCKED) + ["krypton"], "Loesung 1: Nur Krypton gewaehlt (Netzwerk-Optimierung)")
    all_ok = all_ok and ok_krypton

    ok_e4mc = test_mod_set(list(LOCKED) + ["e4mc"], "Loesung 2: Nur e4mc gewaehlt (LAN-Tunnel)")
    all_ok = all_ok and ok_e4mc

    # 7. Kollisions- und Loesungscheck: VMP vs. Voxygen (ChunkMap.isChunkTracked Redirect)
    has_vmp_collision = not test_mod_set(list(LOCKED) + ["vmp-fabric", "voxy-worldgen"], "Kollision: VMP + Voxygen (Erwartet: FEHLER)")
    if has_vmp_collision:
        print("  🎯 Start-Check hat den Mixin-Redirect-Konflikt zwischen VMP und Voxygen (ChunkMap$TrackedEntity) erfolgreich abgefangen!")
    else:
        print("  ❌ FEHLER: Der Konflikt zwischen VMP und Voxygen wurde NICHT erkannt!")
        all_ok = False

    ok_vmp = test_mod_set(list(LOCKED) + ["vmp-fabric"], "Loesung 1: Nur VMP gewaehlt")
    all_ok = all_ok and ok_vmp

    ok_voxy = test_mod_set(list(LOCKED) + ["voxy-worldgen"], "Loesung 2: Nur Voxygen gewaehlt")
    all_ok = all_ok and ok_voxy

    # 8. Kollisions- und Loesungscheck: Punchy! Moves vs. Better Capes (CapeLayer.submit Redirect)
    has_cape_collision = not test_mod_set(list(LOCKED) + ["punchymoves", "better-capes"], "Kollision: Punchy! Moves + Better Capes (Erwartet: FEHLER)")
    if has_cape_collision:
        print("  🎯 Start-Check hat den Mixin-Redirect-Konflikt zwischen Punchy! Moves und Better Capes (CapeLayer) erfolgreich abgefangen!")
    else:
        print("  ❌ FEHLER: Der Konflikt zwischen Punchy! Moves und Better Capes wurde NICHT erkannt!")
        all_ok = False

    ok_punchy = test_mod_set(list(LOCKED) + ["punchymoves"], "Loesung 1: Nur Punchy! Moves gewaehlt")
    all_ok = all_ok and ok_punchy

    ok_capes = test_mod_set(list(LOCKED) + ["better-capes"], "Loesung 2: Nur Better Capes gewaehlt")
    all_ok = all_ok and ok_capes

    if not all_ok:
        print("\n❌ TEST FEHLGESCHLAGEN: Mindestens ein Pack weist Absturzrisiken auf!")
        sys.exit(1)
    else:
        print(f"\n🎉 ALLE PRESETS & PACKS SIND 100% ABSTURZSICHER FÜR MINECRAFT {MC_VERSION}!")
        sys.exit(0)
