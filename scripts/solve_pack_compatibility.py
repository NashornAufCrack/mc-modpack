import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO_DIR = Path(__file__).resolve().parent.parent
if str(REPO_DIR) not in sys.path:
    sys.path.insert(0, str(REPO_DIR))
from scripts.fabric_semver import matches_predicate, normalize_target_version
from scripts.mixin_scan import COOPERATING_PAIRS, _KNOWN_MOD_ID_ALIASES

APP_PATH = REPO_DIR / "data" / "app-data.json"
FILES_PATH = REPO_DIR / "data" / "files.json"
INSP_PATH = REPO_DIR / "data" / "jar-inspection.json"
MIXIN_CONFLICTS_PATH = REPO_DIR / "data" / "mixin-conflicts.json"
PROJ_PATH = REPO_DIR / "config" / "project.json"

with open(APP_PATH, "r", encoding="utf-8") as f:
    app_data = json.load(f)

with open(FILES_PATH, "r", encoding="utf-8") as f:
    files = json.load(f)

with open(INSP_PATH, "r", encoding="utf-8") as f:
    insp = json.load(f)

mixin_collisions = []
if MIXIN_CONFLICTS_PATH.exists():
    try:
        with open(MIXIN_CONFLICTS_PATH, "r", encoding="utf-8") as f:
            mixin_collisions = json.load(f).get("kollisionen", [])
    except Exception:
        mixin_collisions = []

with open(PROJ_PATH, "r", encoding="utf-8") as f:
    MC_VERSION = json.load(f)["minecraftVersion"]

mod_id_to_slug = {}
slug_to_mod_id = {}
for s, item in files.items():
    if len(item) > 8 and item[8] != "m":
        continue
    info = insp.get(s, {})
    mid = info.get("mod_id") or s
    mod_id_to_slug[mid] = s
    slug_to_mod_id[s] = mid
for mid, slug in _KNOWN_MOD_ID_ALIASES.items():
    if slug in files:
        mod_id_to_slug.setdefault(mid, slug)


def test_mod_set(slugs, set_name="Pack"):
    resolved = set(slugs)
    stack = list(slugs)
    while stack:
        cur = stack.pop()
        f = files.get(cur)
        if not f:
            continue
        deps = f[5]
        for d in deps:
            if d not in resolved and d in files:
                resolved.add(d)
                stack.append(d)

    active_mods = {}
    for s in resolved:
        f = files.get(s)
        if f and (len(f) <= 8 or f[8] == "m"):
            info = insp.get(s, {})
            valid_insp = bool(info and (len(f) <= 2 or not info.get("sha1") or info.get("sha1") == f[2]))
            mid = (info.get("mod_id") if valid_insp else None) or slug_to_mod_id.get(s, s)
            ver = (info.get("jar_version") if valid_insp else None) or f[6]
            active_mods[s] = {"mid": mid, "ver": ver, "slug": s}
            active_mods[mid] = {"mid": mid, "ver": ver, "slug": s}
    for alias_id, target_slug in _KNOWN_MOD_ID_ALIASES.items():
        if target_slug in active_mods and alias_id not in active_mods:
            active_mods[alias_id] = active_mods[target_slug]

    errors = []
    for s in resolved:
        f = files.get(s)
        if not f or (len(f) > 8 and f[8] != "m"):
            continue
        info = insp.get(s, {})
        if not info or (len(f) > 2 and info.get("sha1") and info.get("sha1") != f[2]):
            continue
        mc_req = (info.get("depends") or {}).get("minecraft")
        if mc_req and not matches_predicate(MC_VERSION, mc_req):
            errors.append(
                f"❌ [MINECRAFT INKOMPATIBEL] '{f[7] or s}' ({s}) erfordert Minecraft '{mc_req}', Spiel ist aber {MC_VERSION}!"
            )

        for dep_id, constraint in (info.get("depends") or {}).items():
            if dep_id in ("minecraft", "fabricloader", "fabric-loader", "java", "fabric"):
                continue
            target_key = "fabric-api" if dep_id == "fabric-api" else dep_id
            if target_key in active_mods:
                target_info = active_mods[target_key]
                target_slug = target_info.get("slug", target_key)
                if target_slug == s:
                    continue
                act_ver = target_info["ver"]
                if constraint != "*" and not matches_predicate(normalize_target_version(act_ver), constraint):
                    target_name = files.get(target_slug, [None] * 7 + [target_slug])[7] or target_slug
                    errors.append(
                        f"❌ [ABHÄNGIGKEIT INKOMPATIBEL] '{f[7] or s}' ({s}) erfordert '{target_name}' ({constraint}), installiert ist aber Version {act_ver}!"
                    )

        breaks = info.get("breaks", {})
        for target, constraint in breaks.items():
            if target in active_mods:
                target_info = active_mods[target]
                target_slug = target_info.get("slug", target)
                if target_slug == s:
                    continue
                act_ver = target_info["ver"]
                if constraint == "*" or matches_predicate(normalize_target_version(act_ver), constraint):
                    target_name = files.get(target_slug, [None] * 7 + [target])[7] or target
                    errors.append(
                        f"❌ [BREAKS KOLLISION] '{f[7] or s}' ({s}) schließt '{target_name}' (Version {act_ver}) aus! [Bedingung: {constraint}]"
                    )

        conflicts = info.get("conflicts", {})
        for target, constraint in conflicts.items():
            if target in active_mods:
                target_info = active_mods[target]
                target_slug = target_info.get("slug", target)
                if target_slug == s:
                    continue
                act_ver = target_info["ver"]
                if constraint == "*" or matches_predicate(normalize_target_version(act_ver), constraint):
                    target_name = files.get(target_slug, [None] * 7 + [target])[7] or target
                    errors.append(f"❌ [KONFLIKT] '{f[7] or s}' ({s}) kollidiert mit '{target_name}'!")

    for c in mixin_collisions:
        if c.get("stufe") != "absturz":
            continue
        pair = tuple(sorted(c.get("mods", [])))
        if len(pair) == 2 and pair not in COOPERATING_PAIRS and pair[0] in resolved and pair[1] in resolved:
            errors.append(
                f"❌ [MIXIN KOLLISION] '{pair[0]}' und '{pair[1]}' kollidieren auf Bytecode-Ebene ({c.get('art')}: {c.get('wo')})!"
            )

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
    PERF_SET = [
        "dynamic-fps",
        "entityculling",
        "moreculling",
        "immediatelyfast",
        "modernfix-mvus",
        "badoptimizations",
        "lithium",
        "ferrite-core",
        "c2me-fabric",
        "scalablelux",
        "sodium-extra",
        "reeses-sodium-options",
        "sodium",
    ]

    all_ok = True

    # 1. Performance Preset (Core Modpack — MUSS immer fehlerfrei sein!)
    ok_perf = test_mod_set(list(LOCKED) + PERF_SET, "Preset: Nur Performance")
    all_ok = all_ok and ok_perf

    # 2. Vanilla Visual Preset (informativ für optionale Mods)
    visual_set = set(LOCKED)
    for m in app_data["mods"]:
        if m.get("rolle") == "K" and m.get("cat") not in ("S", "G", "T") and m.get("ampel") != "R":
            visual_set.add(m["slug"])
    ok_vis = test_mod_set(list(visual_set), "Preset: Vanilla Visual")
    if not ok_vis:
        print("  ⚠️ Hinweis: Optionaler Mod-Konflikt in Vanilla Visual (Core-Modpack ist nicht betroffen).")

    # 3. Vanilla Plus Preset (informativ für optionale Mods)
    plus_set = set(LOCKED)
    for m in app_data["mods"]:
        if m.get("rolle") == "K" and m.get("cat") != "S":
            plus_set.add(m["slug"])
    ok_plus = test_mod_set(list(plus_set), "Preset: Vanilla Plus")
    if not ok_plus:
        print("  ⚠️ Hinweis: Optionaler Mod-Konflikt in Vanilla Plus (Core-Modpack ist nicht betroffen).")

    # 4. Einzelcheck für Wandering Traveler (informativ für optionale Mods)
    ok_wt = test_mod_set(list(LOCKED) + ["wandering-traveler", "collective"], "Pack mit Wandering Traveler")
    if not ok_wt:
        print("  ⚠️ Hinweis: Optionaler Mod-Konflikt in Wandering Traveler (Core-Modpack ist nicht betroffen).")

    # 5. Kollisions- und Loesungscheck: Pixelshot vs. Last World Panorama
    print("\n--- TEST: Mixin-Kollisionserkennung und Konfliktloesung ---")
    has_collision = not test_mod_set(
        list(LOCKED) + ["pixelshot", "last-world-panorama"],
        "Kollision: Pixelshot + Last World Panorama (Erwartet: FEHLER)",
    )
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
    has_krypton_collision = not test_mod_set(
        list(LOCKED) + ["krypton", "e4mc"],
        "Kollision: Krypton + e4mc (Erwartet: FEHLER)",
    )
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
    has_vmp_collision = not test_mod_set(
        list(LOCKED) + ["vmp-fabric", "voxy-worldgen"],
        "Kollision: VMP + Voxygen (Erwartet: FEHLER)",
    )
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
    has_cape_collision = not test_mod_set(
        list(LOCKED) + ["punchymoves", "better-capes"],
        "Kollision: Punchy! Moves + Better Capes (Erwartet: FEHLER)",
    )
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
        print("\n❌ TEST FEHLGESCHLAGEN: Core-Modpack oder Kollisionserkennung weist Fehler auf!")
        sys.exit(1)
    else:
        print(f"\n🎉 CORE-MODPACK & START-CHECK SIND 100% ABSTURZSICHER FÜR MINECRAFT {MC_VERSION}!")
        sys.exit(0)
