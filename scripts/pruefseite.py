# Daten für die Prüfseite (Artifact „Video-Prüfung“): alle Videos mit Status „review“, die noch kein Urteil haben.
# Pro Video eine Kachel aus 6 Bildern (192×108): links 2 Bilder der Mod, rechts Titelbild und Szenen bei 25/50/75 %.
# Je 20 Kacheln ein Bildbogen (Sprite). Ergebnis: pruefung/daten.json + pruefung/bogen-NN.jpg
# Läuft auf GitHub (Workflow „Prüfseite“), weil die YouTube-Vorschaubilder nur von dort erreichbar sind.
import json, io, os, urllib.request, concurrent.futures as cf
from PIL import Image

media = json.load(open("data/media.json")); app = json.load(open("data/app-data.json"))
mods = {m["slug"]: m for m in app["mods"]}
hidden = set(app["x"].get("rpbad", [])) | set((app["x"].get("basisfehlt") or {}).keys())
done = json.load(open("data/video-review.json")) if os.path.exists("data/video-review.json") else {}
sounds = json.load(open("data/sounds.json")) if os.path.exists("data/sounds.json") else {}

def has_media(s):
    e = media.get(s, {})
    return (e.get("breite") or 0) >= 1280 or any(v.get("status") in ("auto", "ok") for v in e.get("videos", [])) or bool(sounds.get(s, {}).get("proben"))

items = [(s, v) for s, e in media.items() if s in mods and s not in hidden
         for v in e.get("videos", []) if v.get("status") == "review" and f"{s}:{v['id']}" not in done]
# zuerst Einträge ganz ohne gute Medien, dann die beliebtesten
items.sort(key=lambda t: (has_media(t[0]), -(mods[t[0]].get("downloadsK") or 0), -(t[1].get("punkte") or 0)))

FW, FH, COLS, ROWS = 192, 108, 4, 5
TW, TH = 3 * FW, 2 * FH
UA = {"User-Agent": "NashornAufCrack/mc-modpack pruefseite"}

def fetch(u):
    try:
        return Image.open(io.BytesIO(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20).read())).convert("RGB")
    except Exception:
        return None

def cover(im, box=None):
    if im is None: return Image.new("RGB", (FW, FH), (40, 44, 48))
    if box: im = im.crop(box)
    w, h = im.size; r = FW / FH
    if w / h > r: nw = int(h * r); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else: nh = int(w / r); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    return im.resize((FW, FH), Image.LANCZOS)

def mod_imgs(s):
    e = media.get(s, {}); l = list(e.get("bilder") or []) or list(mods[s].get("img") or [])
    return l[:2]

# alle Bilder parallel laden
urls = set()
for s, v in items:
    urls.update(mod_imgs(s)); urls.add(f"https://i.ytimg.com/vi/{v['id']}/mqdefault.jpg")
    urls.update(f"https://i.ytimg.com/vi/{v['id']}/hq{k}.jpg" for k in (1, 2, 3))
with cf.ThreadPoolExecutor(16) as ex: cache = dict(zip(urls, ex.map(fetch, urls)))

os.makedirs("pruefung", exist_ok=True)
for f in os.listdir("pruefung"):
    if f.startswith("bogen-"): os.remove(os.path.join("pruefung", f))
out, per = [], COLS * ROWS
for bi in range(0, len(items), per):
    sheet = Image.new("RGB", (COLS * TW, ROWS * TH), (24, 26, 28)); n = bi // per + 1
    for ti, (s, v) in enumerate(items[bi: bi + per]):
        x0, y0 = (ti % COLS) * TW, (ti // COLS) * TH
        mi = mod_imgs(s) + [None, None]
        hq = lambda k: cover(cache.get(f"https://i.ytimg.com/vi/{v['id']}/hq{k}.jpg"), (0, 45, 480, 315))
        frames = [cover(cache.get(mi[0])), cover(cache.get(f"https://i.ytimg.com/vi/{v['id']}/mqdefault.jpg")), hq(1),
                  cover(cache.get(mi[1])) if mi[1] else Image.new("RGB", (FW, FH), (40, 44, 48)), hq(2), hq(3)]
        for fi, fr in enumerate(frames): sheet.paste(fr, (x0 + (fi % 3) * FW, y0 + (fi // 3) * FH))
        m = mods[s]
        out.append({"k": f"{s}:{v['id']}", "s": s, "name": m["name"], "typ": m.get("pt") or "m", "notiz": m.get("notiz", ""),
                    "luecke": not has_media(s), "vid": v["id"], "titel": v.get("titel") or "", "kanal": v.get("kanal") or "",
                    "min": v.get("minuten"), "punkte": v.get("punkte"), "warum": v.get("warum") or [], "b": n, "t": ti})
    sheet.save(f"pruefung/bogen-{n:02d}.jpg", quality=72, optimize=True, progressive=True)

import datetime
json.dump({"stand": datetime.date.today().isoformat(), "spalten": COLS, "zeilen": ROWS, "items": out},
          open("pruefung/daten.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(len(out), "Videos auf", (len(out) + per - 1) // per, "Bögen;", sum(1 for x in out if x["luecke"]), "davon bei Einträgen ohne gute Medien")
