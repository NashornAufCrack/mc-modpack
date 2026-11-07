import json
# art: K=Konflikt (nicht zusammen), D=Doppelt (eins wählen/abschalten), T=Testen, A=Abhängigkeit/Zusatz nötig, S=Passt gut zusammen
O = [
 ("K",["cubes-without-borders","borderless-fullscreen"],"Beide machen randlosen Vollbildmodus. Modrinth führt sie als inkompatibel.","Nur Borderless Fullscreen behalten.","Modrinth-Abhängigkeiten"),
 ("K",["voxy","distanthorizons"],"Zwei LOD-Mods für dieselbe Aufgabe.","Voxy (entschieden).","Eigene Prüfung"),
 ("K",["nvidium","iris"],"Nvidium funktioniert nicht zusammen mit Iris.","Nvidium weglassen. Voxy hat eine eigene NVIDIA-Option.","voxy-mod.com"),
 ("K",["incendium","amplified-nether"],"Incendium ist laut eigener Seite nicht mit Amplified Nether kompatibel.","Für die Vanilla-Plus-Schicht eins wählen.","Incendium-Projektseite"),
 ("K",["dynamiccrosshair","immediatelyfast"],"Dynamic Crosshair kann laut eigener Seite Probleme mit ImmediatelyFast haben, und ImmediatelyFast ist Kern.","Dynamic Crosshair weglassen.","Dynamic-Crosshair-Projektseite"),
 ("D",["photon-shader","better-clouds"],"Photon zeichnet eigene volumetrische Wolken.","Better Clouds weglassen, Vanilla-Wolken aus.","Photon-Quellcode"),
 ("D",["photon-shader","dramatic-skys"],"Dramatic Skys braucht einen benutzerdefinierten Himmel, Photon nutzt standardmäßig den eigenen.","Dramatic Skys weglassen.","Photon-Quellcode"),
 ("D",["photon-shader","lambdynamiclights"],"Beide lassen Licht in der Hand leuchten.","LambDynamicLights behalten (beleuchtet auch andere Spieler und Items). In Photon „Licht in der Hand“ aus.","Photon-Quellcode"),
 ("D",["photon-shader","particle-rain"],"Beide bringen Sandsturm und Nebel mit.","In Photon Sandsturm aus, in Particle Rain Nebel aus. Particle Rain empfiehlt Photon ausdrücklich.","Particle-Rain-Projektseite"),
 ("D",["particle-rain","immersive-storms"],"Beide machen Sandstürme.","Erledigt sich selbst: Immersive Storms schaltet seine Sandstürme ab, wenn Particle Rain installiert ist.","Immersive-Storms-Projektseite"),
 ("D",["snow-imprints","footprintparticle"],"Beide hinterlassen Fußspuren, auf Schnee und Sand doppelt.","Soft Imprints behalten (rein clientseitig, echte Abdrücke).","Projektseiten"),
 ("D",["coolrain","gentler-weather-sounds"],"Beide verändern Regengeräusche.","Eins wählen. Cool Rain: Regen klingt je nach Block anders. Gentler: ruhigere Vanilla-Sounds.","Projektseiten"),
 ("D",["tectonic","continents"],"Tectonic formt seit v3 selbst kontinentartige Landmassen.","Nur Tectonic, Continents weglassen.","Tectonic-Projektseite"),
 ("D",["terralith","geophilic"],"Geophilic überarbeitet Vanilla-Biome, Terralith ersetzt viele davon. Geht nur mit Kompatibilitäts-Anpassung.","Mit Terralith Geophilic weglassen.","Geophilic-Projektseite"),
 ("D",["terralith","wwoo"],"Beide überarbeiten die Biome komplett.","Terralith + Tectonic, WWOO nur als Alternative.","WWOO-Projektseite"),
 ("D",["immersive-ui","spatial-gui"],"Spatial GUI warnt vor Konflikten mit anderen Mods, die die Menüs verändern.","Eins von beiden wählen.","Spatial-GUI-Projektseite"),
 ("D",["shulkerboxtooltip","easy-shulker-boxes"],"Beide zeigen den Inhalt von Shulkerkisten im Tooltip.","Visual-Pack: Shulker Box Tooltip. Vanilla Plus: Easy Shulker Boxes kann es selbst.","Easy-Shulker-Boxes-Projektseite"),
 ("D",["subtle-effects","better-smoke"],"Subtle Effects ersetzt den Vanilla-Rauch, Better Smoke den Lagerfeuer-Rauch.","Erst nur Subtle Effects. Better Smoke nur dazu, wenn Lagerfeuer noch schöner sein sollen.","Projektseiten"),
 ("T",["fa-player-extension","not-enough-animations"],"Beide animieren den Spieler neu.","Im Test schauen, ob sich Animationen überlagern. Sonst NEA behalten.","Eigene Prüfung"),
 ("T",["fa-player-extension","first-person-model"],"FA Player bringt eigene Ego-Animationen mit, First-person Model zeigt den Körper in der Ego-Sicht.","Zusammen testen. Bei Darstellungsfehlern First-person Model weglassen.","Eigene Prüfung"),
 ("T",["3dskinlayers","fa-player-extension"],"3D Skin Layers: Schwebende Skin-Teile kommen laut FAQ von veralteten EMF-Resource-Packs.","FA Player immer passend zur MC-Version halten.","3D-Skin-Layers-Projektseite"),
 ("T",["xaeros-minimap","fresh-animations"],"Fresh Animations verändert die Mob-Modelle. Dadurch zeigt die Minimap Mob-Icons falsch oder nur als Punkte.","Zusatz-Pack „Xaero Minimap X Fresh Animations“ dazunehmen.","Xaero-Projektseite"),
 ("T",["chunks-fade-in","voxy"],"Chunks fade in nennt nur Distant Horizons und Iris als „größtenteils“ unterstützt, Voxy gar nicht.","Mit Voxy + Photon testen, sonst weglassen.","Chunks-fade-in-Projektseite"),
 ("T",["wakes","photon-shader"],"Wakes nennt bekannte Probleme mit Iris-Shadern.","Mit Photon-Wasser testen.","Wakes-Projektseite"),
 ("T",["better-block-entities","entity-model-features"],"Better Block Entities ist nur teilweise mit EMF kompatibel, nicht alle EMF-Packs funktionieren.","Betrifft vor allem Truhen und Schilder in Resource Packs. Im Test prüfen.","Better-Block-Entities-Projektseite"),
 ("A",["fresh-animations","entity-model-features","entitytexturefeatures"],"Fresh Animations funktioniert nur mit EMF und ETF.","Immer zusammen installieren.","Fresh-Animations-Projektseite"),
 ("A",["first-person-model","not-enough-animations"],"First-person Model braucht Not Enough Animations.","Wird automatisch mitgeladen.","Modrinth-Abhängigkeiten"),
 ("A",["new-glowing-ores","continuity"],"Leuchtende Erze funktionieren auf Fabric nur mit Continuity.","Continuity ist sowieso Kern.","New-Glowing-Ores-Projektseite"),
 ("A",["streams-reflowing","chunky"],"Streams Reflowing empfiehlt, die Welt vorher mit Chunky vorzugenerieren.","Bei neuen Vanilla-Plus-Welten Chunky laufen lassen.","Streams-Reflowing-Projektseite"),
 ("S",["terralith","tectonic"],"Terralith ist mit der Mod-Version von Tectonic voll kompatibel.","Mod-Versionen nehmen, nicht die Datapacks.","Terralith- und Tectonic-Projektseiten"),
 ("S",["tectonic","clifftree"],"Seit Tectonic 3.0 funktionieren beide ohne Zusatz zusammen.","",""),
 ("S",["c2me-fabric","lithium","scalablelux"],"C2ME empfiehlt selbst die Kombination mit Lithium und ScalableLux.","",""),
 ("S",["modernfix-mvus","ferrite-core"],"ModernFix empfiehlt, FerriteCore immer dazuzunehmen.","",""),
 ("S",["subtle-effects","visuality"],"Subtle Effects bestätigt im FAQ: funktioniert zusammen mit Visuality.","",""),
 ("S",["particle-rain","photon-shader"],"Particle Rain empfiehlt Photon als realistischen Shader.","",""),
 ("S",["ct-overhaul-village","towns-and-towers"],"Beide Projektseiten bestätigen, dass sie zusammen funktionieren.","",""),
]
json.dump([dict(art=a,mods=m,text=t,loesung=l,quelle=q) for a,m,t,l,q in O],open('overlaps.json','w'),ensure_ascii=False,indent=1)

# fix mods.json
M=json.load(open('mods.json'))
fix={
 "streams-reflowing":dict(cat="T",sub="Terrain",ampel="R",rolle="O",notiz="Echte Bäche und Seen in der Weltgenerierung. Mit Chunky vorgenerieren."),
 "wet-sand":dict(cat="G",sub="Inhalt",ampel="R",rolle="O",notiz="Nasser Sand mit eigener Mechanik (fällt nicht, Zuckerrohr wächst darauf)."),
 "coolrain":dict(cat="V",sub="Sound",ampel="G",rolle="O",notiz="Regen klingt je nach Block anders (Blech, Holz, Laub). Doppelt mit Gentler Weather Sounds."),
 "footprintparticle":dict(rolle="A",notiz="Fußspuren als Partikel. Doppelt mit Soft Imprints, das wir bevorzugen."),
 "snow-imprints":dict(rolle="O",notiz="Echte Abdrücke in Schnee und Sand, rein clientseitig."),
 "dynamiccrosshair":dict(rolle="A",notiz="Kann laut eigener Seite Probleme mit ImmediatelyFast haben. Eher weglassen."),
 "cubes-without-borders":dict(notiz="Inkompatibel mit Borderless Fullscreen, nur eins von beiden."),
 "continents":dict(rolle="A",notiz="Tectonic macht seit v3 selbst Kontinente. Nur ohne Tectonic sinnvoll."),
 "geophilic":dict(rolle="A",notiz="Überarbeitet Vanilla-Biome. Mit Terralith nur mit Anpassung, daher Alternative."),
 "amplified-nether":dict(notiz="Höherer Nether. Nicht zusammen mit Incendium."),
 "incendium":dict(notiz="Nether-Biome und Strukturen. Nicht zusammen mit Amplified Nether."),
 "chunks-fade-in":dict(notiz="Chunks blenden weich ein. Mit Voxy noch ungetestet."),
 "better-smoke":dict(notiz="Schönerer Lagerfeuer-Rauch. Subtle Effects ersetzt schon den normalen Rauch."),
 "spatial-gui":dict(notiz="Inventar schwebt räumlich. Nicht zusammen mit Immersive UI."),
 "immersive-ui":dict(notiz="Animierte Menüs. Nicht zusammen mit Spatial GUI."),
 "recolourful-containers-gui":dict(notiz="Farbige Container-Menüs. Modus „Vanilla+“ wählen."),
}
for m in M:
    if m['slug'] in fix: m.update(fix[m['slug']])
# overlap flag
idx={}
for o in json.load(open('overlaps.json')):
    for s in o['mods']: idx.setdefault(s,set()).add(o['art'])
for m in M: m['ueberschneidung']=''.join(sorted(idx.get(m['slug'],[])))
json.dump(M,open('mods.json','w'),ensure_ascii=False,indent=1)

# 1440p settings
S=json.load(open('settings.json'))
S['ziel']="1440p · 144 Hz · RTX 3080"
ph=S['gruppen'][0]
ph['hinweis']="Ziel: 1440p mit möglichst stabilen 144 FPS. Deshalb Basis „High“ plus ausgewählte Ultra-Effekte statt vollem Ultra. Unter jedem Namen steht klein der interne Schlüssel aus Photons Quellcode."
ph['werte']=[
 ["Profil","High, dann einzelne Ultra-Effekte an","High","Volles Ultra kostet bei 1440p zu viel für 144 FPS. Die schönsten Ultra-Effekte schalten wir einzeln dazu.","profile"],
 ["Farbiges Licht","An","Aus (High)","Der stärkste sichtbare Ultra-Effekt: Fackeln, Lava und Redstone färben die Umgebung.","COLORED_LIGHTS"],
 ["Wasser-Kaustiken","An","Aus (High)","Lichtmuster unter Wasser, kostet wenig.","WATER_CAUSTICS"],
 ["Block-Schatten (Truhen, Schilder)","Aus","Aus (High)","Kaum sichtbar, kostet bei vielen Truhen spürbar.","BLOCK_ENTITY_SHADOWS"],
 ["Schattenauflösung","2048","2048","Bei 1440p reicht 2048. 3072 nur, wenn deutlich über 144 FPS übrig sind.","shadowMapResolution"],
 ["Schattendistanz","160","128","Etwas weiter als Standard. Erste Stellschraube, wenn FPS fehlen.","shadowDistance"],
 ["Umgebungsverdeckung","GTAO","GTAO","Beste Qualität, bleibt.","SHADER_AO"],
 ["TAA / TAAU","TAA an, TAAU aus","TAA an, TAAU aus","Erst mal volle Auflösung. TAAU ist die Reserve, siehe FPS-Leiter unten.","TAAU"],
 ["Schärfen (CAS)","0,50","0,50","Gleicht die leichte TAA-Unschärfe aus.","CAS_INTENSITY"],
 ["Bloom-Stärke","0,80","1,00","Etwas weniger Leuchten, wirkt näher an Vanilla. Geschmackssache.","BLOOM_INTENSITY"],
 ["Tiefenunschärfe / Bewegungsunschärfe","Aus","Aus","Stört beim normalen Spielen. Für Screenshots kurz einschalten.","DOF / MOTION_BLUR"],
 ["Polarlichter","Selten","Nie","Gelegentlich Polarlichter am Nachthimmel.","AURORA_NORMAL"],
 ["Regenbögen, Sonnenstrahlen, Wolkenschatten, Pfützen","An","An","Teil des Photon-Looks, bleibt an.","RAINBOWS / CREPUSCULAR_RAYS / CLOUD_SHADOWS / RAIN_PUDDLES"],
 ["Wolken","Volumetrisch (Blockwolken aus)","Volumetrisch","Photon zeichnet eigene Wolken. Vanilla-näher: Blockwolken an.","BLOCKY_CLOUDS"],
 ["Licht in der Hand","Aus","An","LambDynamicLights übernimmt das, sonst doppelt.","HANDHELD_LIGHTING"],
 ["Sandsturm","Aus","An","Particle Rain macht die Sandstürme, sonst doppelt.","DESERT_SANDSTORM"],
 ["Normal- und Specular-Maps","Aus","Aus","Nur mit PBR-Resource-Pack sinnvoll.","NORMAL_MAPPING / SPECULAR_MAPPING"],
]
S['fpsleiter']=[
 "Schattendistanz 160 → 128",
 "Voxy-Sichtweite 512 → 384 Chunks",
 "TAAU an mit Renderskala 0,85 (rendert intern ca. 1224p, wird auf 1440p hochgerechnet)",
 "Farbiges Licht aus",
 "Minecraft-Sichtweite 16 → 12",
]
for g in S['gruppen']:
    if g['id']=='minecraft':
        for w in g['werte']:
            if w[0].startswith('VSync'):
                w[1]="FPS-Limit 140, VSync im Spiel aus"; w[3]="Bei G-Sync/FreeSync-Monitor: im NVIDIA-Treiber G-Sync und VSync an, im Spiel aus und auf 140 begrenzen. So bleibt das Bild ohne Tearing und ohne Verzögerung."
    if g['id']=='voxy':
        g['werte'][0]=["Sichtweite","512 Chunks","512 Chunks","Für 144 FPS bei 1440p der richtige Startwert. 768 nur testen, wenn FPS übrig sind.","render_distance"]
json.dump(S,open('settings.json','w'),ensure_ascii=False,indent=1)
print(len(O))
