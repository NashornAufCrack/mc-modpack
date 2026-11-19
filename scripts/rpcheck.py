# Resource Packs: pack.mcmeta jeder Datei prüfen, ob sie 26.3 (Pack-Format 97.1) wirklich unterstützt.
# Ergebnis data/rp-check.json {slug: {sha1, ok, grund}}; die Website blendet nicht passende Packs aus (app-data.x.rpbad).
import json, io, math, zipfile, urllib.request, re


def parse_fmt(v, is_max=False):
    """Parse pack format (int, float, string, or [major, minor] list) into a comparable (major, minor) tuple."""
    if v is None or isinstance(v, bool):
        return (0, 0)
    if isinstance(v, (list, tuple)):
        if not v:
            return (0, 0)
        try:
            maj = int(v[0])
        except (TypeError, ValueError):
            return (0, 0)
        if len(v) > 1 and v[1] is not None:
            try:
                min_v = int(v[1])
            except (TypeError, ValueError):
                min_v = 999999 if is_max else 0
        else:
            min_v = 999999 if is_max else 0
        return (maj, min_v)
    if isinstance(v, int):
        return (v, 999999 if is_max else 0)
    if isinstance(v, float):
        if not math.isfinite(v):
            return (0, 0)
        if v.is_integer():
            return (int(v), 999999 if is_max else 0)
        s = str(v)
        if "." in s:
            maj_s, min_s = s.split(".", 1)
            if maj_s.isdigit() and min_s.isdigit():
                return (int(maj_s), int(min_s))
        return (int(v), 0)
    if isinstance(v, str):  # z. B. "97.1.x" in manchen pack.mcmeta
        m = re.match(r"(\d+)(?:\.(\d+))?", v.strip())
        if m:
            maj = int(m.group(1))
            min_v = int(m.group(2)) if m.group(2) is not None else (999999 if is_max else 0)
            return (maj, min_v)
        return (0, 0)
    return (0, 0)


def fmt_str(t):
    return str(t[0]) if t[1] >= 999999 else f"{t[0]}.{t[1]}"


def _section_range(p):
    if not isinstance(p, dict):
        return (0, 0), (0, 0)
    min_fmt = p.get("min_format")
    max_fmt = p.get("max_format")
    pf = p.get("pack_format")
    if min_fmt is not None or max_fmt is not None:
        lo_val = min_fmt if min_fmt is not None else (pf if pf is not None else 0)
        hi_val = max_fmt if max_fmt is not None else lo_val
        return parse_fmt(lo_val, is_max=False), parse_fmt(hi_val, is_max=True)
    sf = p.get("supported_formats") if p.get("supported_formats") is not None else p.get("formats")
    if isinstance(sf, list):
        if len(sf) >= 2:
            return parse_fmt(sf[0], is_max=False), parse_fmt(sf[1], is_max=True)
        if len(sf) == 1:
            return parse_fmt(sf[0], is_max=False), parse_fmt(sf[0], is_max=True)
        return (0, 0), (0, 0)
    if isinstance(sf, dict):
        return parse_fmt(sf.get("min_inclusive", 0), is_max=False), parse_fmt(sf.get("max_inclusive", 0), is_max=True)
    if isinstance(sf, (int, float)) and not isinstance(sf, bool):
        return parse_fmt(sf, is_max=False), parse_fmt(sf, is_max=True)
    if pf is not None:
        return parse_fmt(pf, is_max=False), parse_fmt(pf, is_max=True)
    return (0, 0), (0, 0)


def rng(m, include_overlays=True):
    """Return (min_tuple, max_tuple) pack format range from parsed pack.mcmeta, including overlays."""
    lo, hi = _section_range(m.get("pack", {}) if isinstance(m, dict) else {})
    if include_overlays and isinstance(m, dict):
        overlays = m.get("overlays")
        entries = overlays.get("entries", []) if isinstance(overlays, dict) else []
        if isinstance(entries, list):
            for e in entries:
                if not isinstance(e, dict):
                    continue
                sec = (
                    e.get("pack")
                    if isinstance(e.get("pack"), dict)
                    and not any(k in e for k in ("min_format", "max_format", "supported_formats", "formats", "pack_format"))
                    else e
                )
                try:
                    _, h2 = _section_range(sec)
                    if h2 > hi:
                        hi = h2
                except Exception:
                    pass
    return lo, hi


def main():
    with open("config/project.json", encoding="utf-8") as _pf:
        _proj = json.load(_pf)
    FMT = parse_fmt(_proj["rpFormat"], is_max=False)
    MC_VERSION = _proj["minecraftVersion"]
    with open("data/files.json", encoding="utf-8") as _ff:
        files = json.load(_ff)
    with open("data/app-data.json", encoding="utf-8") as _af:
        app = json.load(_af)
    try:
        with open("data/rp-check.json", encoding="utf-8") as _rf:
            old = json.load(_rf)
    except Exception:
        old = {}

    out = {}
    for s, f in files.items():
        if (f[8] if len(f) > 8 else "m") != "r":
            continue
        # gespeichertes Ergebnis wiederverwenden; „nicht prüfbar“ höchstens 3 Läufe lang (vorübergehende Fehler)
        if s in old and old[s].get("sha1") == f[2] and (not old[s].get("grund", "").startswith("nicht prüfbar") or old[s].get("versuche", 1) >= 3):
            out[s] = old[s]
            continue
        try:
            data = urllib.request.urlopen(urllib.request.Request(f[0], headers={"User-Agent": "mc-modpack rpcheck"}), timeout=60).read()
            z = zipfile.ZipFile(io.BytesIO(data))
            name = next(n for n in z.namelist() if n.rsplit("/", 1)[-1] == "pack.mcmeta" and n.count("/") <= 1)
            m = json.loads(re.sub(r"^\ufeff", "", z.read(name).decode("utf-8", "replace")))
            lo, hi = rng(m)
            ok = lo <= FMT <= hi
            out[s] = {"sha1": f[2], "ok": ok, "von": fmt_str(lo), "bis": fmt_str(hi), "grund": "" if ok else f"Pack-Format {fmt_str(lo)}–{fmt_str(hi)}, {MC_VERSION} braucht {fmt_str(FMT)}"}
        except Exception as e:
            n = old.get(s, {}).get("versuche", 0) + 1 if old.get(s, {}).get("sha1") == f[2] else 1
            out[s] = {"sha1": f[2], "ok": True, "grund": "nicht prüfbar: " + str(e)[:80], "versuche": n}
    with open("data/rp-check.json", "w", encoding="utf-8") as _rf:
        json.dump(out, _rf, ensure_ascii=False, indent=0)
    app.setdefault("x", {})["rpbad"] = sorted(s for s, v in out.items() if not v["ok"])
    with open("data/app-data.json", "w", encoding="utf-8") as _af:
        json.dump(app, _af, ensure_ascii=False, separators=(",", ":"))
    bad = app["x"]["rpbad"]
    print(len(out), "Packs geprüft,", len(bad), "veraltet:", ", ".join(bad))


if __name__ == "__main__":
    main()
