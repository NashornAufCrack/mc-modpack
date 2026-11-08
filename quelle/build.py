import json,os
os.chdir('/home/claude/modpack')
# Der Update-Check schreibt seit 08.11.2026 auch quelle/files.json; vor dem Build also nur „git pull“.
# (Der frühere Abgleich „anders = übernehmen“ hat bewusste lokale Korrekturen still zurückgedreht.)
_R='/home/claude/mc-modpack/data/' 
# Abhängigkeiten aufräumen: Projekt-IDs → Slugs (data/deps-fix.json vom Workflow „Abhängigkeiten“),
# nachgeladene Bibliotheken übernehmen, Abhängigkeiten ohne Bedeutung für Fabric 26.3 streichen
DEP_IGNORE={'qsl','quilted-fabric-api','connector','modefite-item-definition-backport'}
_fx=json.load(open(_R+'deps-fix.json')) if os.path.exists(_R+'deps-fix.json') else {}
_F=json.load(open('files.json')); _ids=_fx.get('ids',{})
for _k,_v in _fx.get('files',{}).items(): _F.setdefault(_k,_v)
for _v in _F.values(): _v[5]=list(dict.fromkeys(_ids.get(x,x) for x in _v[5] if _ids.get(x,x) not in DEP_IGNORE))
json.dump(_F,open('files.json','w'),ensure_ascii=False)
# Einträge, denen eine Pflicht-Abhängigkeit für 26.3 fehlt (z. B. Addon ohne Basis-Pack), werden ausgeblendet
def _missing(s):
    out,st,seen=[],[s],set()
    while st:
        x=st.pop()
        if x in seen: continue
        seen.add(x)
        if x not in _F: out.append(x); continue
        st+=_F[x][5]
    return out
BASISFEHLT={m['slug']:_missing(m['slug']) for m in json.load(open('mods.json')) if m['slug'] in _F and _missing(m['slug'])}
d=lambda f: json.dumps(json.load(open(f)),ensure_ascii=False,separators=(',',':'))
h=open('page_head.html').read(); b=open('page_body.html').read()
body=b.replace('__DATA__',d('mods.json')).replace('__SETTINGS__',d('settings.json')).replace('__DECISIONS__',d('decisions.json')).replace('__TPL__',json.dumps({f:open('tpl/'+f).read() for f in sorted(os.listdir('tpl'))},ensure_ascii=False)).replace('__EXTRA__',json.dumps({'cfgs':json.load(open('cfgs.json')),'tpl':json.load(open('cfgtpl.json')),'details':json.load(open('details.json')),'keys':json.load(open('keys.json')),'rpo':json.load(open('rpo.json')),'prules':json.load(open('prules.json'))},ensure_ascii=False,separators=(',',':'))).replace('__FILES__',open('files.json').read())
open('mod-katalog.html','w').write(h+body)
hh=h.replace('<meta name="claude:viewport-fit-sides" content="cover">','')
open('/home/claude/mc-modpack/index.html','w').write('<!doctype html>\n<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<style>*{box-sizing:border-box}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>\n'+hh+'</head><body>\n'+body+'\n</body></html>\n')
os.makedirs('/home/claude/mc-modpack/data',exist_ok=True)
for f in ('mods.json','decisions.json','settings.json','files.json'):
    open('/home/claude/mc-modpack/data/'+f,'w').write(open(f).read())
print('ok')
# Daten für die neue App
L=lambda f: json.load(open(f))
app={'mods':L('mods.json'),'files':L('files.json'),'dec':L('decisions.json'),'settings':L('settings.json'),
 'x':{'details':L('details.json'),'rpo':L('rpo.json'),'basisfehlt':BASISFEHLT,

      'rpbad':sorted(k for k,v in (json.load(open(_R+'rp-check.json')) if os.path.exists(_R+'rp-check.json') else {}).items() if not v['ok'])}}
open('/home/claude/mc-modpack/data/app-data.json','w').write(json.dumps(app,ensure_ascii=False,separators=(',',':')))
print('app-data', os.path.getsize('/home/claude/mc-modpack/data/app-data.json'))
