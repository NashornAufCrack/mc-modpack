import json
S = {
 "stand":"07.11.2026",
 "versionen":[
  {"name":"Sodium","wert":"0.9.2 (stabil)","warum":"Voxy 0.2.20 verlangt genau diese Version. Die Betas 0.9.3 von heute nicht nehmen."},
  {"name":"Iris","wert":"1.11.7","warum":"Voxy-Changelog: läuft mit Iris 1.11.7, bricht mit Iris 1.12 oder neuer."},
  {"name":"Voxy","wert":"0.2.20-beta","warum":"Einzige 26.3-Version. Beta, aber Standard für Voxy."},
  {"name":"Photon","wert":"v1.4 (19.10.2026)","warum":"Unterstützt Voxy offiziell seit v1.3."}
 ],
 "gruppen":[
  {"id":"photon","titel":"Photon-Shader","ort":"Optionen → Grafik → Shader-Pakete → Photon → Shader-Einstellungen","hinweis":"Grundlage ist das Profil „Ultra“. Die Namen in Klammern sind die internen Schlüssel aus Photons Quellcode, damit wir die Einstellungen später direkt als Datei ins Pack legen können.",
   "werte":[
    ["Profil","Ultra","High","Die 3080 schafft Ultra. Ultra schaltet farbiges Licht, Wasser-Kaustiken und Block-Schatten ein.","profile"],
    ["Schattenauflösung","3072","2048","Schärfere Schatten. Kostet etwas VRAM, die 3080 hat genug.","shadowMapResolution"],
    ["Schattendistanz","192","128","Schatten reichen weiter. Wenn FPS fehlen, zuerst hier auf 160 oder 128 zurück: Das bringt laut Voxy-Seite mehr als die Voxy-Distanz zu senken.","shadowDistance"],
    ["Farbiges Licht","An (Ultra)","Aus","Fackeln, Lava und Redstone färben ihre Umgebung. Sehr stimmungsvoll, bleibt vanilla.","COLORED_LIGHTS"],
    ["Umgebungsverdeckung","GTAO","GTAO","Beste Qualität, bleibt.","SHADER_AO"],
    ["Wasser-Kaustiken","An (Ultra)","Aus","Lichtmuster unter Wasser.","WATER_CAUSTICS"],
    ["TAA / TAAU","TAA an, TAAU aus","TAA an, TAAU aus","Volle Auflösung statt Hochskalieren, die 3080 braucht das nicht.","TAAU"],
    ["Schärfen (CAS)","0,50","0,50","Gleicht die leichte TAA-Unschärfe aus.","CAS_INTENSITY"],
    ["Bloom-Stärke","0,80","1,00","Etwas weniger Leuchten, wirkt näher an Vanilla. Geschmackssache.","BLOOM_INTENSITY"],
    ["Tiefenunschärfe / Bewegungsunschärfe","Aus","Aus","Stört beim normalen Spielen. Für Screenshots kurz einschalten.","DOF / MOTION_BLUR"],
    ["Polarlichter","Selten","Nie","Gelegentlich Polarlichter am Nachthimmel. Kleines Highlight.","AURORA_NORMAL"],
    ["Regenbögen, Sonnenstrahlen, Wolkenschatten, Pfützen","An","An","Alles Teil des Photon-Looks, bleibt an.","RAINBOWS / CREPUSCULAR_RAYS / CLOUD_SHADOWS / RAIN_PUDDLES"],
    ["Wolken","Volumetrisch (Blockwolken aus)","Volumetrisch","Photon zeichnet eigene Wolken. Wer es vanilla-näher will: Blockwolken an.","BLOCKY_CLOUDS"],
    ["Licht in der Hand","Aus (testen)","An","LambDynamicLights macht das schon. Beides zusammen kann doppelt hell wirken.","HANDHELD_LIGHTING"],
    ["Sandsturm","Aus (testen)","An","Particle Rain bringt eigene Sandstürme mit. Nur eins von beiden aktiv lassen.","DESERT_SANDSTORM"],
    ["Normal- und Specular-Maps","Aus","Aus","Nur sinnvoll mit einem PBR-Resource-Pack. Haben wir nicht.","NORMAL_MAPPING / SPECULAR_MAPPING"]
   ]},
  {"id":"voxy","titel":"Voxy","ort":"Optionen → Grafik → Seite „Voxy“ (im Sodium-Menü)","hinweis":"Nebel und SSAO von Voxy sind ausgegraut, solange ein Shader aktiv ist. Photon übernimmt das. Auf Vanilla-Servern sieht Voxy nur Gebiete, die du selbst geladen hast. Bestehende Einzelspielerwelten lassen sich mit /voxy import world \"Weltname\" komplett einlesen.",
   "werte":[
    ["Sichtweite","512 Chunks","512 Chunks","Standard ist schon sehr weit. Mit der 3080 sind 768 einen Test wert.","render_distance"],
    ["Unterteilung (Pixel²)","64","64","Kleiner heißt detaillierter in der Ferne. 48 ausprobieren, wenn FPS übrig sind.","subdivision_size"],
    ["Sodium-Threads mitnutzen","An","Aus","Laut Voxy weniger Ruckler bei schnellem Fliegen mit großer Sichtweite.","dont_use_sodium_builder_threads"],
    ["Chunk-Ingest","An","An","Wandelt neue Chunks in LODs um. Muss an bleiben.","ingest_enabled"],
    ["Service-Threads","Standard","Kerne ÷ 1,5","Automatisch passend zur CPU.","service_threads"]
   ]},
  {"id":"minecraft","titel":"Minecraft-Grafik & Sodium","ort":"Optionen → Grafik","hinweis":"Mit Voxy muss die normale Sichtweite nicht hoch sein. Voxy übernimmt alles dahinter.",
   "werte":[
    ["Sichtweite","16 Chunks","12","Alles dahinter zeigt Voxy. Mehr kostet FPS ohne sichtbaren Gewinn.",""],
    ["Simulationsdistanz","10","12","Leicht reduziert, entlastet die CPU. Auf Servern bestimmt der Server.",""],
    ["Grafik","Schön (Fancy)","Schön","Mit Iris-Shadern wird ohnehin Photon genutzt.",""],
    ["Wolken","Aus","Schön","Photon zeichnet eigene Wolken. Vanilla-Wolken würden doppelt erscheinen.",""],
    ["VSync / Max. FPS","VSync aus, FPS = Monitor-Hz","Unbegrenzt","Dynamic FPS drosselt automatisch im Hintergrund.",""],
    ["Mipmap-Stufen","4","4","Weniger Flimmern in der Ferne.",""],
    ["Biom-Übergang","5×5","2","Weichere Farbübergänge. Mit Better Biome Blend ohne Leistungsverlust.",""],
    ["Sodium: Nebel-Verdeckung, Entity-Culling, nur sichtbare Texturen animieren","An","An","Reine Leistungsgewinne, bleiben an.",""]
   ]},
  {"id":"mods","titel":"Mod-Einstellungen","ort":"Mod Menu → Mod auswählen → Einstellungen","hinweis":"Alles, was hier nicht steht, bleibt auf Standard. Die meisten Mods sind ab Werk gut eingestellt.",
   "werte":[
    ["Continuity","Beide eingebauten Packs aktivieren","Aus","„Default Connected Textures“ und „Glass Pane Culling Fix“ unter Resource Packs einschalten, sonst sieht man kaum etwas.","continuity"],
    ["LambDynamicLights","Modus „Fancy“, Entities und Block-Entities an","Fancy","Weiche Lichtübergänge.","lambdynamiclights"],
    ["Particle Rain","Nebel aus, Sandsturm an, Wellen und Tropfen an","Nebel an","Photon macht den Nebel. Config mit /particlerain.","particle-rain"],
    ["Sound Physics Remastered","Standard","","Wenn der Hall zu stark ist: Hall-Verstärkung senken.","sound-physics-remastered"],
    ["AmbientSounds","Lautstärke ca. 80 %","100 %","Config mit /cmdclientconfig.","ambientsounds"],
    ["Presence Footsteps","Lautstärke ca. 70 %","100 %","Schritte sonst etwas laut gegenüber Vanilla-Sounds.","presence-footsteps"],
    ["Zoomify","Zoom 3×, Scroll-Zoom an","","Weicher Zoom, mit dem Mausrad feiner.","zoomify"],
    ["Dynamic FPS","Hintergrund 15 FPS, Ton leiser im Hintergrund","","Spart Strom und Hitze beim Alt-Tab.","dynamic-fps"],
    ["Better Clouds","Nicht nötig","","Photon zeichnet eigene Wolken. Nur ohne Shader sinnvoll.","better-clouds"],
    ["YOSBR","Unsere Standard-Einstellungen in config/yosbr/ ablegen","","So bringt das Pack alles oben Genannte mit, ohne bei Updates deine eigenen Einstellungen zu überschreiben.","yosbr"]
   ]},
  {"id":"rp","titel":"Resource-Pack-Reihenfolge","ort":"Optionen → Resource Packs (oben = höchste Priorität)","hinweis":"Fresh Animations braucht die Mods EMF und ETF. Die Fresh-Animations-Erweiterungen müssen laut Autor über Fresh Animations liegen.",
   "werte":[
    ["1 (oben)","Fresh Animations: Extensions / Player","","Erweiterungen immer über dem Basis-Pack.",""],
    ["2","Fresh Animations","","Basis für alle Mob-Animationen.",""],
    ["3","3D-Packs (Laternen, Fackeln, Schienen, Leitern)","","Ändern Block-Modelle, kollidieren selten.",""],
    ["4","Optik-Packs (Low On Fire, Enchanted Books, Armor Trims, Container-GUI)","","Ändern einzelne Texturen und Menüs.",""],
    ["5","Continuity-Packs (Connected Textures, Glass Pane Fix)","","Kommen mit der Mod.",""],
    ["6 (unten)","Standard-Ressourcen","","Immer ganz unten.",""],
    ["Weglassen","Dramatic Skys","","Wirkt nur mit benutzerdefiniertem Himmel. Photon nutzt seinen eigenen Himmel.",""]
   ]}
 ]
}
json.dump(S,open('settings.json','w'),ensure_ascii=False,indent=1)

# update mods.json roles/notes
M=json.load(open('mods.json'))
upd={
 "voxy":("K","Gewählt: unsere LOD-Fernsicht. Version an Sodium 0.9.2 + Iris 1.11.7 gebunden."),
 "distanthorizons":("A","Nicht gewählt (wir nehmen Voxy). Nur falls Voxy mal fehlt."),
 "photon-shader":("K","Gewählt: Standard-Shader. Unterstützt Voxy offiziell (ab v1.3)."),
 "complementary-reimagined":("A","Gute Alternative zu Photon, sehr vanilla-treu."),
 "euphoria-patches":("A","Nur relevant, falls wir zu Complementary wechseln."),
 "better-clouds":("A","Mit Photon überflüssig, Photon zeichnet eigene Wolken."),
 "dramatic-skys":("A","Mit Photon wirkungslos, Photon nutzt eigenen Himmel."),
 "nvidium":("A","Läuft nicht mit Iris. Voxy hat eine eigene NVIDIA-Option."),
}
for m in M:
    if m['slug'] in upd: m['rolle'],m['notiz']=upd[m['slug']]
# photon slug in data? ensure
if not any(m['slug']=='photon-shader' for m in M):
    for m in M:
        if m['slug']=='photon-shader': pass
setkeys={g['id'] for g in S['gruppen']}
modset={w[4] for g in S['gruppen'] if g['id']=='mods' for w in g['werte']}
for m in M:
    m['einstellungen']= 'voxy' if m['slug']=='voxy' else ('photon' if m['slug'] in ('photon-shader','iris') else ('mods' if m['slug'] in modset else None))
json.dump(M,open('mods.json','w'),ensure_ascii=False,indent=1)
print([ (m['slug'],m['rolle']) for m in M if m['slug'] in upd or m['slug']=='photon-shader'])
