import json, os
from pathlib import Path

QUELLE = Path(__file__).resolve().parent
REPO = QUELLE.parent
os.chdir(str(QUELLE))

# Der Update-Check schreibt seit 08.11.2026 auch quelle/files.json; vor dem Build also nur „git pull“.
# (Der frühere Abgleich „anders = übernehmen“ hat bewusste lokale Korrekturen still zurückgedreht.)
_R = str(REPO / 'data') + os.sep
# Abhängigkeiten aufräumen: Projekt-IDs → Slugs (data/deps-fix.json vom Workflow „Abhängigkeiten“),
# nachgeladene Bibliotheken übernehmen, Abhängigkeiten ohne Bedeutung für Fabric 26.3 streichen
DEP_IGNORE = {'qsl', 'quilted-fabric-api', 'connector', 'modefite-item-definition-backport'}
_fx = json.load(open(_R + 'deps-fix.json', encoding='utf-8')) if os.path.exists(_R + 'deps-fix.json') else {}
_F = json.load(open('files.json', encoding='utf-8'))
_ids = _fx.get('ids', {})
for _k, _v in _fx.get('files', {}).items(): _F.setdefault(_k, _v)
for _v in _F.values(): _v[5] = list(dict.fromkeys(_ids.get(x, x) for x in _v[5] if _ids.get(x, x) not in DEP_IGNORE))
json.dump(_F, open('files.json', 'w', encoding='utf-8'), ensure_ascii=False)
# Einträge, denen eine Pflicht-Abhängigkeit für 26.3 fehlt (z. B. Addon ohne Basis-Pack), werden ausgeblendet
def _missing(s):
    out, st, seen = [], [s], set()
    while st:
        x = st.pop()
        if x in seen: continue
        seen.add(x)
        if x not in _F: out.append(x); continue
        st += _F[x][5]
    return out
BASISFEHLT = {m['slug']: _missing(m['slug']) for m in json.load(open('mods.json', encoding='utf-8')) if m['slug'] in _F and _missing(m['slug'])}
d = lambda f: json.dumps(json.load(open(f, encoding='utf-8')), ensure_ascii=False, separators=(',', ':'))
h = open('page_head.html', encoding='utf-8').read()
b = open('page_body.html', encoding='utf-8').read()
body = b.replace('__DATA__', d('mods.json')).replace('__SETTINGS__', d('settings.json')).replace('__DECISIONS__', d('decisions.json')).replace('__TPL__', json.dumps({f: open('tpl/' + f, encoding='utf-8').read() for f in sorted(os.listdir('tpl'))}, ensure_ascii=False)).replace('__EXTRA__', json.dumps({'cfgs': json.load(open('cfgs.json', encoding='utf-8')), 'tpl': json.load(open('cfgtpl.json', encoding='utf-8')), 'details': json.load(open('details.json', encoding='utf-8')), 'keys': json.load(open('keys.json', encoding='utf-8')), 'rpo': json.load(open('rpo.json', encoding='utf-8')), 'prules': json.load(open('prules.json', encoding='utf-8'))}, ensure_ascii=False, separators=(',', ':'))).replace('__FILES__', open('files.json', encoding='utf-8').read())
open('mod-katalog.html', 'w', encoding='utf-8').write(h + body)
hh = h.replace('<meta name="claude:viewport-fit-sides" content="cover">', '')
open(str(REPO / 'index.html'), 'w', encoding='utf-8').write('<!doctype html>\n<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<style>*{box-sizing:border-box}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>\n' + hh + '</head><body>\n' + body + '\n</body></html>\n')
os.makedirs(str(REPO / 'data'), exist_ok=True)
for f in ('mods.json', 'decisions.json', 'settings.json', 'files.json'):
    open(str(REPO / 'data' / f), 'w', encoding='utf-8').write(open(f, encoding='utf-8').read())
print('ok')
# Daten für die neue App
L = lambda f: json.load(open(f, encoding='utf-8'))
app = {'mods': L('mods.json'), 'files': L('files.json'), 'dec': L('decisions.json'), 'settings': L('settings.json'),
 'x': {'details': L('details.json'), 'rpo': L('rpo.json'), 'basisfehlt': BASISFEHLT,
      'rpbad': sorted(k for k, v in (json.load(open(_R + 'rp-check.json', encoding='utf-8')) if os.path.exists(_R + 'rp-check.json') else {}).items() if not v['ok'])}}
open(str(REPO / 'data' / 'app-data.json'), 'w', encoding='utf-8').write(json.dumps(app, ensure_ascii=False, separators=(',', ':')))
print('app-data', os.path.getsize(str(REPO / 'data' / 'app-data.json')))
