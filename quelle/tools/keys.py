import json,re
NS={'atmospherics':'atmospherics','bbm':'better-boat-movement','carry':'carry-on','chesttracker':'chest-tracker-port','chiseledbookshelfvisualizer':'chiseled-bookshelf-visualizer','cinematic_respawn':'cinematic-respawn','clientsort':'clientsort','commandkeys':'commandkeys','craftingtweaks':'crafting-tweaks','custom_crosshair_mod':'custom-crosshair-mod','diorama':'diorama-map','do_a_barrel_roll':'do-a-barrel-roll','fabrishot':'fabrishot','fasttrading':'fast-trading','freecam':'freecam','heywiki':'hey-wiki','immersivemc':'immersivemc','inventoryhud':'inventoryhudplus','iris':'iris','jade':'jade','punchy':'punchy-fpa','punchy_moves':'punchymoves','punchy_puppies':'punchy-puppies','rescale':'rescale','ripple':'ripple','smartblockplacement':'smartblockplacement','soundsbegone':'soundsbegone','spatial-gui':'spatial-gui','super_resolution':'superresolution','talkingheads':'talkingheads','tooltipscroll':'tooltip-scroll','trade_cycling':'trade-cycling','trashslot':'trashslot','zoomify':'zoomify','crawl':'crawl','voice_chat':'simple-voice-chat','mute_microphone':'simple-voice-chat','disable_voice_chat':'simple-voice-chat','pickup':'?','whereisit':'?','dungeonconfig':'?','ktnilcks':'?','friends':'?','quickActions':'?','hide_icons':'?','push_to_talk':'simple-voice-chat','whisper':'simple-voice-chat'}
VAN=set('attack use forward left back right jump sneak sprint inventory drop swapOffhand chat playerlist advancements socialInteractions saveToolbarActivator loadToolbarActivator togglePerspective screenshot fullscreen command pickItem spectatorOutlines smoothCamera toggleGui spectatorHotbar quickActions'.split())
MENU=re.compile(r'craftingtweaks|clientsort|trashslot|tooltipscroll|inventoryessentials|inventive|sort|chesttracker|fasttrading|trade_cycling|ktnilcks|iteminteractions')
out=[]
for line in open('/home/claude/userpack/options.txt',encoding='utf-8'):
  if not line.startswith('key_'): continue
  kid,val=line[4:].strip().split(':',1)
  if val=='key.keyboard.unknown': val=''
  m=re.match(r'^(?:key\.|keybind\.)?([^.]+)\.(.*)$',kid)
  if kid.startswith('key.hotbar'): mod='vanilla'
  elif kid.startswith('key.debug'): mod='vanilla-f3'
  elif m and m.group(1) in VAN and kid.count('.')==1: mod='vanilla'
  elif kid.count('.')==1 and kid.split('.')[1] in VAN: mod='vanilla'
  else:
    ns=m.group(1) if m else kid
    if kid.startswith('key.') and kid.count('.')==1: ns=kid.split('.')[1]
    mod=NS.get(ns,'?')
  ctx='f3' if mod=='vanilla-f3' else ('menu' if MENU.search(kid) else 'welt')
  out.append([kid,val.replace('key.keyboard.','').replace('key.mouse.','maus.'),mod,ctx])
json.dump(out,open('keys.json','w'))
print(len(out),[o for o in out if o[2]=='?'])
