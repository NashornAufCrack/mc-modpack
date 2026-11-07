import json,os
os.chdir('/home/claude/modpack')
# Automatische Updates aus dem Repo übernehmen (Update-Check schreibt dort), damit der lokale Build sie nicht zurückdreht
_R='/home/claude/mc-modpack/data/'
if os.path.exists(_R+'files.json'):
    _loc=json.load(open('files.json')); _rep=json.load(open(_R+'files.json'))
    for _k,_v in _rep.items():
        if _k in _loc and _v[2]!=_loc[_k][2] and _v[0].startswith('https://cdn.modrinth.com/'): _loc[_k]=_v
    json.dump(_loc,open('files.json','w'),ensure_ascii=False)
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
 'x':{'details':L('details.json'),'rpo':L('rpo.json'),

      'rpbad':sorted(k for k,v in (json.load(open(_R+'rp-check.json')) if os.path.exists(_R+'rp-check.json') else {}).items() if not v['ok'])}}
open('/home/claude/mc-modpack/data/app-data.json','w').write(json.dumps(app,ensure_ascii=False,separators=(',',':')))
print('app-data', os.path.getsize('/home/claude/mc-modpack/data/app-data.json'))
