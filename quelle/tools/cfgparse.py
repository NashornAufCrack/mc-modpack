import json,json5,re,tomllib,os
C='/home/claude/userpack/config/'
MAP="""BBEConfig.json better-block-entities|DistantHorizons.toml distanthorizons|ISeeYouOverThere.properties i-see-you-over-there|MouseTweaks.cfg mouse-tweaks|SoundPhysicsPerfected.json5 sound-physics-perfected|accessible-step.json accessible-step|advancementplaques.toml advancement-plaques|ambience.json ambience-v2|animated_doors.properties animated-doors|appleskin.json5 appleskin|armor_hud.json armor-hud|armorhud.properties simple-armor-hud|async.toml async|asyncparticles/asyncparticles.json asyncparticles|atmosfera.json atmosfera|badoptimizations.txt badoptimizations|better-boat-movement.json better-boat-movement|betterrenderdistance.json better-render-distance|c2me.toml c2me-fabric|carryon-client.json carry-on|chat_heads.json5 chat-heads|chesttracker.json5 chest-tracker-port|cinematic_respawn.properties cinematic-respawn|clientsort.json clientsort|clienttweaks-common.toml client-tweaks|commandkeys.json commandkeys|continuity.json continuity|coolrain.json coolrain|cosycritters.json cosy-critters|crawl.properties crawl|cullleaves.json cull-leaves|customglint.json custom-glint|cutthrough-client.toml cut-through|cwb.json cubes-without-borders|detailarmorbar.json detail-armor-bar-reconstructed|distinctpotions-client.toml distinct-potions|do_a_barrel_roll-client.json do-a-barrel-roll|durabilitytooltip-common.toml durability-tooltip|dynamic_fps.json dynamic-fps|easegui.json easegui|effectual.json effectual|eg_particle_interactions.json particle-interactions|elytra-physics-config.json elytra-physics|enchdesc.json enchantment-descriptions|entity-view-distance.json entity-view-distance|entity_model_features.json entity-model-features|entity_texture_features.json entitytexturefeatures|euphoria_patcher/settings.toml euphoria-patches|explosiveenhancement.json explosive-enhancement|fabrishot.properties fabrishot|fallingleaves2.json fallingleaves|footprintparticle.json footprintparticle|fpsdisplay.json fpsdisplay|grassier-grass.json grassier-grass|held-item-info.json held-item-info|highlighter.toml item-highlighter|horseman-client.toml horseman|immediatelyfast.json immediatelyfast|immersive-hotbar.json5 immersive-hotbar|immersive-storms/general.json5 immersive-storms|immersive_mc-client.json immersivemc|immersiveui-common.json5 immersive-ui|interactivestuff.json interactivestuff|inventory_interactions.json5 inventory-interactions|inventory_particles.json5 inventory-particles|inventoryhud.json inventoryhudplus|invmove.json invmove|itemborders.toml item-borders|iteminteractions-client.toml easy-shulker-boxes|itemphysic-client.json itemphysic|jade/jade.json jade|lambdynlights.toml lambdynamiclights|legendarytooltips.toml legendary-tooltips|make_bubbles_pop.json make_bubbles_pop|maps3d-client.properties 3d-maps|mc2_interactivefoliage.json mc2-interactive-foliage|moreculling.toml moreculling|moremousetweaks.json moremousetweaks|notenoughanimations.json not-enough-animations|overflowingbars-client.toml overflowing-bars|particle_core_config.toml particle-core|particlerain/config.json particle-rain|particular-common.toml particular-reforged|perception-client.json5 perception|perception/modules/chromatic_aberration-client.json5 perception|perception/modules/shake-client.json5 perception|perception/modules/trail-client.json5 perception|pickupnotifier-client.toml pick-up-notifier|presencefootsteps/userconfig.json5 presence-footsteps|puddleflood.json puddles-floods|punchy/punchy_config.json punchy-fpa|rescale.json rescale|rightclickharvest.json5 rightclickharvest|rocks.json this-rocks|skinlayers.json 3dskinlayers|smart_particles/config.json smart-particles|smoothgui.json smooth-gui|snow.json snow|sodium-extra-options.json sodium-extra|sodium-options.json sodium|soundculling.json sound-culling|spatial-gui.json5 spatial-gui|status-effect-bars.json status-effect-bars|streamsreflowing-client.properties streams-reflowing|streamsreflowing.properties streams-reflowing|stupid-block-animations.json5 stupid-block-animations|subtle_effects/blocks.toml subtle-effects|subtle_effects/entities.toml subtle-effects|subtle_effects/environment.toml subtle-effects|subtle_effects/general.toml subtle-effects|subtle_effects/items.toml subtle-effects|super_resolution/config.toml superresolution|sway.json sway|swinginglanterns/swinginglanterns.json swinging-lanterns|tectonic.json tectonic|twod_projectiles.json5 twod_projectiles|vectorientation.properties vectorientation|visuality.json visuality|voxy-config.json voxy|voxy-extra.json voxy-extra|voxyworldgenv3.json voxy-worldgen|wakes.json wakes|waterdripsound.json dripsounds|waveycapes.json wavey-capes|wavify.json wavify|wilderwild/block.json5 wilder-wild|wilderwild/entity.json5 wilder-wild|wilderwild/misc.json5 wilder-wild|wilderwild/worldgen.json5 wilder-wild|windy-config.json windy|zoomify.json zoomify|iris.properties iris"""
def flat(o,p=''):
  for k,v in o.items():
    if isinstance(v,dict): yield from flat(v,p+k+'.')
    elif isinstance(v,(bool,int,float,str)): yield p+k,v
def typ(v): return 'bool' if isinstance(v,bool) else 'num' if isinstance(v,(int,float)) else 'str'
def comments_toml(txt):
  cm={};buf=[];sec=''
  for line in txt.splitlines():
    s=line.strip()
    if s.startswith('#'): buf.append(s.lstrip('# ').strip()); continue
    m=re.match(r'^\[([^\]]+)\]',s)
    if m: sec=m.group(1)+'.'; buf=[]; continue
    m=re.match(r'^"?([\w\-. ]+?)"?\s*=',s)
    if m: cm[sec+m.group(1)]=' '.join(b for b in buf if not b.startswith('Default:') and not b.startswith('Range:') and not b.startswith('Allowed Values'))[:220]; cm['__o_'+sec+m.group(1)]=next((b.split(':',1)[1].strip() for b in buf if b.startswith('Allowed Values')),None)
    buf=[]
  return cm
def comments_j5(txt):
  cm={};buf=[]
  for line in txt.splitlines():
    s=line.strip()
    if s.startswith('//'): buf.append(s.lstrip('/ ').strip()); continue
    m=re.match(r'^"?([\w\-]+)"?\s*:',s)
    if m and buf: cm[m.group(1)]=' '.join(buf)[:220]
    if s: buf=[]
  return cm
out={};tpl={}
for line in MAP.split('|'):
  fn,slug=line.rsplit(' ',1); p=C+fn
  if not os.path.exists(p): continue
  txt=open(p,encoding='utf-8',errors='replace').read()
  items=[];cm={}
  try:
    if fn.endswith('.json'): fmt='json'; data=json.loads(txt)
    elif fn.endswith('.json5'): fmt='json5'; data=json5.loads(txt); cm=comments_j5(txt)
    elif fn.endswith('.toml'): fmt='toml'; data=tomllib.loads(txt); cm=comments_toml(txt)
    else:
      fmt='props'; data={}
      for l in txt.splitlines():
        if '=' in l and not l.lstrip().startswith('#'):
          k,v=l.split('=',1); v=v.strip(); data[k.strip()]= True if v=='true' else False if v=='false' else (float(v) if re.fullmatch(r'-?\d+\.\d+',v) else int(v) if re.fullmatch(r'-?\d+',v) else v)
  except Exception as e: print('ERR',fn,e); continue
  if not isinstance(data,dict): continue
  for k,v in flat(data):
    if fmt in('json5','props') and '.' in k: continue  # nur flache Schlüssel sicher patchbar
    it={'k':k,'t':typ(v),'d':v}
    h=cm.get(k) or cm.get(k.split('.')[-1]);
    if h: it['h']=h
    o=cm.get('__o_'+k)
    if o: it['o']=[x.strip() for x in o.split(',')]
    items.append(it)
  if fmt=='toml':  # nur Schlüssel, deren Sektion als [Kopf] existiert
    heads=set(re.findall(r'^\s*\[([^\]]+)\]',txt,re.M))
    items=[i for i in items if '.' not in i['k'] or i['k'].rsplit('.',1)[0] in heads]
  if not items: continue
  dest='yosbr' 
  out.setdefault(slug,[]).append({'file':fn,'fmt':fmt,'items':items[:200]})
  tpl[fn]=txt
json.dump(out,open('cfgs.json','w'),ensure_ascii=False)
json.dump(tpl,open('cfgtpl.json','w'),ensure_ascii=False)
mods={m['slug'] for m in json.load(open('mods.json'))}
print(len(out),sum(len(f['items']) for v in out.values() for f in v),[s for s in out if s not in mods], os.path.getsize('cfgtpl.json'))
