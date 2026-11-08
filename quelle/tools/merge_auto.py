# auto.json -> Katalog, nur kuratierte Vanilla+-Einträge (Whitelist), Kategorien korrigiert
import json, collections
a=json.load(open('/home/claude/mc-modpack/data/auto.json'))
m=json.load(open('/home/claude/modpack/mods.json')); f=json.load(open('/home/claude/modpack/files.json'))
have={x['slug'] for x in m}
V='''skyboxify blur-plus chatpatches better-f1-reborn dark-loading-screen betterhurtcam itemphysic-lite patpat fancy-toasts ydms-mobhealthbar morechathistory
controlify paginatedadvancements shoulder-surfing-reloaded no-resource-pack-warnings stendhal tool-stats fadeless mindful-darkness extreme_sound_muffler statuseffecttimer
lighty freelook stylish-effects smooth-skies peek itemswapper cinematic-interactions replaymod accurate-block-placement-r weaponmaster glowing-torchflower
enhancedvisuals foodeffecttooltips paperdoll emotecraft music-notification skinshuffle spyglass-improvements horse-expert pickup-notifications talkbubbles bettergrassify
fresh-block-animations cpa ears studious-keybinds'''.split()
G='''macaws-windows macaws-fences-and-walls macaws-bridges macaws-doors macaws-roofs macaws-stairs macaws-paths-and-pavings macaws-trapdoors macaws-lights-and-lamps macaws-paintings macaws-furniture
stoneworks rechiseled endrem boids more-armor-trims 3d-placeable-food netherportalfix travelersbackpack better-combat diagonal-fences beautify-refabricated animal_feeding_trough
enchanting-infuser combat-roll betterdays better-tridents dismount-entity herdspanic healing-campfire axes-are-weapons easy-elytra-takeoff armor-stand-arms lovely_snails
dragon-drops-elytra players-drop-heads blazeandcaves-advancements no-enderman-grief sit-anywhere'''.split()
P='servercore alternate-current fast-ip-ping forcecloseworldloadingscre serverpingerfixer complete-shield-fixes'.split()
T='''explorations promenade the-graveyard-fabric mes-moogs-end-structures mns-moogs-nether-structure mss-moogs-soaring-structur adorabuild-structures formations formations-nether formations-overworld
friends-and-foes-beekeeper wits betterend betternether oh-the-trees-youll-grow ecologics snow-under-trees terrestria terratonic ati-structures-fabricforge decubed-dungeons
qraftys-jungle-villages grim-kingdoms-lost-structu katters-structures better-end-cities-vanilla ibo'''.split()
R='''translations-for-sodium low-fire-pack enhanced-boss-bars unique-dark cozyui-plus redstone-tweaks small-shield-totem eggs-n-eyes actually-3d-stuff no-pumpkin-blur bushier-bushes
subtly-glowing-ores better-flame-particles enchanting-table-magic-cir small-held-items brays-better-3d-bow minecarts-with-wheels default-hd-sun-and-moon 3d-harnesses-x-fresh-anima
mob-crates dimanic-beds borderless-glass fresh-seeds visual-enchantments renewed-bookshelf rethoughted-spawn-eggs cubic-leaves fluffy-carpets animated-totem-of-undying amazing-mace-3d
blockier-goat-horn hardcore-hearts fresh-flower-pots-rotated animated-ore nature-x'''.split()
S='makeup-ultra-fast-shaders astralex noble sildurs-vibrant-shaders'.split()
CAT={**{s:'V' for s in V},**{s:'G' for s in G},**{s:'P' for s in P},**{s:'T' for s in T},**{s:'V' for s in R+S}}
SUB={'cinematic-interactions':'Spieler-Animation','cpa':'Spieler-Animation','fresh-block-animations':'Animation & Modelle','ears':'Animation & Modelle','studious-keybinds':'HUD & Bedienung',
 'enhancedvisuals':'Effekte & Partikel','bettergrassify':'Animation & Modelle','emotecraft':'Spieler-Animation','paperdoll':'HUD & Bedienung'}
def match(slug):
  if slug in CAT: return slug
  # Präfix nur für lange, abgeschnittene Schlüssel (z. B. mns-moogs-nether-structure…); kurze wie cpa/ears/ibo nur exakt
  return next((k for k in CAT if len(k) >= 12 and slug.startswith(k)), None)
n=0; seen=set(); used=set()
for x in a['mods']:
  k=match(x['slug'])
  if not k and x.get('want'): CAT[x['slug']]=x.get('cat') or 'V'; k=x['slug']
  if not k or x['slug'] in have or x['slug'] in seen: continue
  if x['slug'] not in a['files'] and not x.get('cf'): continue
  seen.add(x['slug']); used.add(k)
  x['cat']=CAT[k]
  if k in SUB: x['sub']=SUB[k]
  if CAT[k]=='P': x['sub']='Performance'
  m.append(x); n+=1
# Studious existiert schon im Katalog, braucht nur die Datei
for k,v in a['files'].items():
  if k not in f: f[k]=v
json.dump(m,open('/home/claude/modpack/mods.json','w'),ensure_ascii=False); json.dump(f,open('/home/claude/modpack/files.json','w'),ensure_ascii=False)
print('neu',n,'gesamt',len(m),collections.Counter(x['cat']+x.get('pt','m') for x in m if x['slug'] in seen))
print('nicht gefunden:',[k for k in CAT if k not in used and k not in have])
