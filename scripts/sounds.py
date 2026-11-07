# Hörproben: aus Mod-Jars und Resource-Pack-Zips typische Sounds ziehen, als .m4a speichern (läuft in jedem Browser).
# Ergebnis: sounds/<slug>/<n>.m4a + data/sounds.json {slug: {sha1, proben: [{datei, titel}]}}
import json, io, os, re, zipfile, subprocess, tempfile, urllib.request, collections
mods = json.load(open("data/mods.json")); files = json.load(open("data/files.json"))
try: out = json.load(open("data/sounds.json"))
except Exception: out = {}
EXTRA = {"atmosfera", "ambientsounds", "immersivemusicmod", "spooky-doors", "vvi", "enhanced-audio", "gentler-weather-sounds"}
cand = [m for m in mods if m["slug"] in files and (m.get("sub") == "Sound" or m["slug"] in EXTRA or (m.get("pt") == "r"))]
def label(d):
    p = [x for x in d.split("/") if x and x not in ("sounds", "assets", "minecraft")]
    return " · ".join(x.replace("_", " ") for x in p[-2:]) or "Sound"
def ff(args): subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *args], check=True)
done = 0
for m in cand:
    s = m["slug"]; f = files[s]
    if s in out and out[s].get("sha1") == f[2]: continue
    try:
        data = urllib.request.urlopen(urllib.request.Request(f[0], headers={"User-Agent": "mc-modpack sounds"}), timeout=120).read()
        z = zipfile.ZipFile(io.BytesIO(data))
        oggs = [i for i in z.infolist() if re.search(r"(^|/)sounds/.+\.(ogg|wav)$", i.filename) and i.file_size > 2000]
        if len(oggs) < (5 if m.get("pt") == "r" else 1): out[s] = {"sha1": f[2], "proben": []}; continue
        by = collections.defaultdict(list)
        for i in oggs: by[os.path.dirname(i.filename)].append(i)
        dirs = sorted(by, key=lambda d: -len(by[d]))[:12]
        # Vielfalt: möglichst verschiedene Oberordner
        pick, seen = [], set()
        for d in dirs:
            top = d.split("sounds/")[-1].split("/")[0]
            if top in seen and len(dirs) > 4: continue
            seen.add(top); pick.append(d)
            if len(pick) == 4: break
        os.makedirs(f"sounds/{s}", exist_ok=True); proben = []
        with tempfile.TemporaryDirectory() as t:
            for n, d in enumerate(pick, 1):
                fl = sorted(by[d], key=lambda i: i.file_size)
                med = fl[len(fl) // 2].file_size; ziel = f"sounds/{s}/{n}.m4a"
                if med < 30000:  # kurze Geräusche (Schritte, Klicks): mehrere hintereinander
                    sel = fl[:: max(1, len(fl) // 6)][:6]; paths = []
                    for k, i in enumerate(sel):
                        p = f"{t}/{n}_{k}{os.path.splitext(i.filename)[1]}"; open(p, "wb").write(z.read(i)); paths.append(p)
                    inp = sum((["-i", p] for p in paths), [])
                    flt = "".join(f"[{k}:a]aresample=44100,apad=pad_dur=0.35[a{k}];" for k in range(len(paths))) + "".join(f"[a{k}]" for k in range(len(paths))) + f"concat=n={len(paths)}:v=0:a=1[o]"
                    ff([*inp, "-filter_complex", flt, "-map", "[o]", "-c:a", "aac", "-b:a", "112k", ziel])
                else:
                    i = max([x for x in fl if x.file_size < 3_000_000] or fl[:1], key=lambda x: x.file_size)
                    p = f"{t}/{n}{os.path.splitext(i.filename)[1]}"; open(p, "wb").write(z.read(i))
                    ff(["-i", p, "-t", "15", "-af", "afade=t=out:st=13.5:d=1.5", "-c:a", "aac", "-b:a", "112k", ziel])
                proben.append({"datei": ziel, "titel": label(d)})
        out[s] = {"sha1": f[2], "proben": proben}; done += 1
    except Exception as e:
        out[s] = {"sha1": f[2], "proben": [], "fehler": str(e)[:120]}
json.dump(out, open("data/sounds.json", "w"), indent=0)
print(done, "neu verarbeitet;", sum(1 for v in out.values() if v["proben"]), "Einträge mit Hörproben")
