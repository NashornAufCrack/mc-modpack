import json, html, datetime
with open('data/updates.json', 'r', encoding='utf-8') as f:
    UPD = json.load(f)
with open('data/mods.json', 'r', encoding='utf-8') as f:
    mods = json.load(f)
NAME = {m['slug']: m['name'] for m in mods}

MC = UPD.get('mc', '26.3')
today = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d')
woche = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)).strftime('%Y-%m-%d')
T_MAP = {'m': 'Mod', 'r': 'Resource Pack', 's': 'Shader', 'd': 'Datapack'}

# RSS
SITE = 'https://nashornaufcrack.github.io/mc-modpack/neu/'
SELF = 'https://nashornaufcrack.github.io/mc-modpack/data/updates.xml'

days = [v for v in UPD.get('verlauf', []) if v.get('updates')]
days.sort(key=lambda x: x['datum'], reverse=True)
days = days[:30]
items = []
for v in days:
    n = len(v['updates'])
    parts = v['datum'].split('-')
    de = f'{parts[2]}.{parts[1]}.{parts[0]}'
    t_label = 'neue Version' if n == 1 else 'neue Versionen'
    title = html.escape(f'{de}: {n} {t_label}')
    li_elems = []
    for x in v['updates']:
        t_name = T_MAP.get(x.get('typ'), 'Mod')
        art_str = f" ({html.escape(x['art'])})" if x.get('art') and x['art'] != 'release' else ''
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

last_build = datetime.datetime.now(datetime.timezone.utc).strftime('%a, %d %b %Y %H:%M:%S GMT')
xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Mod-Katalog {html.escape(MC)} – Updates</title>
  <link>{SITE}#updates</link>
  <atom:link href="{SELF}" rel="self" type="application/rss+xml"/>
  <description>Neue Versionen der Mods, Shader, Resource Packs und Datapacks im Mod-Katalog (Minecraft {html.escape(MC)}, Fabric). Täglich geprüft.</description>
  <language>de-de</language>
  <lastBuildDate>{last_build}</lastBuildDate>
{chr(10).join(items)}
</channel>
</rss>
"""
with open('data/updates.xml', 'w', encoding='utf-8') as f:
    f.write(xml)

# UPDATES.md
md_lines = [
    f"# Update-Stand ({MC})",
    "",
    f"Zuletzt geprüft: {today}",
    "",
    "## Neue Versionen in den letzten 7 Tagen (automatisch übernommen)",
    ""
]
recents = [x for x in UPD.get('verlauf', []) if x['datum'] >= woche]
has_recents = False
for day in recents:
    for u in day.get('updates', []):
        has_recents = True
        art_s = f" ({u['art']})" if u.get('art') != 'release' else ''
        md_lines.append(f"- {day['datum']}: **{u['name']}** ({T_MAP.get(u.get('typ'), 'Mod')}) {u.get('von')} → {u.get('auf')}{art_s}")

if not has_recents:
    md_lines.append("- keine")
md_lines.append("")

verf = UPD.get('verfuegbar', [])
md_lines.append(f"## Verfügbar, aber nicht automatisch übernommen ({len(verf)})")
md_lines.append("")
if verf:
    for v in verf:
        md_lines.append(f"- {v['name']}: {v['aktuell']} → {v['neu']} ({v['grund']})")
else:
    md_lines.append("- keine")
md_lines.append("")

ohne_neue = UPD.get('ohneNeue', [])
md_lines.append(f"## Ohne neue Version seit über einer Woche ({len(ohne_neue)})")
md_lines.append("")
md_lines.append("Sortiert nach Alter der aktuellen Datei.")
md_lines.append("")
for o in ohne_neue:
    md_lines.append(f"- {o['name']}: {o['version']} (seit {o['seit']})")
md_lines.append("")

next_mc = UPD.get('next')
if next_mc:
    md_lines.append(f"## Nächste Minecraft-Version {next_mc['version']}")
    md_lines.append("")
    md_lines.append(f"{next_mc['ready']} von {next_mc['total']} empfohlenen Inhalten sind bereit.")
    md_lines.append("")
    for s in next_mc.get('missing', []):
        md_lines.append(f"- fehlt noch: {NAME.get(s, s)}")

with open('UPDATES.md', 'w', encoding='utf-8') as f:
    f.write('\n'.join(md_lines) + '\n')

print('UPDATES.md und updates.xml synchronisiert.')
