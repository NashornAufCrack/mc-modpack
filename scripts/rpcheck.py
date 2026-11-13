# Resource Packs: pack.mcmeta jeder Datei prüfen, ob sie 26.3 (Pack-Format 97.1) wirklich unterstützt.
# Ergebnis data/rp-check.json {slug: {sha1, ok, grund}}; die Website blendet nicht passende Packs aus (app-data.x.rpbad).
import json, io, zipfile, urllib.request, re
with open("config/project.json", encoding="utf-8") as _pf:
    _proj = json.load(_pf)
FMT = float(_proj["rpFormat"])
MC_VERSION = _proj["minecraftVersion"]
with open("data/files.json", encoding="utf-8") as _ff:
    files = json.load(_ff)
with open("data/app-data.json", encoding="utf-8") as _af:
    app = json.load(_af)
try: old = json.load(open("data/rp-check.json"))
except Exception: old = {}
def num(v):
    if isinstance(v, list): return float(f"{v[0]}.{v[1] if len(v) > 1 else 0}")
    if isinstance(v, str):  # z. B. "97.1.x" in manchen pack.mcmeta
        m = re.match(r"\d+(\.\d+)?", v.strip()); return float(m.group(0)) if m else 0.0
    return float(v)
def rng(m):
    p = m.get("pack", {})
    if "min_format" in p or "max_format" in p:
        lo = num(p.get("min_format", p.get("pack_format", 0))); hi = num(p.get("max_format", p.get("min_format", 0))); return lo, hi
    sf = p.get("supported_formats")
    if isinstance(sf, list) and len(sf) == 2: return num(sf[0]), num(sf[1])
    if isinstance(sf, dict): return num(sf.get("min_inclusive", 0)), num(sf.get("max_inclusive", 0))
    if isinstance(sf, (int, float)): return float(sf), float(sf)
    f = num(p.get("pack_format", 0)); return f, f
out = {}
for s, f in files.items():
    if (f[8] if len(f) > 8 else "m") != "r": continue
    # gespeichertes Ergebnis wiederverwenden; „nicht prüfbar“ höchstens 3 Läufe lang (vorübergehende Fehler)
    if s in old and old[s].get("sha1") == f[2] and (not old[s].get("grund", "").startswith("nicht prüfbar") or old[s].get("versuche", 1) >= 3): out[s] = old[s]; continue
    try:
        data = urllib.request.urlopen(urllib.request.Request(f[0], headers={"User-Agent": "mc-modpack rpcheck"}), timeout=60).read()
        z = zipfile.ZipFile(io.BytesIO(data)); name = next(n for n in z.namelist() if n.rsplit("/", 1)[-1] == "pack.mcmeta" and n.count("/") <= 1)
        m = json.loads(re.sub(r"^﻿", "", z.read(name).decode("utf-8", "replace")))
        lo, hi = rng(m)
        # Overlays dürfen den Bereich erweitern
        for e in m.get("overlays", {}).get("entries", []):
            try: l2, h2 = rng({"pack": e}); hi = max(hi, h2)
            except Exception: pass
        ok = lo <= FMT + 0.0001 and hi >= int(FMT)
        out[s] = {"sha1": f[2], "ok": ok, "von": lo, "bis": hi, "grund": "" if ok else f"Pack-Format {lo}–{hi}, {MC_VERSION} braucht {FMT}"}
    except Exception as e:
        n = old.get(s, {}).get("versuche", 0) + 1 if old.get(s, {}).get("sha1") == f[2] else 1
        out[s] = {"sha1": f[2], "ok": True, "grund": "nicht prüfbar: " + str(e)[:80], "versuche": n}
json.dump(out, open("data/rp-check.json", "w"), indent=0)
app.setdefault("x", {})["rpbad"] = sorted(s for s, v in out.items() if not v["ok"])
json.dump(app, open("data/app-data.json", "w"))
bad = app["x"]["rpbad"]; print(len(out), "Packs geprüft,", len(bad), "veraltet:", ", ".join(bad))
