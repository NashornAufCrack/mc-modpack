# Prüfbögen: je Mod eine Zeile mit Name + bis zu 3 Kandidaten-Videos (Titelbild + Bild bei 50 %). Claude prüft sie visuell.
import json, io, urllib.request, os
from PIL import Image, ImageDraw, ImageFont
media = json.load(open("data/media.json")); mods = {m["slug"]: m for m in json.load(open("data/mods.json"))}
done = json.load(open("data/video-review.json")) if os.path.exists("data/video-review.json") else {}
rows = []
for s, e in media.items():
    if s not in mods: continue
    v = [x for x in e.get("videos", []) if x.get("status") == "review" and f"{s}:{x['id']}" not in done]
    if v and not any(x.get("status") in ("auto", "ok") for x in e.get("videos", [])): rows.append((s, v[:3]))
rows.sort(key=lambda r: (mods[r[0]].get("cat") == "P", -(mods[r[0]].get("downloadsK") or 0)))
rows = rows[: int(os.environ.get("MAX_ROWS", 96))]
def get(u):
    try: return Image.open(io.BytesIO(urllib.request.urlopen(u, timeout=20).read())).convert("RGB")
    except Exception: return None
try: F = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15); f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
except Exception: F = f = ImageFont.load_default()
TW, TH, LW, PER = 240, 135, 230, 8
os.makedirs("review", exist_ok=True); index = {}
for si in range(0, len(rows), PER):
    chunk = rows[si: si + PER]; W = LW + 3 * (2 * TW + 8) ; H = len(chunk) * (TH + 30)
    img = Image.new("RGB", (W, H), (24, 24, 24)); d = ImageDraw.Draw(img); n = si // PER + 1
    for ri, (s, vs) in enumerate(chunk):
        y = ri * (TH + 30); m = mods[s]
        d.text((8, y + 8), f"{si + ri + 1}. {m['name'][:26]}", fill=(255, 255, 255), font=F)
        d.text((8, y + 30), (m.get("notiz") or "")[:34], fill=(170, 170, 170), font=f)
        d.text((8, y + 46), (m.get("notiz") or "")[34:68], fill=(170, 170, 170), font=f)
        for vi, v in enumerate(vs):
            x = LW + vi * (2 * TW + 8)
            for k, key in enumerate(("mqdefault", "hq2")):
                t = get(f"https://i.ytimg.com/vi/{v['id']}/{key}.jpg")
                if t: img.paste(t.resize((TW, TH)), (x + k * TW, y + 22))
            d.text((x + 2, y + 4), f"{'abc'[vi]}) {v.get('titel', '')[:60]}", fill=(250, 210, 90), font=f)
        index[str(si + ri + 1)] = {"slug": s, "videos": [v["id"] for v in vs]}
    img.save(f"review/sheet-{n:02d}.jpg", quality=80)
json.dump(index, open("review/sheet-index.json", "w"), indent=0)
print(len(rows), "Mods auf", (len(rows) + PER - 1) // PER, "Bögen")
