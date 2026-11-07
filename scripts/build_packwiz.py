"""Erzeugt packwiz-Packs (packs/visual, packs/plus) aus data/*.json.
Prism lädt sie über packwiz-installer-bootstrap bei jedem Start automatisch nach."""
import json, hashlib, os, shutil, re
from urllib.parse import unquote
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = lambda f: json.load(open(os.path.join(R, "data", f), encoding="utf8"))
M = D("mods.json"); F = D("files.json"); DEC = D("decisions.json")
BY = {m["slug"]: m for m in M}
CHOICES = D("choices.json") if os.path.exists(os.path.join(R, "data", "choices.json")) else {}
IMPLICIT = {"fresh-animations": ["entity-model-features", "entitytexturefeatures"], "fresh-animations-extensions": ["fresh-animations"], "hyper-punchy": ["punchy-fpa"], "punchymoves": ["fluid-foolish"], "fresh-food-for-hyper-punchy": ["hyper-punchy"], "connected-paths": ["continuity"], "new-glowing-ores": ["continuity"]}
PRIO = [["fresh-flower-pots","round-trees"],["fresh-animations-objects","fresh-animations-extensions","fa-player-extension","fresh-animations-emissive","just-expressions"],["fresh-animations"],["fresh-food-for-hyper-punchy","hyper-punchy","fluid-foolish"]]

def status():
    s = {}
    for d in DEC["entscheidungen"]:
        oid = CHOICES.get(d["id"], d["empfehlung"]); o = next(x for x in d["optionen"] if x["id"] == oid)
        for m in o["weg"]: s[m] = "weg"
        for m in o["behalten"]: s.setdefault(m, "drin")
    return s

def selection(plus):
    st = status(); sel = set()
    for m in M:
        s = m["slug"]
        if s not in F or st.get(s) == "weg": continue
        ok_cat = m["cat"] in ("P", "V") or (plus and m["cat"] in ("G", "T"))
        ok_srv = plus or m["ampel"] in ("G", "Y", "Q")
        if ok_cat and ok_srv and (m["rolle"] == "K" or st.get(s) == "drin"): sel.add(s)
    out, stack = set(), list(sel)
    while stack:
        s = stack.pop()
        if s in out or s not in F: continue
        out.add(s); stack += F[s][5] + IMPLICIT.get(s, []) + (["iris"] if BY.get(s, {}).get("pt") == "s" else [])
    return out

def side(s):
    a = BY[s]["ampel"] if s in BY else "Y"
    return "client" if a in ("G", "Q") else "server" if False else "both"

def sha(b, alg="sha256"): return hashlib.new(alg, b).hexdigest()

def build(name, plus):
    d = os.path.join(R, "packs", name); shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    files = {}
    sel = selection(plus)
    for s in sorted(sel):
        f = F[s]; pt = (BY[s]["pt"] if s in BY else f[8]) or "m"
        folder = {"m": "mods", "r": "resourcepacks", "s": "shaderpacks"}[pt]
        m = re.search(r"/data/([^/]+)/versions/([^/]+)/", f[0])
        title = BY[s]["name"] if s in BY else (f[7] or s)
        toml = (f'name = {json.dumps(title, ensure_ascii=False)}\nfilename = {json.dumps(unquote(f[1]), ensure_ascii=False)}\nside = "{side(s) if pt=="m" else "client"}"\n\n'
                f'[download]\nurl = "{f[0]}"\nhash-format = "sha512"\nhash = "{f[3]}"\n\n'
                f'[update]\n[update.modrinth]\nmod-id = "{m.group(1)}"\nversion = "{m.group(2)}"\n')
        files[f"{folder}/{s}.pw.toml"] = (toml.encode(), True)
    # Standard-Einstellungen (YOSBR) und Photon
    rps = [s for s in sel if s in BY and BY[s]["pt"] == "r"]
    rank = lambda s: next((i for i, g in enumerate(PRIO) if s in g), len(PRIO))
    order = ["vanilla"] + ["file/" + unquote(F[s][1]) for s in sorted(rps, key=rank, reverse=True)]
    opts = ["renderDistance:16", "simulationDistance:10", "maxFps:140", "enableVsync:false", 'renderClouds:"false"', "mipmapLevels:4", "biomeBlendRadius:2", "resourcePacks:" + json.dumps(order, ensure_ascii=False), "key_key.saveToolbarActivator:key.keyboard.unknown" if "zoomify" in sel else ""]
    files["config/yosbr/options.txt"] = ("\n".join(o for o in opts if o).encode() + b"\n", False)
    if "photon-shader" in sel:
        pf = unquote(F["photon-shader"][1])
        files["config/yosbr/config/iris.properties"] = (f"enableShaders=true\nshaderPack={pf}\n".encode(), False)
        files[f"shaderpacks/{pf}.txt"] = ("COLORED_LIGHTS=true\nWATER_CAUSTICS=true\nshadowMapResolution=2048\nshadowDistance=160.0\nBLOOM_INTENSITY=0.80\nAURORA_NORMAL=AURORA_RARELY\nHANDHELD_LIGHTING=false\nDESERT_SANDSTORM=false\n".encode(), False)
    for p, (b, meta) in files.items():
        os.makedirs(os.path.dirname(os.path.join(d, p)), exist_ok=True); open(os.path.join(d, p), "wb").write(b)
    idx = 'hash-format = "sha256"\n' + "".join(f'\n[[files]]\nfile = "{p}"\nhash = "{sha(b)}"\n' + ("metafile = true\n" if meta else "") for p, (b, meta) in sorted(files.items()))
    open(os.path.join(d, "index.toml"), "w").write(idx)
    pack = (f'name = "{ "Vanilla Plus" if plus else "Vanilla Visual" }"\nauthor = "NashornAufCrack"\nversion = "1.0.0"\npack-format = "packwiz:1.1.0"\n\n'
            f'[index]\nfile = "index.toml"\nhash-format = "sha256"\nhash = "{sha(idx.encode())}"\n\n[versions]\nminecraft = "26.3"\nfabric = "0.20.1"\n')
    open(os.path.join(d, "pack.toml"), "w").write(pack)
    return len(sel)

if __name__ == "__main__":
    print("visual", build("visual", False), "plus", build("plus", True))
