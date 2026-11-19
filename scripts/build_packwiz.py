"""Erzeugt packwiz-Packs (packs/visual, packs/plus) aus data/*.json.
Prism lädt sie über packwiz-installer-bootstrap bei jedem Start automatisch nach."""
import json, hashlib, os, shutil, re
from urllib.parse import unquote
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def D(f):
    with open(os.path.join(R, "data", f), encoding="utf8") as fp:
        return json.load(fp)
M = D("mods.json"); F = D("files.json"); DEC = D("decisions.json")
BY = {m["slug"]: m for m in M}
CHOICES = D("choices.json") if os.path.exists(os.path.join(R, "data", "choices.json")) else {}
with open(os.path.join(R, "config", "project.json"), encoding="utf8") as _pf:
    PROJECT = json.load(_pf)
IMPLICIT = {
    "sunbathing-godrays": ["polytone"],
    "visual-effects-plus": ["polytone"],
    "connected-rocks": ["continuity"],
    "rainbows-foliage": ["polytone"],
    "fresh-animations": ["entity-model-features", "entitytexturefeatures"],
    "fresh-animations-extensions": ["fresh-animations"],
    "fa-player-extension": ["fresh-animations"],
    "just-expressions": ["entity-model-features"],
    "hyper-punchy": ["punchy-fpa"],
    "fresh-food-for-hyper-punchy": ["hyper-punchy"],
    "punchymoves": ["fluid-foolish"],
    "connected-paths": ["continuity"],
    "new-glowing-ores": ["continuity"],
    "detailed-animations": ["entity-model-features", "entitytexturefeatures"],
    "als-piglins-revamped-x-fresh-animations": ["fresh-animations"],
    "als-zombies-revamped-x-fresh-animations": ["fresh-animations"],
    "als-enderman-revamped-x-fresh-animations": ["fresh-animations"],
    "als-skeletons-revamped-x-fresh-animations": ["fresh-animations"],
    "assorted-allays-x-fresh-animations": ["fresh-animations"],
    "bare-bones-x-fresh-animations": ["fresh-animations"],
    "fresh-skeleton-physics": ["fresh-animations"],
    "brays-zombie-overhaul-fresh-animations": ["fresh-animations"],
    "whimscape-x-fresh-animations": ["fresh-animations", "whimscape"],
    "als-boss-rush-x-fresh-animations": ["fresh-animations"],
    "fresh-animations-quivers": ["fresh-animations"],
    "excalibur-fresh-animations": ["fresh-animations", "excal"],
    "3d-harnesses-x-fresh-animations": ["fresh-animations"],
    "fresh-flower-pots-rotated": ["fresh-flower-pots"],
    "drigo-3d-lanterns-x-punchy": ["hyper-punchy"],
    "3d-flint-steel-for-punchy": ["hyper-punchy"],
    "animated-3d-wind-charge-compatible-with-punchy": ["hyper-punchy"],
    "touch-and-motion": ["entity-model-features", "emf-compat-core"]
}
ONE_OF = {
    "euphoria-patches": ["complementary-reimagined", "complementary-unbound"],
    "touch-and-motion": ["fa-player-extension", "just-expressions", "detailed-animations"],
}

PRIO = [
    ["fresh-flower-pots-rotated", "fresh-flower-pots", "fresh-skeleton-physics", "als-creepers-revamped"],
    [
        "icons", "clearer-slot-highlight", "enhanced-boss-bars", "hardcore-hearts",
        "no-pumpkin-blur", "unique-dark", "cozyui-plus", "default-dark-mode", "dark-smooth-gui",
        "recolourful-containers-gui", "redstone-tweaks", "translations-for-sodium"
    ],
    [
        "fresh-animations-extensions", "fa-player-extension", "just-expressions", "detailed-animations",
        "als-piglins-revamped-x-fresh-animations", "als-zombies-revamped-x-fresh-animations",
        "als-enderman-revamped-x-fresh-animations", "als-skeletons-revamped-x-fresh-animations",
        "assorted-allays-x-fresh-animations", "bare-bones-x-fresh-animations",
        "3d-harnesses-x-fresh-animations", "fresh-animations-quivers",
        "brays-zombie-overhaul-fresh-animations", "whimscape-x-fresh-animations",
        "als-boss-rush-x-fresh-animations", "excalibur-fresh-animations"
    ],
    ["fresh-animations"],
    [
        "fresh-food-for-hyper-punchy", "3d-flint-steel-for-punchy", "drigo-3d-lanterns-x-punchy",
        "animated-3d-wind-charge-compatible-with-punchy", "hyper-punchy", "fluid-foolish",
        "theones-eating-animation-pack"
    ],
    [
        "brays-better-3d-bow", "amazing-mace-3d", "blockier-goat-horn", "animated-totem-of-undying",
        "glowing-3d-totem", "small-shield-totem", "small-held-items", "low-shield-pack",
        "fresh-food", "fresh-seeds", "fresh-flowers-and-plants", "fresh-ores-and-ingots",
        "fresh-buckets", "fresh-music-discs", "just-3d-potions", "refined-buckets",
        "findreks-3d-buckets-and-fish", "fyoncles-3d-trims", "glowing-3d-armor",
        "luminous-lanterns", "tools-and-utils", "bray-cyber-3d-enchanted-books",
        "nautilus3d", "animated-doors", "spooky-doors", "swinging-lanterns", "mob-crates"
    ],
    ["rainbows-foliage", "sunbathing-godrays", "visual-effects-plus"],
    [
        "fwa", "better-lanterns", "better-candles", "torches-reimagined", "weskersons-torches",
        "rays-3d-rails", "minecarts-with-wheels", "3d-ladders", "rays-3d-ladders",
        "3d-crops", "fancy-crops", "3d-bamboo-shoots", "fancy-beds", "dimanic-beds",
        "renewed-bookshelf", "os-colorful-grasses", "connected-paths", "connected-rocks",
        "borderless-glass", "simple-overlays", "fast-better-grass", "better-leaves",
        "fancyfast-bushy-leaves", "cubic-leaves", "hanging-leaves", "bushier-bushes",
        "better-moss", "fluffy-carpets", "emissive-trims",
        "animated-items", "xk-redstone-display", "excalibur-lootr-support"
    ],
    ["actually-3d-stuff", "nature-x", "3d-default"],
    [
        "jutting-ores", "animated-ore", "subtly-glowing-ores", "new-glowing-ores",
        "glowing-glints", "visual-enchantments", "even-better-enchants", "beautiful-enchanted-books",
        "enchanted-books-re-covered", "visual-armor-trims", "better-flame-particles",
        "enchanting-table-magic-circle", "eggs-n-eyes", "rethoughted-spawn-eggs",
        "blinking-ender-eyes", "low-on-fire", "low-fire-pack",
        "dramatic-skys", "default-hd-sun-and-moon"
    ],
    ["vvi", "enhanced-audio", "gentler-weather-sounds"],
    ["vanilla-exp", "xalis-enhanced-vanilla", "faithful-32x", "faithful-64x", "festive-mash-up", "default-style-christmas-pack"]
]

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
        if ok_cat and ok_srv and (m["rolle"] == "K" or st.get(s) == "drin" or m.get("pflicht")): sel.add(s)
    out, stack = set(), list(sel)
    while stack:
        s = stack.pop()
        if s in out or s not in F: continue
        out.add(s)
        alt = ONE_OF.get(s)
        alt_dep = ([alt[0]] if alt and not any(a in sel for a in alt) else [])
        carry_dep = (["dont-punch-my-tacz"] if s in ("carry-on", "punchy-fpa") and "carry-on" in sel and "punchy-fpa" in sel else [])
        stack += F[s][5] + IMPLICIT.get(s, []) + alt_dep + carry_dep + (["iris"] if BY.get(s, {}).get("pt") == "s" else ["globalpacks"] if BY.get(s, {}).get("pt") == "d" else [])
    return out

def side(s):
    a = BY[s]["ampel"] if s in BY else "Y"
    return "client" if a in ("G", "Q") else "both"

def sha(b, alg="sha256"): return hashlib.new(alg, b).hexdigest()

def build(name, plus):
    d = os.path.join(R, "packs", name); shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    files = {}
    sel = selection(plus)
    for s in sorted(sel):
        f = F[s]; pt = (BY[s]["pt"] if s in BY else f[8]) or "m"
        folder = {"m": "mods", "r": "resourcepacks/Modpack", "s": "shaderpacks", "d": "datapacks"}[pt]
        m = re.search(r"/data/([^/]+)/versions/([^/]+)/", f[0])
        title = BY[s]["name"] if s in BY else (f[7] or s)
        pw_side = side(s) if pt == "m" else ("both" if pt == "d" else "client")
        toml = (f'name = {json.dumps(title, ensure_ascii=False)}\nfilename = {json.dumps(unquote(f[1]), ensure_ascii=False)}\nside = "{pw_side}"\n\n'
                f'[download]\nurl = "{f[0]}"\nhash-format = "sha512"\nhash = "{f[3]}"\n')
        if m:
            toml += f'\n[update]\n[update.modrinth]\nmod-id = "{m.group(1)}"\nversion = "{m.group(2)}"\n'
        files[f"{folder}/{s}.pw.toml"] = (toml.encode(), True)
    # Standard-Einstellungen (DefaultOptions) und Photon
    rps = [s for s in sel if s in BY and BY[s]["pt"] == "r"]
    flat = [x for g in PRIO for x in g]
    def rank(s):
        gi = next((i for i, g in enumerate(PRIO) if s in g), len(PRIO))
        return (gi, flat.index(s) if s in flat else len(flat), s)
    order = ["vanilla"] + ["file/Modpack/" + unquote(F[s][1]) for s in reversed(sorted(rps, key=rank))]
    opts = ["renderDistance:16", "simulationDistance:10", "maxFps:140", "enableVsync:false", 'renderClouds:"false"', "mipmapLevels:4", "biomeBlendRadius:2", "resourcePacks:" + json.dumps(order, ensure_ascii=False), "key_key.saveToolbarActivator:key.keyboard.unknown" if "zoomify" in sel else ""]
    files["config/defaultoptions/options.txt"] = ("\n".join(o for o in opts if o).encode() + b"\n", False)
    if rps:
        fp_json = json.dumps({
            "module": True,
            "packIds": ["file/Modpack/" + unquote(F[s][1]) for s in sorted(rps, key=rank)]
        }, indent=2) + "\n"
        files["resourcepacks/Modpack/packed_packs.folderpack.json"] = (fp_json.encode(), False)
    if "photon-shader" in sel:
        pf = unquote(F["photon-shader"][1])
        files["config/defaultoptions/extra/config/iris.properties"] = (f"enableShaders=true\nshaderPack={pf}\n".encode(), False)
        files[f"shaderpacks/{pf}.txt"] = ("COLORED_LIGHTS=true\nWATER_CAUSTICS=true\nshadowMapResolution=2048\nshadowDistance=160.0\nBLOOM_INTENSITY=0.80\nAURORA_NORMAL=AURORA_RARELY\nHANDHELD_LIGHTING=false\nDESERT_SANDSTORM=false\n".encode(), False)
    for p, (b, meta) in files.items():
        os.makedirs(os.path.dirname(os.path.join(d, p)), exist_ok=True)
        with open(os.path.join(d, p), "wb") as fp:
            fp.write(b)
    idx = 'hash-format = "sha256"\n' + "".join(f'\n[[files]]\nfile = "{p}"\nhash = "{sha(b)}"\n' + ("metafile = true\n" if meta else "") for p, (b, meta) in sorted(files.items()))
    with open(os.path.join(d, "index.toml"), "w", encoding="utf8", newline="\n") as fp:
        fp.write(idx)
    pack = (f'name = "{ "Vanilla Plus" if plus else "Vanilla Visual" }"\nauthor = "NashornAufCrack"\nversion = "1.0.0"\npack-format = "{PROJECT["packFormat"]}"\n\n'
            f'[index]\nfile = "index.toml"\nhash-format = "sha256"\nhash = "{sha(idx.encode())}"\n\n[versions]\nminecraft = "{PROJECT["minecraftVersion"]}"\nfabric = "{PROJECT["loaderVersion"]}"\n')
    with open(os.path.join(d, "pack.toml"), "w", encoding="utf8", newline="\n") as fp:
        fp.write(pack)
    return len(sel)

if __name__ == "__main__":
    print("visual", build("visual", False), "plus", build("plus", True))
