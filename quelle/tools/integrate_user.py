import json,sys,re
sys.path.insert(0,'tools'); from catmap import CAT,LIB
LIB |= {'attributefix','supermartijn642s-core-lib','spawn-animations-compats'}
u=json.load(open('userpack.json')); mods=json.load(open('mods.json')); files=json.load(open('files.json')); dec=json.load(open('decisions.json'))
REMOVE={'sound-physics-remastered','wakes-reforged','crashpatch','oneconfig','compose-multiplatform','smartsearch','overflowparticles','held-item-tooltips','the-one-probe','sort-it-out','inventive-inventory','inventory-essentials','inventory-profiles-next','bindcommands','macrokeybinds','resourcify','easy-install','yosbr','dis-enchanting-table','glow-trims','dynamiccrosshair','liteminer','snow-under-trees','fresh-animations-details','fresh-animations-creepers','fresh-animations-quivers','fresh-animations-spiders','fresh-animations-emissive','fresh-animations-objects'}
MUST={'technomodel','default-options','notenoughcrashes','crash-assistant','neruina','mclogs'}
have={m['slug'] for m in mods}; oldf=set(files)
ptm={'mod':'m','resourcepack':'r','shader':'s','datapack':'d'}
def side(o):
  cs,ss=o['cs'],o['ss']
  return 'server' if cs=='unsupported' else ('beide' if ss=='required' else 'client')
added=0
for o in u:
  s=o['slug']
  if not s: continue
  if o['url'] and s not in files:
    files[s]=[o['url'],o['fn'],o['sha1'],o['sha512'],o['size'],[d for d,t in o['deps'] if t=='required'],o['vn'],o['title'] if s in LIB else '',ptm[o['pt']]]
  if s in have or s in LIB or s in REMOVE or s in oldf: continue
  pt=ptm[o['pt']]
  if pt=='r': c,sub='V','Resource Packs'
  elif pt=='s': c,sub='V','Shader'
  elif pt=='d': c,sub=CAT.get(s,('T','Terrain'))
  else: c,sub=CAT[s]
  mods.append(dict(slug=s,name=o['title'],cat=c,sub=sub,ampel='G',rolle='K' if s in MUST else 'O',downloadsK=round((o['dl'] or 0)/1000),notiz=o['desc'],quellen=['DU'],mc='26.3',loader='fabric' if pt=='m' else '',einstellungen=None,ueberschneidung='',pt=pt,gal=len(o['gallery']),vn=o['vn'],img=o['gallery']))
  added+=1
for m in mods:
  if m['slug'] in MUST: m['rolle']='K'
  if m['slug'] in {o['slug'] for o in u} and 'DU' not in m['quellen']: m['quellen'].append('DU')
  m.setdefault('seite',None)
sides={o['slug']:side(o) for o in u}
for m in mods:
  if m['slug'] in sides: m['seite']=sides[m['slug']]
mods=[m for m in mods if m['slug'] not in REMOVE]
keep={m['slug'] for m in mods}
dec['beziehungen']=[b for b in dec['beziehungen'] if all(x in keep for x in b['mods'])]
G=[
 ('lod','Fernsicht-Engine',['voxy','distanthorizons'],'Beide zeichnen die Landschaft hinter der Sichtweite. Zusammen rechnen sie doppelt.'),
 ('blockanim','Block-Animationen',['fwa','a-good-place','stupid-block-animations'],'Alle animieren das Platzieren von Blöcken; zwei gleichzeitig überlagern sich.'),
 ('books','Verzauberte Bücher',['even-better-enchants','bray-cyber-3d-enchanted-books','beautiful-enchanted-books','enchanted-books-re-covered'],'Alle ersetzen dieselben Buch-Texturen. Nur das oberste Pack wäre sichtbar.'),
 ('faithful','Komplett-Texturen',['faithful-32x','faithful-64x'],'Beide ersetzen alle Texturen. Ohne Auswahl bleibt Vanilla-16x.'),
 ('ladders','3D-Leitern',['3d-ladders','rays-3d-ladders'],'Beide ersetzen das Leiter-Modell.'),
 ('buckets','3D-Eimer',['fresh-buckets','refined-buckets','findreks-3d-buckets-and-fish'],'Alle ersetzen das Eimer-Modell.'),
 ('torches','Fackeln',['torches-reimagined','weskersons-torches'],'Beide ersetzen Fackel-Modelle.'),
 ('crops','Getreide',['3d-crops','fancy-crops'],'Beide ersetzen Pflanzen-Modelle der Felder.'),
 ('guianim','Menü-Animationen',['smooth-gui','easegui','immersive-ui','eclipseui'],'Alle animieren das Öffnen von Menüs; zusammen doppeln sich die Effekte.'),
 ('fog','Nebel',['fog','clear-fog'],'Fog verschönert Nebel, Clear Fog entfernt ihn. Das widerspricht sich.'),
 ('shot','Screenshots',['fabrishot','pixelshot'],'Beide machen hochaufgelöste Screenshots per Taste.'),
 ('ambient','Umgebungsgeräusche',['atmosfera','ambientsounds'],'Beide spielen Wind-, Wald- und Höhlenklänge; zusammen doppelt.'),
 ('armoricons','Rüstungs-Icons',['armor-hud','simple-armor-hud'],'Beide zeigen die getragene Rüstung als Icons.'),
 ('armorbar','Rüstungsleiste',['detail-armor-bar-reconstructed','fresh-armor-bar'],'Beide ersetzen die Rüstungsleiste.'),
 ('creeper','Creeper-Aussehen',['als-creepers-revamped','fresh-animations-extensions'],'AL\'s Creepers und FA+All Extensions ersetzen beide das Creeper-Modell.'),
 ('playeranim','Spieler-Animationen (Third Person)',['detailed-animations','fa-player-extension'],'Beide animieren den Spieler-Körper über EMF.'),
 ('particleperf','Partikel-Optimierung',['smart-particles','asyncparticles','particle-core'],'Alle greifen in die Partikel-Berechnung ein. Welcher bleibt, entscheidet der Test.'),
]
dec['gruppen']=[dict(id=i,titel=t,mods=[x for x in ms if x in keep],text=tx) for i,t,ms,tx in G if len([x for x in ms if x in keep])>1]
# Entscheidungen: Option "beide" entfernen (Punkt 19)
for e in dec['entscheidungen']:
  e['optionen']=[o for o in e['optionen'] if not (set(o['behalten'])&set(e['optionen'][0]['weg']) and set(o['behalten'])&set(e['optionen'][0]['behalten']) and o is not e['optionen'][0]) and o['id'] not in ('beide','both')]
json.dump(mods,open('mods.json','w'),ensure_ascii=False); json.dump(files,open('files.json','w'),ensure_ascii=False); json.dump(dec,open('decisions.json','w'),ensure_ascii=False)
print('added',added,'total',len(mods),'groups',len(dec['gruppen']),[ (g['id'],len(g['mods'])) for g in dec['gruppen']])
import collections;print(collections.Counter((m['pt'],m['cat']) for m in mods))
