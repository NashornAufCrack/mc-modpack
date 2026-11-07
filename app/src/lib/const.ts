// Aus der alten Seite übernommen (kuratierte Editoren, Leistungskosten)
export const COST={"photon-shader":8,"complementary-reimagined":7,"complementary-unbound":8,"bliss-shader":9,"solas-shader":5,"bsl-shaders":5,"i-like-vanilla":3,"steadfast-shaders":3,"voxy":4,"distanthorizons":5,"living-horizon":3,"physicsmod":8,"particle-rain":3,"subtle-effects":2,"sound-physics-remastered":3,"fresh-animations":3,"fresh-animations-extensions":2,"fresh-animations-objects":2,"wakes":2,"better-smoke":2,"particle-interactions":2,"atmospherics":2,"immersive-storms":2,"chunks-fade-in":2,"spatial-gui":1,"diorama-map":2,"xaeros-world-map":2,"journeymap":3,"grassier-grass":2,"os-colorful-grasses":2,"round-trees":1,"lambdabettergrass":1,"visuality":1,"fallingleaves":1,"windy":1,"ambientsounds":1,"presence-footsteps":1,"punchy-fpa":1,"punchymoves":1,"3dskinlayers":1,"enchanted-fishing-line":1};
export const BOOST=new Set(["sodium","lithium","ferrite-core","immediatelyfast","entityculling","moreculling","modernfix-mvus","badoptimizations","dynamic-fps","krypton","c2me-fabric","scalablelux","better-block-entities","ggtu"]);
export const cost=s=>BOOST.has(s)?0:(COST[s]??1);

export const SETDEF={
 "photon-shader":{file:"Photon-Shader-Datei",items:[
  {k:"COLORED_LIGHTS",t:"bool",d:true,l:"Farbiges Licht",h:"Fackeln, Lava und Redstone färben ihre Umgebung. Kostet etwas Leistung, sieht aber am meisten nach „Ultra“ aus."},
  {k:"WATER_CAUSTICS",t:"bool",d:true,l:"Wasser-Kaustiken",h:"Tanzende Lichtmuster unter Wasser. Kostet wenig."},
  {k:"shadowMapResolution",t:"sel",o:[1024,2048,3072,4096],d:2048,l:"Schattenauflösung",h:"Höher = schärfere Schattenkanten. Bei 1440p reicht 2048."},
  {k:"shadowDistance",t:"sel",o:[96,128,160,192,256],d:160,f:v=>v.toFixed(1),l:"Schattendistanz (Blöcke)",h:"Wie weit Schatten reichen. Die wichtigste Stellschraube für FPS."},
  {k:"BLOOM_INTENSITY",t:"range",min:0,max:1.5,step:.05,d:.8,f:v=>Number(v).toFixed(2),l:"Bloom",h:"Leuchten um helle Stellen. Weniger wirkt vanilla-näher."},
  {k:"AURORA_NORMAL",t:"sel",o:["AURORA_NEVER","AURORA_RARELY","AURORA_ALWAYS"],ol:["Nie","Selten","Immer"],d:"AURORA_RARELY",l:"Polarlichter",h:"Polarlichter am Nachthimmel."},
  {k:"BLOCKY_CLOUDS",t:"bool",d:false,l:"Blockwolken",h:"An = eckige Wolken wie in Vanilla, aus = weiche volumetrische Wolken."},
  {k:"HANDHELD_LIGHTING",t:"bool",d:false,l:"Licht in der Hand (Photon)",h:"Aus lassen, wenn LambDynamicLights drin ist, sonst doppelt hell."},
  {k:"DESERT_SANDSTORM",t:"bool",d:false,l:"Sandsturm (Photon)",h:"Aus lassen, wenn Particle Rain drin ist, das macht eigene Sandstürme."},
  {k:"TAAU",t:"bool",d:false,l:"Upscaling (TAAU)",h:"Rendert intern kleiner und rechnet hoch. Nur einschalten, wenn FPS fehlen."},
  {k:"MOTION_BLUR",t:"bool",d:false,l:"Bewegungsunschärfe",h:"Filmischer Look, stört beim normalen Spielen."}]},
 "particle-rain":{file:"particlerain/config.json",fmt:"json",items:[
  {k:"perf.particleAmount",t:"sel",o:[500,1000,1500,2500],d:1500,l:"Partikelmenge",h:"Wie viele Regen- und Schneepartikel gleichzeitig. Weniger = mehr FPS."},
  {k:"perf.particleDistance",t:"sel",o:[12,16,24,32],d:16,l:"Partikel-Reichweite (Blöcke)",h:"Wie weit um dich herum Wetterpartikel erscheinen."},
  {k:"sound.rainVolume",t:"range",min:0,max:1,step:.05,d:.2,l:"Regen-Lautstärke",h:"Zusätzliche Regengeräusche von Particle Rain."},
  {k:"wind.strength",t:"range",min:0,max:.1,step:.01,d:.03,l:"Windstärke",h:"Wie schräg Regen und Schnee fallen."}]},
 "sound-physics-remastered":{file:"sound_physics_remastered/soundphysics.properties",fmt:"props",items:[
  {k:"enabled",t:"bool",d:true,l:"Aktiv",h:"Hall und Dämpfung je nach Umgebung."},
  {k:"reverb_brightness",t:"range",min:.5,max:2,step:.05,d:1,l:"Hall-Helligkeit",h:"Höher = hellerer, klarerer Hall in Höhlen."},
  {k:"block_absorption",t:"range",min:0,max:3,step:.1,d:1,l:"Dämpfung durch Blöcke",h:"Wie stark Wände Geräusche schlucken."},
  {k:"underwater_filter",t:"range",min:0,max:1,step:.05,d:.9,l:"Unterwasser-Filter",h:"Wie dumpf es unter Wasser klingt."},
  {k:"environment_evaluation_ray_count",t:"sel",o:[16,32,64],d:32,l:"Genauigkeit",h:"Mehr Strahlen = genauerer Hall, kostet CPU."}]},
 "visuality":{file:"visuality.json",fmt:"json",items:[
  {k:"sparkleEnabled",t:"bool",d:true,l:"Glitzern an Erzen und Kristallen",h:"Funkelnde Partikel an Amethyst, Diamanterz usw."},
  {k:"shinyBlocksEnabled",t:"bool",d:true,l:"Glänzende Blöcke",h:"Leichtes Glitzern an Gold- und Diamantblöcken."},
  {k:"shinyArmorEnabled",t:"bool",d:true,l:"Glänzende Rüstung",h:"Glitzern an wertvoller Rüstung."},
  {k:"hitParticlesEnabled",t:"bool",d:true,l:"Treffer-Partikel",h:"Knochen, Federn usw. beim Schlagen von Mobs."},
  {k:"waterCircles.enabled",t:"bool",d:true,l:"Regenringe auf Wasser",h:"Ringe, wenn Regen auf Wasser fällt. Mit Particle Rain doppelt, dann aus."}]},
 "fallingleaves":{file:"fallingleaves2.json",fmt:"json",base:{version:1},items:[
  {k:"enabled",t:"bool",d:true,l:"Fallende Blätter",h:"Blätter fallen von Bäumen."},
  {k:"leafSpawnRate",t:"sel",o:[5,10,15,20],d:10,l:"Menge",h:"Wie viele Blätter fallen."},
  {k:"leafSize",t:"sel",o:[3,5,7],d:5,l:"Größe",h:"Größe der Blätter."},
  {k:"windEnabled",t:"bool",d:true,l:"Wind",h:"Blätter werden vom Wind getragen."}]},
 "explosive-enhancement":{file:"explosiveenhancement.json",fmt:"json",items:[
  {k:"showMushroomCloud",t:"bool",d:true,l:"Pilzwolke",h:"Rauchpilz bei großen Explosionen."},
  {k:"showShockwave",t:"bool",d:true,l:"Druckwelle",h:"Sichtbare Druckwelle am Boden."},
  {k:"showSparks",t:"bool",d:true,l:"Funken",h:"Funkenregen."},
  {k:"dynamicSize",t:"bool",d:true,l:"Größe nach Stärke",h:"Kleine Explosionen sehen kleiner aus."}]},
 "windy":{file:"windy-config.json",fmt:"json",items:[
  {k:"spawnWind",t:"bool",d:true,l:"Windpartikel",h:"Sichtbare Windstreifen in der Höhe."},
  {k:"windFrequency",t:"range",min:.25,max:2,step:.25,d:1,l:"Häufigkeit",h:"Wie oft Windstreifen erscheinen."}]},
 "3dskinlayers":{file:"skinlayers.json",fmt:"json",items:[
  {k:"renderDistanceLOD",t:"sel",o:[8,14,24],d:14,l:"3D-Distanz (Blöcke)",h:"Ab dieser Entfernung wird der Skin wieder flach. Spart Leistung."},
  {k:"enableSkulls",t:"bool",d:true,l:"3D-Spielerköpfe",h:"Auch platzierte Köpfe in 3D."}]},
 "not-enough-animations":{file:"notenoughanimations.json",fmt:"json",base:{configVersion:12},items:[
  {k:"enableEatDrinkAnimation",t:"bool",d:true,l:"Essen und Trinken",h:"Arme bewegen sich beim Essen auch in Third Person."},
  {k:"enableLadderAnimation",t:"bool",d:true,l:"Leiter klettern",h:"Echte Kletteranimation."},
  {k:"enableInWorldMapRendering",t:"bool",d:true,l:"Karten in der Hand",h:"Andere sehen deine Karte."},
  {k:"enableHorseAnimation",t:"bool",d:true,l:"Reiten",h:"Animation beim Reiten."},
  {k:"enableAnimationSmoothing",t:"bool",d:true,l:"Weiche Übergänge",h:"Animationen gehen weicher ineinander über."}]},
 "living-horizon":{file:"livinghorizon.json",fmt:"json",base:{version:13},items:[
  {k:"distantMobs",t:"bool",d:true,l:"Ferne Mobs",h:"Zeigt Tiere und Monster hinter der Sichtweite."},
  {k:"maxDistantMobs",t:"sel",o:[128,256,512,1024],d:512,l:"Max. ferne Mobs",h:"Mehr = lebendiger, kostet etwas Leistung."},
  {k:"mobMaxDistance",t:"sel",o:[256,512,1024],d:512,l:"Mob-Reichweite (Blöcke)",h:"Bis wohin ferne Mobs gezeigt werden."},
  {k:"distantEntities",t:"bool",d:true,l:"Ferne Objekte",h:"Boote, Loren und Rüstungsständer in der Ferne."}]},
 "zoomify":{file:"zoomify.json",fmt:"tpl",items:[
  {k:"initialZoom",t:"sel",o:[2,3,4,6],d:2,l:"Zoom-Stärke",h:"Wie stark beim Drücken von C gezoomt wird. Vorlage aus Studious nutzt 2, Zoomify selbst 4."},
  {k:"zoomKeyBehaviour",t:"sel",o:["hold","toggle"],ol:["Halten","Umschalten"],s:1,d:"hold",l:"Zoom-Taste",h:"Halten = Zoom nur solange gedrückt. Umschalten = einmal drücken an, nochmal aus."},
  {k:"scrollZoom",t:"bool",d:true,l:"Mit Mausrad nachzoomen",h:"Während des Zooms mit dem Mausrad näher ran."},
  {k:"relativeSensitivity",t:"sel",o:[50,75,100],d:100,l:"Maus beim Zoomen (%)",h:"100 = Maus wird beim Zoomen proportional langsamer, fühlt sich natürlich an."}]},
 "cameraoverhaul":{file:"cameraoverhaul.toml",fmt:"tpl",items:[
  {k:"general.enabled",t:"bool",d:true,l:"Aktiv",h:"Schaltet alle Kamera-Effekte an oder aus."},
  {k:"general.turningRollIntensity",t:"sel",o:[0,0.5,1.25,2],d:1.25,l:"Neigen beim Umdrehen",h:"Wie stark die Kamera beim schnellen Drehen kippt. Standard 1.25."},
  {k:"general.cameraSwayIntensity",t:"sel",o:[0,0.3,0.6,1],d:0.6,l:"Schwanken im Stand",h:"Leichtes Atmen der Kamera, wenn du stillstehst. 0 = aus."},
  {k:"general.screenShakesMaxIntensity",t:"sel",o:[0,1,2.5],d:2.5,l:"Max. Bildschirm-Wackeln",h:"Begrenzt Wackeln durch Explosionen und Donner. 0 = kein Wackeln."},
  {k:"walking.strafingRollFactor",t:"sel",o:[0,5,10,15],d:10,l:"Neigen beim Seitwärtslaufen",h:"Kamera kippt beim Gehen nach links/rechts. Standard 10."}]},
 "immersive-hotbar":{file:"immersive-hotbar.json5",fmt:"tpl",items:[
  {k:"selectedItemSize",t:"sel",o:[1,1.1,1.2,1.3],d:1.2,l:"Größe des gewählten Items",h:"Wie stark das ausgewählte Item in der Hotbar wächst."},
  {k:"bouncyAnimation",t:"bool",d:false,l:"Federnde Animation",h:"Items hüpfen beim Wechseln."},
  {k:"immersiveToolTip",t:"bool",d:true,l:"Animierter Item-Name",h:"Der Name über der Hotbar ploppt beim Wechseln auf."},
  {k:"lowDurabilityGlow",t:"bool",d:false,l:"Glühen bei wenig Haltbarkeit",h:"Fast kaputte Werkzeuge leuchten in der Hotbar."}]},
 "moreculling":{file:"moreculling.toml",fmt:"tpl",items:[
  {k:"rainCulling",t:"bool",d:true,l:"Regen ausblenden, wo unsichtbar",h:"Spart Leistung bei Regen."},
  {k:"useItemFrameLOD",t:"bool",d:true,l:"Item-Rahmen vereinfachen",h:"Weit entfernte Item-Rahmen werden einfacher gezeichnet. Hilft bei großen Lagern."},
  {k:"itemFrameLODRange",t:"sel",o:[8,11,16,24],d:11,l:"Ab Entfernung (Blöcke)",h:"Ab hier werden Item-Rahmen vereinfacht."},
  {k:"signTextCulling",t:"bool",d:true,l:"Schildtext ausblenden",h:"Text auf Schildern, die du nicht lesen kannst, wird nicht gezeichnet."}]},
 "wavey-capes":{file:"waveycapes.json",fmt:"tpl",items:[
  {k:"capeStyle",t:"sel",o:["SMOOTH","BLOCKY"],ol:["Weich","Blockig"],s:1,d:"SMOOTH",l:"Umhang-Stil",h:"Weich = fließender Stoff, blockig = Minecraft-Look."},
  {k:"capeMovement",t:"sel",o:["VANILLA","BASIC_SIMULATION","BASIC_SIMULATION_3D","DUNGEONS"],ol:["Vanilla","Simulation","Simulation 3D","Dungeons"],s:1,d:"BASIC_SIMULATION_3D",l:"Bewegung",h:"Simulation 3D sieht am echtesten aus."},
  {k:"windMode",t:"sel",o:["NONE","WAVES"],ol:["Aus","Wellen"],s:1,d:"NONE",l:"Wind",h:"Umhang flattert auch im Stand."}]},
 "wakes-reforged":{file:"wakes-client.toml",fmt:"tpl",items:[
  {k:"wakeResolution",t:"sel",o:["EIGHT","SIXTEEN","THIRTYTWO"],ol:["8","16","32"],s:1,d:"SIXTEEN",l:"Wellen-Auflösung",h:"Höher = feinere Wellen, kostet mehr."},
  {k:"wakeOpacity",t:"sel",o:[0.5,0.75,1],d:1,l:"Deckkraft",h:"Wie sichtbar die Wellen sind."},
  {k:"spawnParticles",t:"bool",d:true,l:"Spritzer-Partikel",h:"Wasserspritzer an Booten."}]},
 "entityculling":{file:"entityculling.json",fmt:"tpl",items:[
  {k:"tracingDistance",t:"sel",o:[64,128,256],d:128,l:"Prüf-Distanz (Blöcke)",h:"Bis wohin geprüft wird, ob Objekte verdeckt sind."},
  {k:"tickCulling",t:"bool",d:true,l:"Verdeckte Objekte nicht animieren",h:"Spart CPU. Selten können Animationen kurz stocken."},
  {k:"renderNametagsThroughWalls",t:"bool",d:true,l:"Namen durch Wände",h:"Spielernamen bleiben hinter Wänden sichtbar."}]},
 "voxy":{file:"voxy-config.json",fmt:"json",base:{enabled:true,enable_rendering:true,ingest_enabled:true},items:[
  {k:"section_render_distance",num:1,t:"sel",o:[8,12,16,24,32],ol:["256 Chunks","384 Chunks","512 Chunks","768 Chunks","1024 Chunks"],d:16,l:"Fernsicht",h:"Wie weit Voxy die Landschaft zeigt. 512 ist ein guter Start für eine 3080."},
  {k:"sub_division_size",t:"sel",o:[32,48,64,96,128],d:64,l:"Detail in der Ferne",h:"Kleiner = detailreicher in der Ferne, kostet Leistung."},
  {k:"dont_use_sodium_builder_threads",t:"bool",inv:true,d:true,l:"Sodium-Threads mitnutzen",h:"Laut Voxy weniger Ruckler beim schnellen Fliegen."}]}
};
export const BASE={items:[
  {k:"renderDistance",t:"sel",o:[8,10,12,16,20,24],d:16,l:"Sichtweite (Chunks)",h:"Normale Sichtweite. Dahinter übernimmt Voxy."},
  {k:"simulationDistance",t:"sel",o:[6,8,10,12],d:10,l:"Simulationsdistanz",h:"Wie weit die Welt aktiv ist. Weniger entlastet die CPU."},
  {k:"maxFps",t:"sel",o:[60,120,140,165,240,260],ol:["60","120","140","165","240","Unbegrenzt"],d:140,l:"FPS-Limit",h:"Mit G-Sync knapp unter der Bildwiederholrate: 140 bei 144 Hz."}]};
