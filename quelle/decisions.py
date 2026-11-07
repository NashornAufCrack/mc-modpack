import json
M=json.load(open('mods.json'))
by={m['slug']:m for m in M}
def add(slug,name,cat,sub,ampel,rolle,dl,notiz,q=("PC",)):
    if slug in by: by[slug].update(dict(name=name,cat=cat,sub=sub,ampel=ampel,rolle=rolle,notiz=notiz)); return
    m=dict(slug=slug,name=name,cat=cat,sub=sub,ampel=ampel,rolle=rolle,downloadsK=dl,notiz=notiz,quellen=list(q),mc="26.3",loader="fabric",einstellungen=None,ueberschneidung="")
    M.append(m); by[slug]=m
S="Spieler-Animation"
add("punchy-fpa","Punchy!","V",S,"G","K",6704,"Flüssige Ego-Animationen, sichtbare Hände, Item-Physik in der Hand. Basis für alle Punchy-Packs.",("J","PC"))
add("punchymoves","Punchy! Moves","V",S,"G","K",95,"Third-Person-Animationen, Emotes und dynamische Kamera aus der Punchy-Familie. Sehr neu (v1.0.7).")
add("fluid-foolish","Fluid & Foolish","V",S,"G","K",69,"Resource Pack mit den Animationen für Punchy! Moves. Ohne es zeigt Moves nichts.")
add("hyper-punchy","Hyper Punchy","V",S,"G","K",2494,"Überarbeitete Ego-Animationen für Punchy (Kampf, Werkzeuge, Hände).")
add("fresh-food-for-hyper-punchy","Fresh Food for Hyper Punchy","V",S,"G","O",3,"Fix, damit Ess-Animations-Packs mit Hyper Punchy richtig aussehen.")
add("not-enough-animations","Not Enough Animations","V",S,"G","A",93634,"Bewährte Third-Person-Gesten (Essen, Karten, Leitern). Alternative zu Punchy! Moves.",("VP",))
add("first-person-model","First-person Model","V",S,"G","A",14860,"Eigener Körper in der Ego-Sicht. Überschneidet sich mit Punchy.",("J",))
add("fa-player-extension","Fresh Animations: Player","V",S,"G","A",5088,"FA-Animationen für den Spieler. Alternative zu Punchy! Moves.")
add("3dskinlayers","3D Skin Layers","V",S,"G","K",83815,"Skin-Overlay in 3D.",("VP",))
add("cameraoverhaul","Camera Overhaul","V",S,"G","O",6696,"Kamera neigt sich bei Bewegung. Punchy! Moves hat eine eigene Kamera.")
L="Punchy-Packs"
add("luminous-lanterns","Luminous Lanterns x Punchy!","V",L,"G","O",11,"3D-Laternen inkl. Kupfer, als Block und in der Hand. Vom Macher von Enchantment Outlines.")
add("drigo-3d-lanterns-x-punchy","Drigo 3D Lanterns x Punchy","V",L,"G","O",1974,"3D-Laternen mit Halte-Effekt für Punchy. Sehr verbreitet.")
add("just-3d-potions","Just 3D Potions (Punchy!)","V",L,"G","O",651,"3D-Tränke, Punchy-kompatibel.")
add("glowing-3d-totem","Glowing 3D Totem","V",L,"G","O",732,"3D-Totem, Punchy-kompatibel.")
add("refined-buckets","Refined Buckets","V",L,"G","O",2002,"3D-Eimer, in der offiziellen Punchy-Collection.")
add("fyoncles-3d-trims","Fyoncle's 3D Trims","V",L,"G","O",1136,"3D-Rüstungsbesatz-Vorlagen in der Hand.")
add("3d-flint-steel-for-punchy","3D Flint & Steel for Punchy","V",L,"G","O",5,"3D-Feuerzeug im Vanilla-Stil.")
add("animated-3d-wind-charge-compatible-with-punchy","Animated 3D Wind Charge","V",L,"G","O",32,"Animierte 3D-Windkugel.")
add("enchanted-fishing-line","Enchanted Fishing Line","V","Welt & Licht","G","O",168,"Physikalische Angelschnur, die sich biegt.",("D","PC"))
add("interactivestuff","InteractiveStuff","V",S,"G","A",593,"Animierte Items in der Ego-Sicht. Überschneidet sich mit Punchy.")
for s in ("better-lanterns","weskersons-torches"): by[s]['rolle']="A"
by['better-lanterns']['notiz']="3D-Laternen, aber nicht Punchy-kompatibel."
by['weskersons-torches']['notiz']="3D-Fackeln, nicht in der Punchy-Collection."
by['punchy-fpa']['sub']=S
by['spatial-gui']['notiz']="Inventar schwebt räumlich. Hat eigene Kompatibilität mit Punchy und Punchy! Moves."
by['spatial-gui']['rolle']="O"
for m in M:
    if m['slug'] in ('fa-player-extension',): m['sub']=S

# Decisions: id, art, titel, frage, options[{id,label,behalten[],weg[],pro[],contra[]}], empfehlung, quelle
D=[
 dict(id="ego-animation",art="D",titel="Ego-Animationen",frage="Wer bestimmt, wie Hände und Items in der Ego-Sicht aussehen?",
  optionen=[
   dict(id="punchy",label="Punchy! + Hyper Punchy",behalten=["punchy-fpa","hyper-punchy"],weg=["first-person-model","interactivestuff"],
        pro=["Dein Wunsch: Punchy als Basis","Sehr flüssige Animationen mit Item-Physik","Offizielle Collection mit über 70 Kompatibilitäts-Packs"],
        contra=["Den eigenen Körper sieht man beim Runterschauen nicht"]),
   dict(id="fpm",label="First-person Model",behalten=["first-person-model","not-enough-animations"],weg=["punchy-fpa","hyper-punchy"],
        pro=["Beine und Körper in der Ego-Sicht sichtbar"],
        contra=["Braucht Not Enough Animations","Kaum eigene Animationen, keine Punchy-Packs nutzbar"]),
   dict(id="beide",label="Beide zusammen testen",behalten=["punchy-fpa","hyper-punchy","first-person-model","not-enough-animations"],weg=[],
        pro=["Körper sichtbar und Punchy-Animationen"],
        contra=["Beide verändern das Ego-Rendering. Keine Seite bestätigt, dass das zusammen funktioniert."]),
  ],empfehlung="punchy",quelle="Projektseiten Punchy!, First-person Model, InteractiveStuff"),
 dict(id="third-person",art="D",titel="Third-Person-Animationen",frage="Wer animiert deinen Spieler, wenn andere dich sehen oder du in die Third-Person-Ansicht wechselst?",
  optionen=[
   dict(id="moves",label="Punchy! Moves + Fluid & Foolish",behalten=["punchymoves","fluid-foolish"],weg=["not-enough-animations","fa-player-extension"],
        pro=["Gleiche Familie wie Punchy, ein Stil","Emotes und frei einstellbare Third-Person-Kamera","Spatial GUI ist ausdrücklich kompatibel"],
        contra=["Sehr neu (v1.0.7, rund 95.000 Downloads)","Animationen kommen nur aus einem Pack, Auswahl noch klein"]),
   dict(id="nea",label="Not Enough Animations",behalten=["not-enough-animations"],weg=["punchymoves","fluid-foolish","fa-player-extension"],
        pro=["Bewährt, über 93 Mio. Downloads","Vanilla-nahe Gesten: Essen, Karten, Leitern","Punchy-Packs nennen NEA als kompatibel"],
        contra=["Weniger Persönlichkeit, keine Emotes"]),
   dict(id="fa",label="Fresh Animations: Player",behalten=["fa-player-extension"],weg=["punchymoves","fluid-foolish","not-enough-animations"],
        pro=["Gleicher Stil wie die Mob-Animationen von Fresh Animations"],
        contra=["Ändert das Spieler-Modell über EMF. 3D Skin Layers warnt vor verschobenen Skin-Teilen bei solchen Packs."]),
  ],empfehlung="moves",quelle="Projektseiten Punchy! Moves, Not Enough Animations, 3D Skin Layers, 3D Held Lanterns for Punchy"),
 dict(id="kamera",art="T",titel="Kamera-Bewegung",frage="Punchy! Moves bringt eine dynamische Third-Person-Kamera mit. Camera Overhaul neigt die Kamera bei Bewegung.",
  optionen=[
   dict(id="nur-moves",label="Nur Punchy! Moves",behalten=[],weg=["cameraoverhaul"],pro=["Kein Risiko, dass zwei Mods an der Kamera ziehen"],contra=["Ego-Sicht ohne Neigung"]),
   dict(id="beide",label="Beide, im Test prüfen",behalten=["cameraoverhaul"],weg=[],pro=["Neigung in der Ego-Sicht, Punchy-Kamera in Third Person"],contra=["Ungetestet, kann ruckeln oder doppelt wirken"]),
  ],empfehlung="beide",quelle="Eigene Prüfung"),
 dict(id="laternen",art="D",titel="3D-Laternen und Fackeln",frage="Mit Punchy sollten Laternen in der Hand Punchy-kompatibel sein.",
  optionen=[
   dict(id="luminous",label="Luminous Lanterns x Punchy!",behalten=["luminous-lanterns"],weg=["better-lanterns","drigo-3d-lanterns-x-punchy"],pro=["Inklusive Kupfer-Laternen","Block, Item und Hand in 3D","In der offiziellen Punchy-Collection"],contra=["Noch klein (rund 11.000 Downloads)"]),
   dict(id="drigo",label="Drigo 3D Lanterns x Punchy",behalten=["drigo-3d-lanterns-x-punchy"],weg=["better-lanterns","luminous-lanterns"],pro=["Sehr verbreitet (fast 2 Mio. Downloads)","In der offiziellen Punchy-Collection"],contra=["Kupfer-Unterstützung nicht erwähnt"]),
   dict(id="better",label="Better Lanterns (bisher)",behalten=["better-lanterns"],weg=["luminous-lanterns","drigo-3d-lanterns-x-punchy"],pro=["Schöne 3D-Ketten und Laternen"],contra=["Nicht für Punchy gemacht, in der Hand eventuell flach"]),
  ],empfehlung="luminous",quelle="Punchy! Compat Collection"),
 dict(id="menues",art="D",titel="Animierte Menüs",frage="Spatial GUI warnt vor Konflikten mit anderen Mods, die die Menüs verändern.",
  optionen=[
   dict(id="spatial",label="Spatial GUI",behalten=["spatial-gui"],weg=["immersive-ui"],pro=["Hat ausdrücklich Kompatibilität mit Punchy und Punchy! Moves","Auffälliger, räumlicher Effekt"],contra=["Weniger vanilla, eher ein Hingucker"]),
   dict(id="immersive",label="Immersive UI",behalten=["immersive-ui"],weg=["spatial-gui"],pro=["Dezenter, wirkt wie ein Vanilla-Update"],contra=["Keine Punchy-Kompatibilität erwähnt"]),
   dict(id="keins",label="Keins von beiden",behalten=[],weg=["spatial-gui","immersive-ui"],pro=["Null Risiko"],contra=["Menüs bleiben statisch"]),
  ],empfehlung="spatial",quelle="Spatial-GUI-Projektseite"),
 dict(id="vollbild",art="K",titel="Randloser Vollbildmodus",frage="Cubes Without Borders und Borderless Fullscreen sind laut Modrinth inkompatibel.",
  optionen=[
   dict(id="borderless",label="Borderless Fullscreen",behalten=["borderless-fullscreen"],weg=["cubes-without-borders"],pro=["Schlank, macht genau eine Sache"],contra=["Weniger Einstellungen"]),
   dict(id="cubes",label="Cubes Without Borders",behalten=["cubes-without-borders"],weg=["borderless-fullscreen"],pro=["Mehr Optionen, aktiv gepflegt"],contra=["Größer, mehr als nötig"]),
  ],empfehlung="borderless",quelle="Modrinth-Abhängigkeiten"),
 dict(id="nether",art="K",titel="Nether (Vanilla Plus)",frage="Incendium ist laut eigener Seite nicht mit Amplified Nether kompatibel.",
  optionen=[
   dict(id="incendium",label="Incendium",behalten=["incendium"],weg=["amplified-nether"],pro=["Neue Biome und große Strukturen"],contra=["Mehr neuer Inhalt, weniger vanilla"]),
   dict(id="amplified",label="Amplified Nether",behalten=["amplified-nether"],weg=["incendium"],pro=["Nur höheres, dramatischeres Terrain, sonst vanilla"],contra=["Keine neuen Strukturen"]),
   dict(id="keins",label="Vanilla-Nether",behalten=[],weg=["incendium","amplified-nether"],pro=["Kein Risiko"],contra=["Nether bleibt, wie er ist"]),
  ],empfehlung="amplified",quelle="Incendium-Projektseite"),
 dict(id="crosshair",art="K",titel="Dynamisches Fadenkreuz",frage="Dynamic Crosshair kann laut eigener Seite Probleme mit ImmediatelyFast haben, einer Kern-Mod.",
  optionen=[
   dict(id="ohne",label="Weglassen",behalten=[],weg=["dynamiccrosshair"],pro=["ImmediatelyFast bleibt ohne Risiko"],contra=["Normales Fadenkreuz"]),
   dict(id="testen",label="Trotzdem testen",behalten=["dynamiccrosshair"],weg=[],pro=["Fadenkreuz passt sich an"],contra=["Möglicher Konflikt mit einer Kern-Mod"]),
  ],empfehlung="ohne",quelle="Dynamic-Crosshair-Projektseite"),
 dict(id="fussspuren",art="D",titel="Fußspuren",frage="Soft Imprints und FootprintParticle hinterlassen beide Spuren. Auf Schnee und Sand doppelt.",
  optionen=[
   dict(id="imprints",label="Soft Imprints",behalten=["snow-imprints"],weg=["footprintparticle"],pro=["Echte Abdrücke im Block","Rein clientseitig"],contra=["Nur Schnee und Sand"]),
   dict(id="particle",label="FootprintParticle",behalten=["footprintparticle"],weg=["snow-imprints"],pro=["Spuren auf vielen weichen Blöcken, auch von Mobs"],contra=["Modrinth sagt „Server nötig“, ungeprüft","Nur Partikel, verschwinden"]),
  ],empfehlung="imprints",quelle="Projektseiten"),
 dict(id="regen-sound",art="D",titel="Regengeräusche",frage="Cool Rain und Gentler Weather Sounds verändern beide den Regen.",
  optionen=[
   dict(id="cool",label="Cool Rain",behalten=["coolrain"],weg=["gentler-weather-sounds"],pro=["Regen klingt je nach Block anders (Blech, Holz, Laub)"],contra=["Kann bei starkem Regen viel werden"]),
   dict(id="gentler",label="Gentler Weather Sounds",behalten=["gentler-weather-sounds"],weg=["coolrain"],pro=["Ruhigere, angenehmere Vanilla-Sounds"],contra=["Kein Unterschied nach Untergrund"]),
  ],empfehlung="cool",quelle="Projektseiten"),
 dict(id="rauch",art="D",titel="Rauch",frage="Subtle Effects ersetzt den Vanilla-Rauch, Better Smoke den Lagerfeuer-Rauch.",
  optionen=[
   dict(id="subtle",label="Nur Subtle Effects",behalten=[],weg=["better-smoke"],pro=["Ein Mod weniger"],contra=["Lagerfeuer-Rauch bleibt fast vanilla"]),
   dict(id="beide",label="Beide",behalten=["better-smoke"],weg=[],pro=["Rauchsäulen ziehen im Wind"],contra=["Laut Autor auf schwachen PCs grafiklastig"]),
  ],empfehlung="beide",quelle="Projektseiten"),
 dict(id="shulker",art="D",titel="Shulker-Vorschau (Vanilla Plus)",frage="Shulker Box Tooltip und Easy Shulker Boxes zeigen beide den Inhalt im Tooltip.",
  optionen=[
   dict(id="tooltip",label="Shulker Box Tooltip",behalten=["shulkerboxtooltip"],weg=["easy-shulker-boxes"],pro=["Läuft auf Vanilla-Servern"],contra=["Nur Vorschau, kein Öffnen aus dem Inventar"]),
   dict(id="easy",label="Easy Shulker Boxes",behalten=["easy-shulker-boxes"],weg=["shulkerboxtooltip"],pro=["Vorschau und Öffnen aus dem Inventar"],contra=["Braucht die Mod auf dem Server"]),
  ],empfehlung="tooltip",quelle="Easy-Shulker-Boxes-Projektseite"),
 dict(id="kontinente",art="D",titel="Kontinente (Vanilla Plus)",frage="Tectonic formt seit v3 selbst kontinentartige Landmassen.",
  optionen=[
   dict(id="tectonic",label="Nur Tectonic",behalten=["tectonic"],weg=["continents"],pro=["Ein Mod für Berge, Täler und Kontinente","Offiziell mit Terralith kompatibel"],contra=[]),
   dict(id="continents",label="Continents statt Tectonic",behalten=["continents"],weg=["tectonic"],pro=["Echte große Ozeane zwischen Kontinenten"],contra=["Weniger spektakuläre Berge"]),
  ],empfehlung="tectonic",quelle="Tectonic-Projektseite"),
 dict(id="biome",art="D",titel="Biom-Überarbeitung (Vanilla Plus)",frage="Terralith, Geophilic und WWOO überarbeiten alle die Biome.",
  optionen=[
   dict(id="terralith",label="Terralith",behalten=["terralith"],weg=["geophilic","wwoo"],pro=["Viele neue Biome nur aus Vanilla-Blöcken","Mit Tectonic offiziell kompatibel"],contra=["Verändert die Welt deutlich"]),
   dict(id="geophilic",label="Geophilic",behalten=["geophilic"],weg=["terralith","wwoo"],pro=["Nur dezente Überarbeitung der Vanilla-Biome","Mit Tectonic kompatibel"],contra=["Weniger Abwechslung"]),
   dict(id="wwoo",label="WWOO",behalten=["wwoo"],weg=["terralith","geophilic"],pro=["Gute Kompatibilität mit anderen Weltgenerierungs-Mods"],contra=["Weniger verbreitet"]),
  ],empfehlung="terralith",quelle="Projektseiten Geophilic, WWOO, Terralith"),
 dict(id="wolken",art="D",titel="Wolken und Himmel",frage="Photon zeichnet eigene Wolken und einen eigenen Himmel.",
  optionen=[
   dict(id="photon",label="Nur Photon",behalten=[],weg=["better-clouds","dramatic-skys"],pro=["Kein doppeltes Rendern"],contra=["Ohne Shader gibt es nur Vanilla-Wolken"]),
   dict(id="ohne-shader",label="Better Clouds als Fallback",behalten=["better-clouds"],weg=["dramatic-skys"],pro=["Schöne Wolken, falls Freunde ohne Shader spielen"],contra=["Mit Photon wirkungslos, also unnötig im Pack"]),
  ],empfehlung="photon",quelle="Photon-Quellcode"),
]
T=[  # still-to-test relations (no decision, info)
 ("T",["chunks-fade-in","voxy"],"Chunks fade in nennt nur Distant Horizons und Iris als „größtenteils“ unterstützt."),
 ("T",["wakes","photon-shader"],"Wakes nennt bekannte Probleme mit Iris-Shadern."),
 ("T",["better-block-entities","entity-model-features"],"Better Block Entities ist nur teilweise mit EMF kompatibel."),
 ("T",["xaeros-minimap","fresh-animations"],"Mob-Icons werden falsch angezeigt. Zusatz-Pack „Xaero Minimap X Fresh Animations“ nötig."),
 ("T",["punchymoves","not-enough-animations"],"Falls beide drin sind: beide animieren den Spieler in Third Person."),
 ("K",["voxy","distanthorizons"],"Zwei LOD-Mods. Entschieden: Voxy."),
 ("K",["nvidium","iris"],"Nvidium funktioniert nicht mit Iris."),
 ("D",["photon-shader","lambdynamiclights"],"Beide machen Licht in der Hand. In Photon ausgeschaltet."),
 ("D",["photon-shader","particle-rain"],"Beide machen Sandsturm und Nebel. Je eine Seite ausgeschaltet."),
 ("D",["particle-rain","immersive-storms"],"Immersive Storms schaltet seine Sandstürme selbst ab."),
 ("A",["fresh-animations","entity-model-features","entitytexturefeatures"],"Fresh Animations braucht EMF und ETF."),
 ("A",["first-person-model","not-enough-animations"],"First-person Model braucht NEA."),
 ("A",["punchymoves","fluid-foolish"],"Punchy! Moves braucht Fluid & Foolish für Animationen."),
 ("A",["hyper-punchy","punchy-fpa"],"Hyper Punchy ist ein Pack für Punchy!."),
 ("A",["fresh-food-for-hyper-punchy","hyper-punchy","theones-eating-animation-pack"],"Mit Hyper Punchy plus Ess-Animations-Pack den Fix dazunehmen."),
 ("A",["new-glowing-ores","continuity"],"Leuchtende Erze brauchen Continuity."),
 ("A",["streams-reflowing","chunky"],"Streams Reflowing empfiehlt Vorgenerieren mit Chunky."),
 ("S",["terralith","tectonic"],"Offiziell kompatibel (Mod-Versionen)."),
 ("S",["tectonic","clifftree"],"Seit Tectonic 3.0 ohne Zusatz kompatibel."),
 ("S",["c2me-fabric","lithium","scalablelux"],"Von C2ME empfohlen."),
 ("S",["modernfix-mvus","ferrite-core"],"Von ModernFix empfohlen."),
 ("S",["subtle-effects","visuality"],"Laut Subtle-Effects-FAQ kompatibel."),
 ("S",["particle-rain","photon-shader"],"Particle Rain empfiehlt Photon."),
 ("S",["spatial-gui","punchy-fpa","punchymoves"],"Spatial GUI hat eigene Punchy-Kompatibilität."),
 ("S",["glowing-glints","punchy-fpa"],"Enchantment Outlines ist Punchy-kompatibel."),
 ("S",["ct-overhaul-village","towns-and-towers"],"Beide bestätigen Kompatibilität."),
]
R=[dict(art=a,mods=m,text=t) for a,m,t in T]
for d in D:
    for o in d['optionen']:
        for s in o['behalten']+o['weg']: assert s in by, s
json.dump(dict(entscheidungen=D,beziehungen=R),open('decisions.json','w'),ensure_ascii=False,indent=1)
json.dump(M,open('mods.json','w'),ensure_ascii=False,indent=1)
# settings gsync
Sx=json.load(open('settings.json'))
for g in Sx['gruppen']:
    if g['id']=='minecraft':
        for w in g['werte']:
            if w[0].startswith('VSync'):
                w[0]="VSync / FPS-Limit (G-Sync)"; w[1]="Im Spiel: VSync aus, Limit 140"; w[2]="VSync an, unbegrenzt"
                w[3]="Mit G-Sync: im NVIDIA-Treiber G-Sync für Vollbild und Fenstermodus an, VSync an, Low Latency „An“. Im Spiel VSync aus und auf 140 begrenzen, knapp unter 144 Hz. So gibt es kein Tearing und keine Extra-Verzögerung."
        g['werte'].append(["Vollbild","Randlos (Borderless Fullscreen)","Exklusiv","G-Sync muss dafür im Treiber auch für den Fenstermodus aktiv sein.",""])
json.dump(Sx,open('settings.json','w'),ensure_ascii=False,indent=1)
print(len(M), len(D), len(R))
