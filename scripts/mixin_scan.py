#!/usr/bin/env python3
"""
Mixin-Kollisionsscan auf Bytecode-Ebene (findet Abstürze, die in keiner fabric.mod.json stehen).

Liest aus jeder Mod-JAR die Mixin-Konfigurationen und die Annotationen der Mixin-Klassen und erkennt:
  * redirect  – zwei verschiedene Mods setzen @Redirect auf denselben Methodenaufruf (z. B. Krypton + e4mc)
  * overwrite – zwei verschiedene Mods ersetzen dieselbe Methode komplett (@Overwrite)

Ausgeschlossen werden:
  * Geshadete Bibliotheken (gleicher Mixin-Klassenpfad in mehreren JARs wie fabric-api / mixinextras)
  * Durch Mod-Optionen deaktivierte Mixins (z. B. "lithium:options" in fabric.mod.json)
  * Bekannte kooperierende Kern-Mods mit Mixin-Plugins (z. B. Lithium + FerriteCore)

Aufrufe (im Repo-Ordner):
  python3 scripts/mixin_scan.py index            Index data/mixin-index.json für alle Mods aktualisieren
  python3 scripts/mixin_scan.py report [--ci]    Alle Kollisionen im Katalog; --ci: Exit 1, wenn eine
                                                 Absturz-Kollision nicht als Konflikt (art K) eingetragen ist
  python3 scripts/mixin_scan.py guard            Nach dem Update-Check: Updates, die eine NEUE Absturz-Kollision
                                                 erzeugen, werden einzeln zurückgehalten (Vergleich mit git HEAD)
  python3 scripts/mixin_scan.py local <ordner>   Einen lokalen mods-Ordner prüfen (z. B. eine Modrinth-Instanz)
"""
import io, json, os, struct, subprocess, sys, urllib.request, zipfile
from collections import defaultdict
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)

REPO = Path(__file__).resolve().parent.parent
INDEX_PATH = REPO / "data" / "mixin-index.json"
UA = {"User-Agent": "NashornAufCrack/mc-modpack mixin-scan (github.com/NashornAufCrack/mc-modpack)"}
INDEX_VERSION = 3

MIXIN = "Lorg/spongepowered/asm/mixin/Mixin;"
OVERWRITE = "Lorg/spongepowered/asm/mixin/Overwrite;"
REDIRECT = "Lorg/spongepowered/asm/mixin/injection/Redirect;"

COOPERATING_PAIRS = {
    tuple(sorted(("ferrite-core", "lithium"))),
    tuple(sorted(("lithium", "modernfix-mvus"))),
    tuple(sorted(("sodium", "iris"))),
    tuple(sorted(("sodium", "sodium-extra"))),
    tuple(sorted(("lithium", "slabbed"))),
}


# ---------------------------------------------------------------- Class-Datei lesen
class ClassFile:
    def __init__(self, data: bytes):
        self.d, self.p, self.cp = data, 0, [None]
        if self.u4() != 0xCAFEBABE:
            raise ValueError("keine Class-Datei")
        self.u2(); self.u2()
        n = self.u2(); i = 1
        while i < n:
            t = self.u1()
            if t == 1:
                ln = self.u2(); self.cp.append(("utf8", self.d[self.p:self.p + ln].decode("utf-8", "replace"))); self.p += ln
            elif t == 3:
                self.cp.append(("int", struct.unpack_from(">i", self.d, self.p)[0])); self.p += 4
            elif t == 4:
                self.cp.append(("float", None)); self.p += 4
            elif t in (5, 6):
                self.cp.append(("wide", None)); self.cp.append(None); self.p += 8; i += 1
            elif t in (7, 8, 16, 19, 20):
                self.cp.append(("ref", t, self.u2()))
            elif t in (9, 10, 11, 12, 17, 18):
                self.cp.append(("ref2", t, self.u2(), self.u2()))
            elif t == 15:
                self.p += 3; self.cp.append(("mh", None))
            else:
                raise ValueError(f"unbekannter Konstanten-Typ {t}")
            i += 1

    def u1(self):
        v = self.d[self.p]; self.p += 1; return v

    def u2(self):
        v = struct.unpack_from(">H", self.d, self.p)[0]; self.p += 2; return v

    def u4(self):
        v = struct.unpack_from(">I", self.d, self.p)[0]; self.p += 4; return v

    def s(self, i):
        e = self.cp[i] if 0 < i < len(self.cp) else None
        if not e: return None
        if e[0] == "utf8": return e[1]
        if e[0] == "int": return e[1]
        if e[0] == "ref": return self.s(e[2])
        return None

    def value(self):
        t = chr(self.u1())
        if t in "BCDFIJSZs": return self.s(self.u2())
        if t == "e": self.u2(); return self.s(self.u2())
        if t == "c": return self.s(self.u2())
        if t == "@": return self.anno()
        if t == "[": return [self.value() for _ in range(self.u2())]
        raise ValueError("unbekannter Annotationswert " + t)

    def anno(self):
        typ = self.s(self.u2()); vals = {}
        for _ in range(self.u2()):
            k = self.s(self.u2()); vals[k] = self.value()
        return {"type": typ, "v": vals}

    def attrs(self):
        out = []
        for _ in range(self.u2()):
            name = self.s(self.u2()); ln = self.u4(); end = self.p + ln
            if name in ("RuntimeVisibleAnnotations", "RuntimeInvisibleAnnotations"):
                out += [self.anno() for _ in range(self.u2())]
            self.p = end
        return out

    def parse(self):
        self.u2(); self.u2(); self.u2()
        n_if = self.u2(); self.p += 2 * n_if
        for _ in range(self.u2()):
            self.p += 6; self.attrs()
        methods = []
        for _ in range(self.u2()):
            self.u2(); name = self.s(self.u2()); desc = self.s(self.u2())
            methods.append((name, desc, self.attrs()))
        return self.attrs(), methods


def as_list(x):
    if x is None: return []
    return x if isinstance(x, list) else [x]


def norm_cls(c):
    c = str(c).strip()
    if c.startswith("L") and c.endswith(";"): c = c[1:-1]
    return c.replace(".", "/")


def norm_method(m):
    """'Lnet/x/Y;foo(I)V' / 'foo(I)V' / 'foo' -> ('foo', '(I)V' oder '')"""
    m = str(m).strip()
    if m.startswith("L") and ";" in m and ("(" not in m or m.index(";") < m.index("(")):
        m = m.split(";", 1)[1]
    if "(" in m:
        i = m.index("("); return m[:i], m[i:]
    return m, ""


# ---------------------------------------------------------------- JAR auswerten
def scan_jar(data: bytes):
    """-> {'id', 'disabled_mixins': [...], 'redirects': [[cls, meth, desc, target, req, cpath]], 'overwrites': [[cls, name, desc, cpath]]}"""
    res = {"id": None, "disabled_mixins": [], "redirects": [], "overwrites": []}
    try:
        z = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:
        return res
    names = set(z.namelist())
    fmj = {}
    if "fabric.mod.json" in names:
        try:
            fmj = json.loads(z.read("fabric.mod.json").decode("utf-8", "replace"), strict=False)
        except Exception:
            fmj = {}
    res["id"] = fmj.get("id")

    custom = fmj.get("custom") or {}
    for k, v in custom.items():
        if isinstance(v, dict):
            for opt_k, opt_v in v.items():
                if opt_v is False:
                    clean_opt = opt_k.replace("mixin.", "").replace(".", "/")
                    res["disabled_mixins"].append(clean_opt)

    configs = [c if isinstance(c, str) else c.get("config") for c in as_list(fmj.get("mixins"))]
    for cfg_name in filter(None, configs):
        if cfg_name not in names: continue
        try:
            cfg = json.loads(z.read(cfg_name).decode("utf-8", "replace"), strict=False)
        except Exception:
            continue
        pkg = (cfg.get("package") or "").replace(".", "/")
        default_req = int((cfg.get("injectors") or {}).get("defaultRequire", 0) or 0)
        for cls in as_list(cfg.get("mixins")) + as_list(cfg.get("client")) + as_list(cfg.get("server")):
            c_clean = str(cls).replace(".", "/")
            path = f"{pkg}/{c_clean}.class" if pkg else f"{c_clean}.class"
            if path not in names: continue
            try:
                cf = ClassFile(z.read(path)); cannos, methods = cf.parse()
            except Exception:
                continue
            targets = []
            for a in cannos:
                if a["type"] == MIXIN:
                    targets += [norm_cls(x) for x in as_list(a["v"].get("value")) + as_list(a["v"].get("targets")) if x]
            if not targets: continue
            for mname, mdesc, annos in methods:
                for a in annos:
                    t = a["type"] or ""
                    if t == OVERWRITE:
                        for tc in targets:
                            res["overwrites"].append([tc, mname, mdesc, path])
                    elif t == REDIRECT:
                        at = as_list(a["v"].get("at"))
                        tgt = ""
                        if at and isinstance(at[0], dict):
                            tgt = str(at[0]["v"].get("target") or "")
                        if not tgt: continue
                        req = a["v"].get("require")
                        req = default_req if req is None else int(req)
                        for spec in as_list(a["v"].get("method")):
                            n, d = norm_method(spec)
                            for tc in targets:
                                res["redirects"].append([tc, n, d, tgt, req, path])

    for k in ("redirects", "overwrites"):
        res[k] = [list(x) for x in sorted({tuple(x) for x in res[k]})]
    return res


# ---------------------------------------------------------------- Kollisionen
def same_desc(a, b):
    return not a or not b or a == b


def is_mixin_disabled(cpath, disabled_list):
    for dis in disabled_list:
        if dis in cpath:
            return True
    return False


def collisions(index: dict, only=None):
    """index: slug -> scan; only: optional Menge von Slugs. -> Liste von fatalen Kollisionen."""
    slugs = [s for s in index if only is None or s in only]
    red = defaultdict(list)
    ow = defaultdict(list)
    
    all_disabled = []
    for s in slugs:
        all_disabled.extend(index[s].get("disabled_mixins", []))

    for s in slugs:
        e = index[s]
        for item in e.get("redirects", []):
            if len(item) == 6:
                cls, n, d, tgt, req, cpath = item
            else:
                cls, n, d, tgt, req = item[:5]; cpath = ""
            if is_mixin_disabled(cpath, all_disabled): continue
            red[(cls, n, tgt)].append((s, d, req, cpath))

        for item in e.get("overwrites", []):
            if len(item) == 4:
                cls, n, d, cpath = item
            else:
                cls, n, d = item[:3]; cpath = ""
            if is_mixin_disabled(cpath, all_disabled): continue
            ow[(cls, n)].append((s, d, cpath))

    out = {}

    def add(a, b, art, stufe, wo):
        if a == b: return
        k = tuple(sorted((a, b)))
        prev = out.get(k)
        if prev and (prev["stufe"] == "absturz" or stufe != "absturz"): return
        out[k] = {"mods": list(k), "art": art, "stufe": stufe, "wo": wo}

    # 1. Fataler Redirect-Konflikt: zwei verschiedene Mods auf denselben Aufruf
    for (cls, n, tgt), lst in red.items():
        for i in range(len(lst)):
            for j in range(i + 1, len(lst)):
                (a, da, ra, pa), (b, db, rb, pb) = lst[i], lst[j]
                if a == b or pa == pb or not same_desc(da, db): continue
                stufe = "absturz" if max(ra, rb) >= 1 else "warnung"
                add(a, b, "redirect", stufe,
                    f"{cls.split('/')[-1]}.{n} → {tgt.split(';')[-1] if tgt else '?'}")

    # 2. Fataler Overwrite-Konflikt: zwei verschiedene Mods überschreiben dieselbe Methode
    for (cls, n), lst in ow.items():
        for i in range(len(lst)):
            for j in range(i + 1, len(lst)):
                (a, da, pa), (b, db, pb) = lst[i], lst[j]
                if a == b or pa == pb or not same_desc(da, db): continue
                add(a, b, "overwrite", "absturz",
                    f"{cls.split('/')[-1]}.{n} (beide definieren @Overwrite)")

    return list(out.values())


# ---------------------------------------------------------------- Daten
def load(p, default=None):
    p = REPO / p
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default


def save(p, obj, compact=True):
    (REPO / p).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")) if compact else json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def mod_files(files):
    return {s: f for s, f in files.items() if (f[8] if len(f) > 8 else "m") == "m"}


def fetch(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                return r.read()
        except Exception:
            if attempt == 2: raise


def update_index(files, index):
    todo = [(s, f) for s, f in mod_files(files).items() if index.get(s, {}).get("sha1") != f[2]]
    print(f"Mixin-Index: {len(todo)} JARs neu zu prüfen (von {len(mod_files(files))}).")
    from concurrent.futures import ThreadPoolExecutor

    def work(item):
        s, f = item
        try:
            r = scan_jar(fetch(f[0])); r["sha1"] = f[2]; return s, r
        except Exception as e:
            print(f"  ! {s}: {e}"); return s, None

    with ThreadPoolExecutor(8) as ex:
        for n, (s, r) in enumerate(ex.map(work, todo), 1):
            if r: index[s] = r
            if n % 50 == 0: print(f"  {n}/{len(todo)}")
    for s in list(index):
        if s.startswith("_"): continue
        if s not in files: del index[s]
    index["_v"] = INDEX_VERSION
    return index


def registered_pairs(app):
    out = set(COOPERATING_PAIRS)
    for b in app["dec"]["beziehungen"]:
        if not b.get("erledigt"):
            ms = b["mods"]
            for i in range(len(ms)):
                for j in range(i + 1, len(ms)):
                    out.add(tuple(sorted((ms[i], ms[j]))))
    for g in app["dec"].get("gruppen", []):
        ms = g.get("mods", [])
        for i in range(len(ms)):
            for j in range(i + 1, len(ms)):
                out.add(tuple(sorted((ms[i], ms[j]))))
    return out


def locked(app):
    return {m["slug"] for m in app["mods"] if (m["cat"] == "P" and m.get("rolle") == "K") or m.get("pflicht")}


# ---------------------------------------------------------------- Befehle
def cmd_index():
    files = load("data/files.json")
    index = load("data/mixin-index.json", {}) or {}
    if index.get("_v") != INDEX_VERSION: index = {}
    save("data/mixin-index.json", update_index(files, index))
    print("data/mixin-index.json gespeichert.")


def cmd_report(ci):
    app = load("data/app-data.json"); index = load("data/mixin-index.json", {})
    idx = {s: e for s, e in index.items() if not s.startswith("_")}
    cols = collisions(idx)
    reg = registered_pairs(app); L = locked(app)
    crash = [c for c in cols if c["stufe"] == "absturz"]
    open_ = [c for c in crash if tuple(c["mods"]) not in reg]
    print(f"Mixin-Kollisionen im Katalog: {len(crash)} Absturz, {len(cols) - len(crash)} Warnung; "
          f"{len(open_)} Absturz-Kollisionen noch nicht als Konflikt eingetragen.")
    for c in sorted(cols, key=lambda c: (c["stufe"] != "absturz", c["mods"])):
        flag = "EINGETRAGEN" if tuple(c["mods"]) in reg else ("OFFEN" if c["stufe"] == "absturz" else "info")
        lk = " [PFLICHT: " + ", ".join(m for m in c["mods"] if m in L) + "]" if any(m in L for m in c["mods"]) else ""
        print(f"  [{c['stufe']}] [{flag}] {c['mods'][0]} + {c['mods'][1]} ({c['art']}: {c['wo']}){lk}")
    save("data/mixin-conflicts.json", {"kollisionen": cols}, compact=False)
    both_locked = [c for c in crash if all(m in L for m in c["mods"]) and tuple(sorted(c["mods"])) not in COOPERATING_PAIRS]
    if ci and (open_ or both_locked):
        if both_locked: print("FEHLER: Absturz-Kollision innerhalb des Pflichtpakets!")
        sys.exit(1)


def git_show(path):
    try:
        return json.loads(subprocess.run(["git", "show", f"HEAD:{path}"], cwd=REPO, capture_output=True, check=True).stdout.decode("utf-8"))
    except Exception:
        return None


def cmd_guard():
    """Läuft nach check-updates.mjs. Hält Updates einzeln zurück, die eine neue Absturz-Kollision erzeugen."""
    files = load("data/files.json"); old_files = git_show("data/files.json")
    app = load("data/app-data.json"); old_app = git_show("data/app-data.json") or app
    if old_files is None:
        print("Kein git-Stand zum Vergleichen – übersprungen."); return
    index = load("data/mixin-index.json", {}) or {}
    if index.get("_v") != INDEX_VERSION: index = {}
    old_index = {s: dict(e) for s, e in index.items() if not s.startswith("_")}
    index = update_index(files, index)
    changed = [s for s in mod_files(files) if s in old_files and old_files[s][2] != files[s][2]]
    added = [s for s in mod_files(files) if s not in old_files]
    reg = registered_pairs(old_app)
    idx = {s: e for s, e in index.items() if not s.startswith("_")}

    def crash_pairs(ix):
        return {tuple(c["mods"]): c for c in collisions(ix) if c["stufe"] == "absturz"}

    before_ix = dict(idx)
    for s in changed:
        if s in old_index and old_index[s].get("sha1") == old_files[s][2]: before_ix[s] = old_index[s]
        else: before_ix.pop(s, None)
    for s in added: before_ix.pop(s, None)
    before = set(crash_pairs(before_ix))
    held = []
    upd = load("data/updates.json", {}) or {}
    for _ in range(len(changed) + len(added) + 1):
        now = crash_pairs(idx)
        new = {k: c for k, c in now.items() if k not in before and k not in reg}
        culprits = [s for s in changed + added if s not in [h["slug"] for h in held] and any(s in k for k in new)]
        if not culprits: break
        s = culprits[0]
        partner = [m for k, c in new.items() if s in k for m in k if m != s]
        info = next(c for k, c in new.items() if s in k)
        if s in changed:
            files[s] = old_files[s]
            if s in old_index: idx[s] = old_index[s]
            else: idx.pop(s, None)
        else:
            files.pop(s, None); idx.pop(s, None)
        held.append({"slug": s, "partner": partner, "wo": info["wo"], "art": info["art"],
                     "neu": None, "aktuell": old_files.get(s, [None] * 7)[6]})
        print(f"ZURÜCKGEHALTEN: {s} – neue Absturz-Kollision mit {', '.join(partner)} ({info['art']}: {info['wo']})")
    if held:
        app_files = app.get("files", {})
        for h in held:
            s = h["slug"]
            if s in old_files: app_files[s] = old_files[s]
            else: app_files.pop(s, None)
            u = next((u for u in upd.get("updates", []) if u["slug"] == s), None)
            h["neu"] = u["auf"] if u else None
            upd["updates"] = [u for u in upd.get("updates", []) if u["slug"] != s]
            for v in upd.get("verlauf", []): v["updates"] = [u for u in v["updates"] if u["slug"] != s]
            upd["verlauf"] = [v for v in upd.get("verlauf", []) if v["updates"]]
            upd.setdefault("verfuegbar", []).append({
                "slug": s, "name": (u or {}).get("name", s), "typ": "m", "aktuell": h["aktuell"], "neu": h["neu"],
                "art": (u or {}).get("art", "release"),
                "grund": f"zurückgehalten: Mixin-Kollision mit {', '.join(h['partner'])} ({h['wo']}) – wird täglich neu geprüft"})
        app["files"] = app_files
        save("data/files.json", files)
        if (REPO / "quelle/files.json").exists(): save("quelle/files.json", files)
        save("data/app-data.json", app)
        save("data/updates.json", upd)
    for s in list(idx): index[s] = idx[s]
    for s in [k for k in index if not k.startswith("_") and k not in idx]: del index[s]
    save("data/mixin-index.json", index)
    save("data/mixin-held.json", {"datum": __import__("datetime").date.today().isoformat(), "zurueckgehalten": held}, compact=False)
    print(f"Mixin-Guard: {len(changed)} aktualisierte und {len(added)} neue Mods geprüft, {len(held)} zurückgehalten.")


def cmd_local(folder):
    folder = Path(folder); idx = {}
    jars = sorted(folder.glob("*.jar"))
    for j in jars:
        idx[j.name] = scan_jar(j.read_bytes())
    cols = collisions(idx)
    n_red = sum(len(e["redirects"]) for e in idx.values()); n_ow = sum(len(e["overwrites"]) for e in idx.values())
    print(f"{len(jars)} JARs, {n_red} @Redirect, {n_ow} @Overwrite ausgewertet.")
    for c in sorted(cols, key=lambda c: (c["stufe"] != "absturz", c["mods"])):
        print(f"  [{c['stufe']}] {c['mods'][0]} + {c['mods'][1]} ({c['art']}: {c['wo']})")


if __name__ == "__main__":
    a = sys.argv[1:] or ["report"]
    if a[0] == "index": cmd_index()
    elif a[0] == "report": cmd_report("--ci" in a)
    elif a[0] == "guard": cmd_guard()
    elif a[0] == "local": cmd_local(a[1])
    else: print(__doc__)
