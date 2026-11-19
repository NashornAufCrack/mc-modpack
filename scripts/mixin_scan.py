#!/usr/bin/env python3
"""
Mixin-Kollisionsscan auf Bytecode-Ebene & Core-Modpack-Schutzprüfung.

Liest aus jeder Mod-JAR die Mixin-Konfigurationen und die Annotationen der Mixin-Klassen und erkennt:
  * redirect  – zwei verschiedene Mods setzen @Redirect auf denselben Methodenaufruf (z. B. Krypton + e4mc)
  * overwrite – zwei verschiedene Mods ersetzen dieselbe Methode komplett (@Overwrite)

Ausgeschlossen werden:
  * Geshadete Bibliotheken (gleicher Mixin-Klassenpfad in mehreren JARs wie fabric-api / mixinextras)
  * Durch Mod-Optionen deaktivierte Mixins (z. B. "lithium:options" in fabric.mod.json)
  * Bekannte kooperierende Kern-Mods mit Mixin-Plugins (z. B. Lithium + FerriteCore)

Schutzregel für tägliche Updates (guard):
  * Core-Modpack (LOCKED + transitive Pflicht-Abhängigkeiten): Jedes Update eines Core-Mods wird gegen
    alle anderen Core-Mods auf fabric.mod.json-Kompatibilität (depends/breaks/conflicts vorwärts & rückwärts)
    sowie auf Mixin-Absturz-Kollisionen geprüft. Unverträgliche Core-Updates werden einzeln zurückgehalten.
  * Optionale Mods (außerhalb des Core-Modpacks): Werden immer auf die neueste stabile 26.3-Version
    aktualisiert und NICHT wegen Mod-gegen-Mod-Kollisionen zurückgehalten (nur wenn die JAR selbst laut
    fabric.mod.json / JiJ-Sub-JAR nicht mit Minecraft 26.3 kompatibel ist).

Aufrufe (im Repo-Ordner):
  python3 scripts/mixin_scan.py index            Index data/mixin-index.json für alle Mods aktualisieren
  python3 scripts/mixin_scan.py report [--ci]    Alle Kollisionen im Katalog; --ci: Exit 1 nur bei
                                                 Absturz-Kollision innerhalb des Core-Modpacks
  python3 scripts/mixin_scan.py guard            Nach dem Update-Check & JAR-Inspektion: Schutzprüfung
  python3 scripts/mixin_scan.py local <ordner>   Einen lokalen mods-Ordner prüfen (z. B. eine Modrinth-Instanz)
"""
import datetime, html, io, json, os, struct, subprocess, sys, urllib.request, zipfile
from collections import defaultdict
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)

REPO = Path(__file__).resolve().parent.parent
if str(REPO) not in sys.path:
    sys.path.insert(0, str(REPO))

from scripts.fabric_semver import matches_predicate, normalize_target_version

INDEX_PATH = REPO / "data" / "mixin-index.json"
UA = {"User-Agent": "NashornAufCrack/mc-modpack mixin-scan (github.com/NashornAufCrack/mc-modpack)"}
INDEX_VERSION = 3

MIXIN = "Lorg/spongepowered/asm/mixin/Mixin;"
OVERWRITE = "Lorg/spongepowered/asm/mixin/Overwrite;"
REDIRECT = "Lorg/spongepowered/asm/mixin/injection/Redirect;"

COOPERATING_PAIRS = {
    tuple(sorted(("ferrite-core", "lithium"))),
    tuple(sorted(("ferrite-core", "vmp-fabric"))),
    tuple(sorted(("lithium", "vmp-fabric"))),
    tuple(sorted(("lithium", "modernfix-mvus"))),
    tuple(sorted(("sodium", "iris"))),
    tuple(sorted(("sodium", "sodium-extra"))),
    tuple(sorted(("lithium", "slabbed"))),
}

IGNORE = {"qsl", "quilted-fabric-api", "connector", "modefite-item-definition-backport"}

_KNOWN_MOD_ID_ALIASES = {
    "ferritecore": "ferrite-core",
    "modernfix": "modernfix-mvus",
    "c2me": "c2me-fabric",
    "dynamic_fps": "dynamic-fps",
    "shieldfixes": "complete-shield-fixes",
    "stfu": "shuttfup",
    "rpc": "resourcepackcached",
    "packed_packs": "packed-packs",
    "languagereload": "language-reload",
    "betterrenderdistance": "better-render-distance",
    "fastipping": "fast-ip-ping",
    "xxlpackets": "xxl-packets",
    "defaultoptions": "default-options",
    "fullscreenfix": "borderless-fullscreen",
    "cwb": "cubes-without-borders",
    "nochatreports": "no-chat-reports",
    "sodiumextrainformation": "sodium-extra-information",
    "better_end_sky": "better-end-sky",
    "subtle_effects": "subtle-effects",
    "crash_assistant": "crash-assistant",
    "hold_that_chunk_2": "hold-that-chunk-v2",
    "smart_particles": "smart-particles",
    "structure_layout_optimizer": "structure-layout-optimizer",
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


# ---------------------------------------------------------------- Daten & Core-Modpack
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

    if todo:
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
    for b in (app.get("dec") or {}).get("beziehungen", []):
        if not b.get("erledigt"):
            ms = b["mods"]
            for i in range(len(ms)):
                for j in range(i + 1, len(ms)):
                    out.add(tuple(sorted((ms[i], ms[j]))))
    for g in (app.get("dec") or {}).get("gruppen", []):
        ms = g.get("mods", [])
        for i in range(len(ms)):
            for j in range(i + 1, len(ms)):
                out.add(tuple(sorted((ms[i], ms[j]))))
    return out


def locked(app):
    return {m["slug"] for m in app.get("mods", []) if (m.get("cat") == "P" and m.get("rolle") == "K") or m.get("pflicht")}


def core_pack(app, files=None):
    """LOCKED plus alle transitiven Pflicht-Abhängigkeiten in files.json."""
    if files is None:
        files = app.get("files", {})
    out = set()
    st = [s for s in locked(app) if s in files]
    while st:
        y = st.pop()
        if y in out or y in IGNORE or y not in files:
            continue
        out.add(y)
        f = files[y]
        t = f[8] if len(f) > 8 else "m"
        deps = (f[5] if len(f) > 5 else []) or []
        st.extend(d for d in deps if d not in out and d not in IGNORE)
        if t == "s":
            st.append("iris")
        elif t == "d":
            st.append("globalpacks")
    return out


def check_core_jar_compatibility(core_slugs, files, insp, mc_ver, loader_ver=None):
    """
    Prüft alle Mods im Core-Modpack gegeneinander (CORE vs. CORE) anhand von fabric.mod.json:
    - depends.minecraft & depends.fabricloader
    - depends auf andere Core-Mods (vorwärts & rückwärts)
    - breaks & conflicts gegen andere Core-Mods (vorwärts & rückwärts)
    """
    insp = insp or {}
    id_to_slug = {}
    for s, f in files.items():
        if len(f) > 8 and f[8] != "m":
            continue
        id_to_slug[s] = s
        info = insp.get(s, {})
        if info and len(f) > 2 and info.get("sha1") == f[2] and info.get("mod_id"):
            id_to_slug[info["mod_id"]] = s
    for mid, slug in _KNOWN_MOD_ID_ALIASES.items():
        if slug in files:
            id_to_slug.setdefault(mid, slug)

    issues = []
    for s in sorted(core_slugs):
        if s not in files:
            continue
        f = files[s]
        if (f[8] if len(f) > 8 else "m") != "m":
            continue
        info = insp.get(s, {})
        if not info or (len(f) > 2 and info.get("sha1") != f[2]):
            continue

        deps = info.get("depends") or {}
        mc_req = deps.get("minecraft")
        if mc_req and not matches_predicate(mc_ver, mc_req):
            issues.append({
                "mods": (s,),
                "culprit_candidates": [s],
                "reason": f"{s} erfordert Minecraft {mc_req} (statt {mc_ver})",
            })

        fl_req = deps.get("fabricloader") or deps.get("fabric-loader")
        if fl_req and loader_ver and not matches_predicate(loader_ver, fl_req):
            issues.append({
                "mods": (s,),
                "culprit_candidates": [s],
                "reason": f"{s} erfordert Fabric Loader {fl_req} (statt {loader_ver})",
            })

        for dep_id, constraint in deps.items():
            if dep_id in ("minecraft", "fabricloader", "fabric-loader", "java", "fabric"):
                continue
            if dep_id.startswith("fabric-") and dep_id != "fabric-api" and dep_id not in id_to_slug:
                continue
            target_slug = "fabric-api" if dep_id == "fabric-api" else id_to_slug.get(dep_id)
            if target_slug and target_slug in core_slugs and target_slug in files and target_slug != s:
                tf = files[target_slug]
                t_info = insp.get(target_slug, {})
                t_ver = (t_info.get("jar_version") if (t_info and len(tf) > 2 and t_info.get("sha1") == tf[2]) else None) or tf[6]
                if constraint != "*" and not matches_predicate(normalize_target_version(t_ver), constraint):
                    issues.append({
                        "mods": tuple(sorted((s, target_slug))),
                        "culprit_candidates": [s, target_slug],
                        "reason": f"{s} erfordert {target_slug} ({constraint}), im Core-Modpack ist aber {t_ver}",
                    })

        for kind in ("breaks", "conflicts"):
            for target_id, constraint in (info.get(kind) or {}).items():
                target_slug = id_to_slug.get(target_id, target_id)
                if target_slug in core_slugs and target_slug in files and target_slug != s:
                    tf = files[target_slug]
                    t_info = insp.get(target_slug, {})
                    t_ver = (t_info.get("jar_version") if (t_info and len(tf) > 2 and t_info.get("sha1") == tf[2]) else None) or tf[6]
                    if constraint == "*" or matches_predicate(normalize_target_version(t_ver), constraint):
                        issues.append({
                            "mods": tuple(sorted((s, target_slug))),
                            "culprit_candidates": [s, target_slug],
                            "reason": f"{s} ({kind}) schließt Core-Mod {target_slug} {t_ver} ({constraint}) aus",
                        })

    return issues


def sync_updates_artifacts(upd, mods):
    """Synchronisiert UPDATES.md und data/updates.xml aus data/updates.json."""
    name_map = {m["slug"]: m.get("name", m["slug"]) for m in (mods or [])}
    mc = upd.get("mc", "26.3")
    now = datetime.datetime.now(datetime.timezone.utc)
    today = now.strftime("%Y-%m-%d")
    woche = (now - datetime.timedelta(days=7)).strftime("%Y-%m-%d")
    t_map = {"m": "Mod", "r": "Resource Pack", "s": "Shader", "d": "Datapack"}
    site = "https://nashornaufcrack.github.io/mc-modpack/neu/"
    self_url = "https://nashornaufcrack.github.io/mc-modpack/data/updates.xml"

    days = [v for v in upd.get("verlauf", []) if v.get("updates")]
    days.sort(key=lambda x: x["datum"], reverse=True)
    days = days[:30]
    items = []
    for v in days:
        n = len(v["updates"])
        parts = v["datum"].split("-")
        de = f"{parts[2]}.{parts[1]}.{parts[0]}" if len(parts) == 3 else v["datum"]
        t_label = "neue Version" if n == 1 else "neue Versionen"
        title = html.escape(f"{de}: {n} {t_label}")
        li_elems = []
        for x in v["updates"]:
            t_name = t_map.get(x.get("typ"), "Mod")
            art_str = f" ({html.escape(x['art'])})" if x.get("art") and x["art"] != "release" else ""
            li_elems.append(f"<li><b>{html.escape(x.get('name', ''))}</b> ({t_name}): {html.escape(str(x.get('von', 'neu')))} → {html.escape(str(x.get('auf', '')))}{art_str}</li>")
        desc = html.escape(f"<ul>{''.join(li_elems)}</ul>")
        dt_utc = f"{v['datum']}T12:00:00Z"
        items.append(
            f"  <item>\n"
            f"    <title>{title}</title>\n"
            f"    <link>{site}#updates</link>\n"
            f"    <guid isPermaLink=\"false\">mc-modpack-updates-{v['datum']}</guid>\n"
            f"    <pubDate>{dt_utc}</pubDate>\n"
            f"    <description>{desc}</description>\n"
            f"  </item>"
        )

    last_build = now.strftime("%a, %d %b %Y %H:%M:%S GMT")
    xml = (
        f"<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
        f"<rss version=\"2.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\">\n"
        f"<channel>\n"
        f"  <title>Mod-Katalog {html.escape(mc)} – Updates</title>\n"
        f"  <link>{site}#updates</link>\n"
        f"  <atom:link href=\"{self_url}\" rel=\"self\" type=\"application/rss+xml\"/>\n"
        f"  <description>Neue Versionen der Mods, Shader, Resource Packs und Datapacks im Mod-Katalog (Minecraft {html.escape(mc)}, Fabric). Täglich geprüft.</description>\n"
        f"  <language>de-de</language>\n"
        f"  <lastBuildDate>{last_build}</lastBuildDate>\n"
        f"{chr(10).join(items)}\n"
        f"</channel>\n"
        f"</rss>\n"
    )
    (REPO / "data" / "updates.xml").write_text(xml, encoding="utf-8")

    md_lines = [
        f"# Update-Stand ({mc})",
        "",
        f"Zuletzt geprüft: {today}",
        "",
        "## Neue Versionen in den letzten 7 Tagen (automatisch übernommen)",
        "",
    ]
    recents = [x for x in upd.get("verlauf", []) if x.get("datum", "") >= woche]
    has_recents = False
    for day in recents:
        for u in day.get("updates", []):
            has_recents = True
            art_s = f" ({u['art']})" if u.get("art") and u.get("art") != "release" else ""
            if u.get("von"):
                md_lines.append(f"- {day['datum']}: **{u['name']}** ({t_map.get(u.get('typ'), 'Mod')}) {u.get('von')} → {u.get('auf')}{art_s}")
            else:
                md_lines.append(f"- {day['datum']}: **{u['name']}** ({t_map.get(u.get('typ'), 'Mod')}) neu aufgenommen: {u.get('auf')}{art_s}")
    if not has_recents:
        md_lines.append("- keine")
    md_lines.append("")

    verf = upd.get("verfuegbar", [])
    md_lines.append(f"## Verfügbar, aber nicht automatisch übernommen ({len(verf)})")
    md_lines.append("")
    if verf:
        for v in verf:
            md_lines.append(f"- {v['name']}: {v['aktuell']} → {v['neu']} ({v['grund']})")
    else:
        md_lines.append("- keine")
    md_lines.append("")

    ohne_neue = upd.get("ohneNeue", [])
    md_lines.append(f"## Ohne neue Version seit über einer Woche ({len(ohne_neue)})")
    md_lines.append("")
    md_lines.append("Sortiert nach Alter der aktuellen Datei.")
    md_lines.append("")
    for o in ohne_neue:
        md_lines.append(f"- {o['name']}: {o['version']} (seit {o['seit']})")
    md_lines.append("")

    next_mc = upd.get("next")
    if next_mc:
        md_lines.append(f"## Nächste Minecraft-Version {next_mc['version']}")
        md_lines.append("")
        md_lines.append(f"{next_mc['ready']} von {next_mc['total']} empfohlenen Inhalten sind bereit.")
        md_lines.append("")
        for s in next_mc.get("missing", []):
            md_lines.append(f"- fehlt noch: {name_map.get(s, s)}")

    (REPO / "UPDATES.md").write_text("\n".join(md_lines) + "\n", encoding="utf-8")


def guard_updates(files, old_files, app, old_app, index, insp=None, upd=None, proj=None, fetch_missing=True):
    """
    Prüft geänderte/neue Mods in files gegenüber old_files:
      Step A: Minecraft-Kompatibilität (depends.minecraft inkl. JiJ) für alle aktualisierten/neuen Mods
      Step B: Core-Modpack fabric.mod.json-Kompatibilität (CORE vs. CORE: depends, breaks, conflicts)
      Step C: Core-Modpack Mixin-Kollisionen (CORE vs. CORE: @Redirect / @Overwrite)
    Gibt (held, index, changed, added) zurück und aktualisiert files, app, index und upd in-place.
    """
    insp = insp if insp is not None else {}
    upd = upd if upd is not None else {}
    proj = proj or {}
    mc_ver = proj.get("minecraftVersion", "26.3")
    loader_ver = proj.get("loaderVersion", "0.19.5")

    if index.get("_v") != INDEX_VERSION:
        index = {k: v for k, v in index.items() if not k.startswith("_")}
        index["_v"] = INDEX_VERSION

    old_index = {s: dict(e) for s, e in index.items() if not s.startswith("_")}
    if fetch_missing:
        index = update_index(files, index)
    else:
        for s in list(index):
            if not s.startswith("_") and s not in files:
                del index[s]
        index["_v"] = INDEX_VERSION

    changed = [s for s in mod_files(files) if s in old_files and old_files[s][2] != files[s][2]]
    added = [s for s in mod_files(files) if s not in old_files]
    idx = {s: e for s, e in index.items() if not s.startswith("_")}
    held = []

    def rollback(s, entry):
        if s in changed:
            files[s] = old_files[s]
            if s in old_index and old_index[s].get("sha1") == old_files[s][2]:
                idx[s] = old_index[s]
            else:
                idx.pop(s, None)
        else:
            files.pop(s, None)
            idx.pop(s, None)
        held.append(entry)

    # Step A: MC 26.3 JAR-Manifest-Prüfung für alle aktualisierten/neuen Mods (auch optionale Mods!)
    for s in list(changed + added):
        if any(h["slug"] == s for h in held) or s not in files:
            continue
        info = insp.get(s, {})
        if info and len(files[s]) > 2 and info.get("sha1") == files[s][2]:
            mc_req = (info.get("depends") or {}).get("minecraft")
            if mc_req and not matches_predicate(mc_ver, mc_req):
                new_ver = files[s][6] if len(files[s]) > 6 else None
                grund = f"zurückgehalten: JAR inkompatibel mit Minecraft {mc_ver} (erfordert {mc_req}) – wird täglich neu geprüft"
                rollback(s, {
                    "slug": s,
                    "partner": [],
                    "wo": f"Minecraft {mc_req}",
                    "art": "mc-version",
                    "grund": grund,
                    "neu": new_ver,
                    "aktuell": old_files.get(s, [None] * 7)[6],
                })
                print(f"ZURÜCKGEHALTEN: {s} – JAR inkompatibel mit Minecraft {mc_ver} (erfordert {mc_req})")

    # Step B: Core-Modpack fabric.mod.json-Kompatibilitätsprüfung (CORE vs. CORE)
    for _ in range(len(changed) + len(added) + 1):
        CORE = core_pack(app, files)
        issues = check_core_jar_compatibility(CORE, files, insp, mc_ver, loader_ver)
        held_slugs = {h["slug"] for h in held}
        actionable = []
        for iss in issues:
            cands = [c for c in iss["culprit_candidates"] if c in (changed + added) and c not in held_slugs]
            if cands:
                actionable.append((cands[0], iss))
        if not actionable:
            break
        s, iss = actionable[0]
        partner = [m for m in iss["mods"] if m != s]
        new_ver = files.get(s, [None] * 7)[6]
        grund = f"zurückgehalten: Core-Modpack-Inkompatibilität ({iss['reason']}) – wird täglich neu geprüft"
        rollback(s, {
            "slug": s,
            "partner": partner,
            "wo": iss["reason"],
            "art": "jar-manifest",
            "grund": grund,
            "neu": new_ver,
            "aktuell": old_files.get(s, [None] * 7)[6],
        })
        print(f"ZURÜCKGEHALTEN: {s} – Core-Modpack-Inkompatibilität ({iss['reason']})")

    # Step C: Core-Modpack Mixin-Kollisionsprüfung (CORE vs. CORE ONLY; optionale Mods werden NICHT zurückgehalten!)
    old_CORE = core_pack(old_app or app, old_files)

    def crash_pairs(ix, core_set):
        return {
            tuple(c["mods"]): c
            for c in collisions(ix, only=core_set)
            if c["stufe"] == "absturz" and tuple(sorted(c["mods"])) not in COOPERATING_PAIRS
        }

    before_ix = dict(idx)
    for s in changed:
        if s in old_index and old_index[s].get("sha1") == old_files[s][2]:
            before_ix[s] = old_index[s]
        else:
            before_ix.pop(s, None)
    for s in added:
        before_ix.pop(s, None)
    before = set(crash_pairs(before_ix, old_CORE))

    for _ in range(len(changed) + len(added) + 1):
        CORE = core_pack(app, files)
        now = crash_pairs(idx, CORE)
        new = {k: c for k, c in now.items() if k not in before}
        held_slugs = {h["slug"] for h in held}
        culprits = [s for s in changed + added if s not in held_slugs and any(s in k for k in new)]
        if not culprits:
            break
        s = culprits[0]
        partner = [m for k, c in new.items() if s in k for m in k if m != s]
        info = next(c for k, c in new.items() if s in k)
        new_ver = files.get(s, [None] * 7)[6]
        grund = f"zurückgehalten: Mixin-Kollision im Core-Modpack mit {', '.join(partner)} ({info['wo']}) – wird täglich neu geprüft"
        rollback(s, {
            "slug": s,
            "partner": partner,
            "wo": info["wo"],
            "art": info["art"],
            "grund": grund,
            "neu": new_ver,
            "aktuell": old_files.get(s, [None] * 7)[6],
        })
        print(f"ZURÜCKGEHALTEN: {s} – neue Core-Modpack-Absturz-Kollision mit {', '.join(partner)} ({info['art']}: {info['wo']})")

    if held:
        app_files = app.get("files", {})
        by_name = {m["slug"]: m.get("name", m["slug"]) for m in app.get("mods", [])}
        for h in held:
            s = h["slug"]
            if s in old_files:
                app_files[s] = old_files[s]
                if isinstance(upd.get("stand"), dict) and s in upd["stand"] and isinstance(upd["stand"][s], dict):
                    upd["stand"][s]["version"] = old_files[s][6]
            else:
                app_files.pop(s, None)
                if isinstance(upd.get("stand"), dict):
                    upd["stand"].pop(s, None)
            u = next((u for u in upd.get("updates", []) if u["slug"] == s), None)
            if u and u.get("auf"):
                h["neu"] = u["auf"]
            upd["updates"] = [u for u in upd.get("updates", []) if u["slug"] != s]
            for v in upd.get("verlauf", []):
                v["updates"] = [u for u in v["updates"] if u["slug"] != s]
            upd["verlauf"] = [v for v in upd.get("verlauf", []) if v["updates"]]
            upd.setdefault("verfuegbar", []).append({
                "slug": s,
                "name": (u or {}).get("name") or by_name.get(s, s),
                "typ": "m",
                "aktuell": h["aktuell"],
                "neu": h["neu"],
                "art": (u or {}).get("art", "release"),
                "grund": h["grund"],
            })
        app["files"] = app_files

    for s in list(idx):
        index[s] = idx[s]
    for s in [k for k in index if not k.startswith("_") and k not in idx]:
        del index[s]
    index["_v"] = INDEX_VERSION
    return held, index, changed, added


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
    reg = registered_pairs(app)
    CORE = core_pack(app, app.get("files", {}))
    crash = [c for c in cols if c["stufe"] == "absturz"]
    open_ = [c for c in crash if tuple(c["mods"]) not in reg]
    print(f"Mixin-Kollisionen im Katalog: {len(crash)} Absturz, {len(cols) - len(crash)} Warnung; "
          f"{len(open_)} Absturz-Kollisionen noch nicht als Konflikt eingetragen.")
    for c in sorted(cols, key=lambda c: (c["stufe"] != "absturz", c["mods"])):
        flag = "EINGETRAGEN" if tuple(c["mods"]) in reg else ("OFFEN" if c["stufe"] == "absturz" else "info")
        lk = " [CORE: " + ", ".join(m for m in c["mods"] if m in CORE) + "]" if any(m in CORE for m in c["mods"]) else ""
        print(f"  [{c['stufe']}] [{flag}] {c['mods'][0]} + {c['mods'][1]} ({c['art']}: {c['wo']}){lk}")
    save("data/mixin-conflicts.json", {"kollisionen": cols}, compact=False)
    both_locked = [c for c in crash if all(m in CORE for m in c["mods"]) and tuple(sorted(c["mods"])) not in COOPERATING_PAIRS]
    if ci and both_locked:
        print("FEHLER: Absturz-Kollision innerhalb des Core-Modpacks!")
        sys.exit(1)


def git_show(path):
    try:
        return json.loads(subprocess.run(["git", "show", f"HEAD:{path}"], cwd=REPO, capture_output=True, check=True).stdout.decode("utf-8"))
    except Exception:
        return None


def cmd_guard():
    """Läuft nach check-updates.mjs und inspect_jar_deps.py. Schützt das Core-Modpack und prüft MC 26.3 Kompatibilität."""
    files = load("data/files.json"); old_files = git_show("data/files.json")
    app = load("data/app-data.json"); old_app = git_show("data/app-data.json") or app
    if old_files is None:
        print("Kein git-Stand zum Vergleichen – übersprungen."); return
    index = load("data/mixin-index.json", {}) or {}
    insp = load("data/jar-inspection.json", {}) or {}
    upd = load("data/updates.json", {}) or {}
    proj = load("config/project.json", {}) or {}

    held, index, changed, added = guard_updates(files, old_files, app, old_app, index, insp=insp, upd=upd, proj=proj, fetch_missing=True)

    if held:
        old_insp = git_show("data/jar-inspection.json") or {}
        for h in held:
            s = h["slug"]
            if s in old_insp:
                insp[s] = old_insp[s]
            else:
                insp.pop(s, None)
        save("data/jar-inspection.json", insp, compact=False)
        save("data/files.json", files)
        if (REPO / "quelle/files.json").exists():
            save("quelle/files.json", files)
        save("data/app-data.json", app)
        save("data/updates.json", upd)
        sync_updates_artifacts(upd, app.get("mods", []))

    idx = {s: e for s, e in index.items() if not s.startswith("_")}
    save("data/mixin-index.json", index)
    save("data/mixin-conflicts.json", {"kollisionen": collisions(idx)}, compact=False)
    save("data/mixin-held.json", {"datum": datetime.date.today().isoformat(), "zurueckgehalten": held}, compact=False)
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
