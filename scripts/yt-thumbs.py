# YouTube-Vorschaubilder selbst hosten: Beim Stöbern geht keine Anfrage an Google, erst das Abspielen lädt YouTube.
# Lädt für jedes freigegebene Video (data/media-app.json) das Vorschaubild als WebP nach media/yt/<id>.webp (480×270).
# Einträge ganz ohne eigene Bilder zeigen Video-Standbilder auch groß; dafür zusätzlich <id>-hd.webp (bis 1280×720).
# Nicht mehr gebrauchte Bilder werden gelöscht. Läuft im Workflow „Medien“ (i.ytimg.com ist nur von GitHub aus erreichbar);
# danach schreibt media-app.mjs die Merker b/hd, an denen die Website erkennt, dass ein Bild lokal liegt.
import json, io, os, urllib.request, concurrent.futures as cf
from PIL import Image

OUT = "media/yt"
app = json.load(open("data/app-data.json")); BY = {m["slug"]: m for m in app["mods"]}
media = json.load(open("data/media-app.json"))
UA = {"User-Agent": "NashornAufCrack/mc-modpack yt-thumbs"}

want = {}
for s, e in media.items():
    own = bool(e.get("bilder") or (BY.get(s) or {}).get("img"))
    for v in (e.get("videos") or [])[:3]:
        want[f"{v['id']}.webp"] = (v["id"], "sd")
        if not own: want[f"{v['id']}-hd.webp"] = (v["id"], "hd")

def get(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20) as r:
            im = Image.open(io.BytesIO(r.read())).convert("RGB")
            return None if im.size[0] <= 120 else im   # YouTube liefert für fehlende Größen ein 120×90-Platzhalterbild
    except Exception:
        return None

def crop169(im):
    w, h = im.size; nh = round(w * 9 / 16)
    return im if abs(h - nh) <= 2 else im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))

def make(name):
    vid, kind = want[name]
    if kind == "sd":
        im = get(f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg") or get(f"https://i.ytimg.com/vi/{vid}/mqdefault.jpg")
        size, q = (480, 270), 78
    else:
        im = get(f"https://i.ytimg.com/vi/{vid}/maxresdefault.jpg") or get(f"https://i.ytimg.com/vi/{vid}/sddefault.jpg") or get(f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg")
        size, q = None, 80
    if im is None: return name, False
    im = crop169(im)
    if size: im = im.resize(size, Image.LANCZOS)
    elif im.size[0] > 1280: im = im.resize((1280, 720), Image.LANCZOS)
    im.save(os.path.join(OUT, name), "WEBP", quality=q, method=6)
    return name, True

os.makedirs(OUT, exist_ok=True)
have = set(os.listdir(OUT))
todo = [n for n in want if n not in have]
with cf.ThreadPoolExecutor(16) as ex: res = list(ex.map(make, todo))
gone = [n for n in have if n not in want and n.endswith(".webp")]
for n in gone: os.remove(os.path.join(OUT, n))
ok = sum(1 for _, r in res if r)
size = sum(os.path.getsize(os.path.join(OUT, n)) for n in os.listdir(OUT)) / 1048576
print(f"Vorschaubilder: {len(want)} gebraucht, {ok} neu geladen, {len(todo) - ok} nicht ladbar, {len(gone)} gelöscht, {size:.1f} MB")
