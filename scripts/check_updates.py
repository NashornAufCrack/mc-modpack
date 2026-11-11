#!/usr/bin/env python3
"""
Update-Check (täglich + Sonntags-Bericht): neue 26.3-Versionen für ALLES (Mods, Resource Packs, Shader, Datapacks) suchen,
automatisch übernehmen (data/files.json + quelle/files.json + data/app-data.json), und festhalten, was keine neue Version hat.
Schreibt data/updates.json, data/updates.xml und UPDATES.md.
Exakte Python-Implementierung von scripts/check-updates.mjs.
"""

import datetime
import html
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)

REPO = Path(__file__).resolve().parent.parent
os.chdir(REPO)

A = "https://api.modrinth.com/v2"
MC = "26.3"
UA = {"User-Agent": "NashornAufCrack/mc-modpack update-check (github.com/NashornAufCrack/mc-modpack)"}

with open("data/files.json", "r", encoding="utf-8") as f:
    files = json.load(f)

with open("data/app-data.json", "r", encoding="utf-8") as f:
    app = json.load(f)

with open("data/mods.json", "r", encoding="utf-8") as f:
    mods = json.load(f)

NAME = {m["slug"]: m["name"] for m in mods}

prev = {}
if os.path.exists("data/updates.json"):
    with open("data/updates.json", "r", encoding="utf-8") as f:
        try:
            prev = json.load(f)
        except Exception:
            prev = {}

def post_json(url, body):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={**UA, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)

def get_json(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)

LOADERS = {
    "m": ["fabric"],
    "r": ["minecraft"],
    "s": ["iris", "optifine"],
    "d": ["datapack"]
}

is_mr = lambda s: str(files[s][0]).startswith("https://cdn.modrinth.com/")
today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")

PIN = {"sodium", "iris", "voxy", "photon-shader", "moreculling", "wandering-traveler"}
is_pre = lambda v: bool(re.search(r"alpha|beta|pre|rc|snapshot", str(v), re.IGNORECASE))

verfuegbar = []
updates = []
stand = prev.get("stand", {})

cur_type = {}
all_mr = [s for s in files if is_mr(s) and files[s][2]]

print(f"Hole Versionstypen für {len(all_mr)} Modrinth-Dateien...")
for i in range(0, len(all_mr), 300):
    part = all_mr[i:i + 300]
    hashes = [files[s][2] for s in part]
    try:
        r = post_json(f"{A}/version_files", {"hashes": hashes, "algorithm": "sha1"})
        for s in part:
            h = files[s][2]
            v = r.get(h)
            if v:
                cur_type[s] = v.get("version_type")
                cur_ver = files[s][6]
                st = stand.get(s, {})
                seit = st.get("seit") if (st.get("version") == cur_ver and st.get("seit")) else v.get("date_published", "")[:10]
                stand[s] = {**st, "version": cur_ver, "seit": seit}
    except Exception as e:
        print(f"Fehler bei version_files Chunk {i}: {e}")

print("Prüfe auf Updates nach Typ...")
for t, loaders in LOADERS.items():
    slugs = [s for s in files if (files[s][8] if len(files[s]) > 8 else "m") == t and is_mr(s) and files[s][2]]
    print(f"  Typ '{t}': {len(slugs)} Dateien...")
    for i in range(0, len(slugs), 300):
        part = slugs[i:i + 300]
        hashes = [files[s][2] for s in part]
        try:
            upd = post_json(f"{A}/version_files/update", {
                "hashes": hashes,
                "algorithm": "sha1",
                "loaders": loaders,
                "game_versions": [MC]
            })
        except Exception as e:
            print(f"Fehler bei version_files/update {t} Chunk {i}: {e}")
            continue

        for s in part:
            h = files[s][2]
            v = upd.get(h)
            cur_ver = files[s][6]
            if v and v.get("files") and v.get("version_number") != cur_ver:
                v_num = v.get("version_number")
                v_type = v.get("version_type")
                is_pin = s in PIN
                base_type = cur_type.get(s) or ("beta" if is_pre(cur_ver) else "release")
                is_held_beta = (v_type != "release" and base_type == "release")

                cl = v.get("changelog")
                changelog = cl.strip() if cl else None

                if is_pin or is_held_beta:
                    reason = "festgelegte Version" if is_pin else f"nur als {v_type}"
                    verfuegbar.append({
                        "slug": s,
                        "name": NAME.get(s, s),
                        "typ": t,
                        "aktuell": cur_ver,
                        "neu": v_num,
                        "art": v_type,
                        "grund": reason,
                        "changelog": changelog
                    })
                    if s not in stand or stand[s].get("version") != cur_ver:
                        stand[s] = {"version": cur_ver, "seit": stand.get(s, {}).get("seit")}
                else:
                    flist = v.get("files", [])
                    f_prim = next((x for x in flist if x.get("primary")), flist[0])
                    deps = [d["project_id"] for d in v.get("dependencies", []) if d.get("dependency_type") == "required" and d.get("project_id")]
                    pub_date = v.get("date_published", "")[:10]
                    updates.append({
                        "slug": s,
                        "name": NAME.get(s, files[s][7] or s),
                        "typ": t,
                        "von": cur_ver,
                        "auf": v_num,
                        "art": v_type,
                        "datum": pub_date,
                        "deps": deps,
                        "alt": list(files[s]),
                        "altStand": dict(stand.get(s, {})) if s in stand else None,
                        "changelog": changelog
                    })
                    files[s] = [
                        f_prim["url"],
                        f_prim["filename"],
                        f_prim["hashes"]["sha1"],
                        f_prim["hashes"]["sha512"],
                        f_prim["size"],
                        files[s][5],
                        v_num,
                        files[s][7],
                        t
                    ]
                    stand[s] = {"version": v_num, "seit": pub_date}
            else:
                if s not in stand or stand[s].get("version") != cur_ver:
                    stand[s] = {"version": cur_ver, "seit": stand.get(s, {}).get("seit")}

# Abhängigkeiten auflösen
IGNORE = {"qsl", "quilted-fabric-api", "connector", "modefite-item-definition-backport"}
PT = {"mod": "m", "resourcepack": "r", "shader": "s", "datapack": "d"}
LD = {"mod": ["fabric"], "resourcepack": ["minecraft"], "shader": ["iris", "optifine"], "datapack": ["datapack"]}
id_info = {}
neu_lib = []

def resolve_projects(ids):
    need = [x for x in set(ids) if x not in id_info]
    for i in range(0, len(need), 80):
        chunk = need[i:i + 80]
        try:
            res = get_json(f"{A}/projects?ids={urllib.parse.quote(json.dumps(chunk))}")
            for p in res:
                id_info[p["id"]] = {"slug": p["slug"], "type": p["project_type"], "title": p.get("title", "")}
        except Exception:
            pass
    return {
        "ps": [id_info[x] for x in ids if x in id_info],
        "offen": [x for x in ids if x not in id_info]
    }

def resolve_lib(p):
    if p["slug"] in files or p["slug"] in IGNORE:
        return True
    try:
        loaders = json.dumps(LD.get(p["type"], ["fabric"]))
        gv = json.dumps([MC])
        vs = get_json(f"{A}/project/{p['slug']}/version?game_versions={urllib.parse.quote(gv)}&loaders={urllib.parse.quote(loaders)}")
        v = next((x for x in vs if x.get("version_type") == "release"), vs[0] if vs else None)
        if not v:
            return False
        flist = v.get("files", [])
        f_prim = next((x for x in flist if x.get("primary")), flist[0])
        files[p["slug"]] = [
            f_prim["url"],
            f_prim["filename"],
            f_prim["hashes"]["sha1"],
            f_prim["hashes"]["sha512"],
            f_prim["size"],
            [],
            v["version_number"],
            p.get("title") or p["slug"],
            PT.get(p["type"], "m")
        ]
        neu_lib.append(p["slug"])
        req_dep_ids = [d["project_id"] for d in v.get("dependencies", []) if d.get("dependency_type") == "required" and d.get("project_id")]
        sub_res = resolve_projects(req_dep_ids)
        files[p["slug"]][5] = [x["slug"] for x in sub_res["ps"] if x["slug"] not in IGNORE]
        ok = len(sub_res["offen"]) == 0
        for q in sub_res["ps"]:
            if ok and not resolve_lib(q):
                ok = False
        if not ok:
            if p["slug"] in files:
                del files[p["slug"]]
            if p["slug"] in neu_lib:
                neu_lib.remove(p["slug"])
        return ok
    except Exception:
        if p["slug"] in files and p["slug"] in neu_lib:
            del files[p["slug"]]
            neu_lib.remove(p["slug"])
        return False

# Updates gegen Abhängigkeiten validieren
to_keep = []
for u in updates:
    res = resolve_projects(u["deps"])
    fehlt = [f"unbekannt ({x})" for x in res["offen"]]
    for p in res["ps"]:
        if not resolve_lib(p):
            fehlt.append(p.get("title") or p["slug"])
    if fehlt:
        files[u["slug"]] = u["alt"]
        stand[u["slug"]] = u["altStand"] or {"version": u["von"], "seit": None}
        verfuegbar.append({
            "slug": u["slug"],
            "name": u["name"],
            "typ": u["typ"],
            "aktuell": u["von"],
            "neu": u["auf"],
            "art": u["art"],
            "grund": f"Abhängigkeit fehlt für {MC}: {', '.join(fehlt)}"
        })
    else:
        d = [p["slug"] for p in res["ps"] if p["slug"] not in IGNORE and p["slug"] in files]
        if d:
            files[u["slug"]][5] = sorted(list(set(files[u["slug"]][5] + d)))
        to_keep.append(u)

updates = to_keep
for u in updates:
    u.pop("deps", None)
    u.pop("alt", None)
    u.pop("altStand", None)

# Veröffentlichungsdatum für noch undatierte Dateien
no_date = [s for s in stand if s in files and not stand[s].get("seit") and is_mr(s)]
for i in range(0, len(no_date), 300):
    part = no_date[i:i + 300]
    hashes = [files[s][2] for s in part]
    try:
        r = post_json(f"{A}/version_files", {"hashes": hashes, "algorithm": "sha1"})
        for s in part:
            h = files[s][2]
            v = r.get(h)
            if v:
                stand[s]["seit"] = v.get("date_published", "")[:10]
    except Exception:
        pass

for s in list(stand.keys()):
    if s not in files:
        del stand[s]

# Nächste Minecraft-Version prüfen
next_mc = None
try:
    rel_tags = [t["version"] for t in get_json(f"{A}/tag/game_version") if t.get("version_type") == "release"]
    if MC in rel_tags:
        idx = rel_tags.index(MC)
        if idx > 0:
            nv = rel_tags[idx - 1]
            kern = [m["slug"] for m in mods if m.get("rolle") == "K" and m["slug"] in files and is_mr(m["slug"])]
            missing = []
            for i in range(0, len(kern), 80):
                chunk = kern[i:i + 80]
                for p in get_json(f"{A}/projects?ids={urllib.parse.quote(json.dumps(chunk))}"):
                    if nv not in p.get("game_versions", []):
                        missing.append(p["slug"])
            next_mc = {"version": nv, "total": len(kern), "ready": len(kern) - len(missing), "missing": missing}
except Exception as e:
    print(f"Info zu nächster MC-Version übersprungen: {e}")

# Daten schreiben
for u in updates:
    app["files"][u["slug"]] = files[u["slug"]]
for s in neu_lib:
    app["files"][s] = files[s]

with open("data/files.json", "w", encoding="utf-8") as f:
    json.dump(files, f, ensure_ascii=False, separators=(',', ':'))

if os.path.exists("quelle/files.json"):
    with open("quelle/files.json", "w", encoding="utf-8") as f:
        json.dump(files, f, ensure_ascii=False, separators=(',', ':'))

with open("data/app-data.json", "w", encoding="utf-8") as f:
    json.dump(app, f, ensure_ascii=False, separators=(',', ':'))

# Verlauf zusammenführen
prev_verlauf = prev.get("verlauf", [])
heute_alt = next((x.get("updates", []) for x in prev_verlauf if x.get("datum") == today), [])
heute_gefiltert = [u for u in heute_alt if not any(n["slug"] == u["slug"] for n in updates)]
heute = heute_gefiltert + updates

verlauf = [x for x in prev_verlauf if x.get("datum") != today]
if heute:
    verlauf.append({"datum": today, "updates": heute})
verlauf = verlauf[-60:]

alt = sorted([item for item in stand.items() if item[1].get("seit")], key=lambda x: x[1]["seit"])
woche = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)).strftime("%Y-%m-%d")
ohne_neue = [{"slug": s, "name": NAME.get(s, s), "version": v.get("version"), "seit": v.get("seit")}
             for s, v in alt if v.get("seit", "") < woche and s in NAME]

UPD = {
    "checked": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "mc": MC,
    "updates": updates,
    "verlauf": verlauf,
    "ohneNeue": ohne_neue,
    "verfuegbar": verfuegbar,
    "stand": stand,
    "next": next_mc
}

with open("data/updates.json", "w", encoding="utf-8") as f:
    json.dump(UPD, f, ensure_ascii=False, separators=(',', ':'))

# RSS Feed schreiben
SITE = "https://nashornaufcrack.github.io/mc-modpack/neu/"
SELF = "https://nashornaufcrack.github.io/mc-modpack/data/updates.xml"
T_MAP = {"m": "Mod", "r": "Resource Pack", "s": "Shader", "d": "Datapack"}

def write_rss(u):
    days = [v for v in u.get("verlauf", []) if v.get("updates")]
    days.sort(key=lambda x: x["datum"], reverse=True)
    days = days[:30]
    items = []
    for v in days:
        n = len(v["updates"])
        parts = v["datum"].split("-")
        de = f"{parts[2]}.{parts[1]}.{parts[0]}"
        t_label = "neue Version" if n == 1 else "neue Versionen"
        title = html.escape(f"{de}: {n} {t_label}")
        li_elems = []
        for x in v["updates"]:
            t_name = T_MAP.get(x.get("typ"), "Mod")
            art_str = f" ({html.escape(x['art'])})" if x.get("art") and x["art"] != "release" else ""
            li_elems.append(f"<li><b>{html.escape(x.get('name', ''))}</b> ({t_name}): {html.escape(str(x.get('von', 'neu')))} → {html.escape(str(x.get('auf', '')))}{art_str}</li>")
        desc = html.escape(f"<ul>{''.join(li_elems)}</ul>")
        dt_utc = f"{v['datum']}T12:00:00Z"
        items.append(f"""  <item>
    <title>{title}</title>
    <link>{SITE}#updates</link>
    <guid isPermaLink="false">mc-modpack-updates-{v['datum']}</guid>
    <pubDate>{dt_utc}</pubDate>
    <description>{desc}</description>
  </item>""")
    last_build = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Mod-Katalog {html.escape(u.get('mc', '26.3'))} – Updates</title>
  <link>{SITE}#updates</link>
  <atom:link href="{SELF}" rel="self" type="application/rss+xml"/>
  <description>Neue Versionen der Mods, Shader, Resource Packs und Datapacks im Mod-Katalog (Minecraft {html.escape(u.get('mc', '26.3'))}, Fabric). Täglich geprüft.</description>
  <language>de-de</language>
  <lastBuildDate>{last_build}</lastBuildDate>
{chr(10).join(items)}
</channel>
</rss>
"""
    with open("data/updates.xml", "w", encoding="utf-8") as f:
        f.write(xml)

write_rss(UPD)

# UPDATES.md schreiben
md_lines = [
    f"# Update-Stand ({MC})",
    "",
    f"Zuletzt geprüft: {today}",
    "",
    "## Neue Versionen in den letzten 7 Tagen (automatisch übernommen)",
    ""
]
recents = [x for x in verlauf if x["datum"] >= woche]
has_recents = False
for day in recents:
    for u in day.get("updates", []):
        has_recents = True
        art_s = f" ({u['art']})" if u.get("art") != "release" else ""
        md_lines.append(f"- {day['datum']}: **{u['name']}** ({T_MAP.get(u.get('typ'), 'Mod')}) {u.get('von')} → {u.get('auf')}{art_s}")

if not has_recents:
    md_lines.append("- keine")
md_lines.append("")

md_lines.append(f"## Verfügbar, aber nicht automatisch übernommen ({len(verfuegbar)})")
md_lines.append("")
if verfuegbar:
    for v in verfuegbar:
        md_lines.append(f"- {v['name']}: {v['aktuell']} → {v['neu']} ({v['grund']})")
else:
    md_lines.append("- keine")
md_lines.append("")

md_lines.append(f"## Ohne neue Version seit über einer Woche ({len(ohne_neue)})")
md_lines.append("")
md_lines.append("Sortiert nach Alter der aktuellen Datei.")
md_lines.append("")
for o in ohne_neue:
    md_lines.append(f"- {o['name']}: {o['version']} (seit {o['seit']})")
md_lines.append("")

if next_mc:
    md_lines.append(f"## Nächste Minecraft-Version {next_mc['version']}")
    md_lines.append("")
    md_lines.append(f"{next_mc['ready']} von {next_mc['total']} empfohlenen Inhalten sind bereit.")
    md_lines.append("")
    for s in next_mc.get("missing", []):
        md_lines.append(f"- fehlt noch: {NAME.get(s, s)}")

with open("UPDATES.md", "w", encoding="utf-8") as f:
    f.write("\n".join(md_lines) + "\n")

if neu_lib:
    print(f"Neue Bibliotheken: {', '.join(neu_lib)}")
print(f"{len(updates)} Updates übernommen, {len(ohne_neue)} ohne neue Version seit >7 Tagen, nächste Version: {next_mc['version'] + ' ' + str(next_mc['ready']) + '/' + str(next_mc['total']) if next_mc else 'keine'}")
