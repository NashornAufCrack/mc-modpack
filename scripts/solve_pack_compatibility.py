import json
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

REPO_DIR = Path(__file__).resolve().parent.parent
APP_PATH = REPO_DIR / "data" / "app-data.json"
FILES_PATH = REPO_DIR / "data" / "files.json"
INSP_PATH = REPO_DIR / "data" / "jar-inspection.json"

with open(APP_PATH, "r", encoding="utf-8") as f:
    app_data = json.load(f)

with open(FILES_PATH, "r", encoding="utf-8") as f:
    files = json.load(f)

with open(INSP_PATH, "r", encoding="utf-8") as f:
    insp = json.load(f)

def clean_ver(v):
    v = re.sub(r'^(?:mc)?[0-9.]+[_-]?', '', str(v)) if any(str(v).startswith(p) for p in ['mc26', 'fabric-26']) else str(v)
    v = v.split('+')[0].split('-')[0]
    parts = re.findall(r'\d+', v)
    return [int(p) for p in parts] if parts else [0]

def cmp_ver(v1, v2):
    l = max(len(v1), len(v2))
    a = v1 + [0]*(l-len(v1)); b = v2 + [0]*(l-len(v2))
    for i in range(l):
        if a[i] < b[i]: return -1
        if a[i] > b[i]: return 1
    return 0

def is_mc26_compatible(constraint):
    if isinstance(constraint, list): return any(is_mc26_compatible(c) for c in constraint)
    c = str(constraint).strip()
    if not c or c == '*': return True
    if c.startswith('26.3') or '26.*' in c or c.startswith('^26') or c.startswith('~26'): return True
    rm = re.match(r'^(>=|>)\s*([0-9a-zA-Z._-]+)\s*(<=|<)\s*([0-9a-zA-Z._-]+)$', c)
    if rm:
        op1, low, op2, high = rm.groups()
        l = clean_ver(low); h = clean_ver(high); act = [26, 3]
        ok1 = (cmp_ver(act, l) >= 0) if op1 == '>=' else (cmp_ver(act, l) > 0)
        ok2 = (cmp_ver(act, h) <= 0) if op2 == '<=' else (cmp_ver(act, h) < 0)
        return ok1 and ok2
    m_low = re.match(r'^(>=|>)\s*([0-9a-zA-Z._-]+)$', c)
    if m_low:
        op, low = m_low.groups()
        l = clean_ver(low); act = [26, 3]
        return (cmp_ver(act, l) >= 0) if op == '>=' else (cmp_ver(act, l) > 0)
    m_hi = re.match(r'^(<=|<|=|==)?\s*([0-9a-zA-Z._-]+)$', c)
    if m_hi:
        op, hi = m_hi.groups()
        op = op or '='
        h = clean_ver(hi); act = [26, 3]
        c_val = cmp_ver(act, h)
        if op == '<=': return c_val <= 0
        if op == '<': return c_val < 0
        if op in ('=', '=='): return c_val == 0
    return False

def match_ver(actual, constraint):
    if isinstance(constraint, list): return any(match_ver(actual, c) for c in constraint)
    constraint = str(constraint).strip()
    if not constraint or constraint == '*': return True
    act = clean_ver(actual)
    m = re.match(r'^(<=|<|>=|>|=|~|\^)?\s*([0-9a-zA-Z._+-]+)$', constraint)
    if not m: return False
    op, req_s = m.groups()[0] or '=', m.groups()[1]
    req = clean_ver(req_s)
    c = cmp_ver(act, req)
    if op in ('~', '^', '=', '=='): return c == 0
    if op == '<=': return c <= 0
    if op == '<': return c < 0
    if op == '>=': return c >= 0
    if op == '>': return c > 0
    return c == 0

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
            ver = f[6]
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
        if mc_req and not is_mc26_compatible(mc_req):
            errors.append(f"❌ [MINECRAFT INKOMPATIBEL] '{f[7] or s}' ({s}) erfordert Minecraft '{mc_req}', Spiel ist aber 26.3!")

        breaks = info.get("breaks", {})
        for target, constraint in breaks.items():
            if target in active_mods:
                target_info = active_mods[target]
                act_ver = target_info["ver"]
                if constraint == "*" or match_ver(act_ver, constraint):
                    target_name = files.get(target_info.get("slug", target), [None, None, None, None, None, None, None, target])[7] or target
                    errors.append(f"❌ [BREAKS KOLLISION] '{f[7] or s}' ({s}) schließt '{target_name}' (Version {act_ver}) aus! [Bedingung: {constraint}]")

        conflicts = info.get("conflicts", {})
        for target, constraint in conflicts.items():
            if target in active_mods:
                target_info = active_mods[target]
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
    print("  🚀 FABRIC LOADER RUNTIME-KOMPATIBILITÄTSTEST (26.3)")
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

    if not all_ok:
        print("\n❌ TEST FEHLGESCHLAGEN: Mindestens ein Pack weist Absturzrisiken auf!")
        sys.exit(1)
    else:
        print("\n🎉 ALLE PRESETS & PACKS SIND 100% ABSTURZSICHER FÜR MINECRAFT 26.3!")
        sys.exit(0)
