import json
# slug, name, cat, sub, ampel, role, downloads_k, note, sources
D = """
sodium|Sodium|P|Performance|G|K|249391|Render-Engine, Grundlage für alles Visuelle|VP
lithium|Lithium|P|Performance|Y|K|141494|Logik-Optimierung, wirkt im Singleplayer|VP
ferrite-core|FerriteCore|P|Performance|Y|K|165402|Weniger RAM|VP
immediatelyfast|ImmediatelyFast|P|Performance|G|K|136232|Schnelleres Rendern von HUD/Text/Entities|VP
entityculling|Entity Culling|P|Performance|G|K|186022|Rendert keine verdeckten Entities|VP
moreculling|More Culling|P|Performance|G|K|73318|Mehr Culling (Blätter, Item-Frames)|VP
modernfix-mvus|ModernFix-mVUS|P|Performance|Y|O|11490|Schnellerer Start, weniger RAM (Community-Port)|VP
badoptimizations|BadOptimizations|P|Performance|G|O|47490|Kleine Client-Optimierungen|
dynamic-fps|Dynamic FPS|P|Performance|G|K|71402|Drosselt FPS im Hintergrund/AFK|
krypton|Krypton|P|Performance|Y|O|44877|Netzwerk-Optimierung|
c2me-fabric|C2ME|P|Performance|Y|O|41030|Schnellere Chunk-Generierung (Singleplayer), gelegentlich Konflikte|
scalablelux|ScalableLux|P|Performance|Y|O|16078|Schnellere Lichtberechnung|
better-block-entities|Better Block Entities|P|Performance|G|O|11401|Truhen/Schilder schneller rendern|VP
nvidium|Nvidium|P|Performance|G|A|7524|Nur NVIDIA, wird bei aktiven Shadern deaktiviert. Alternative ohne Shader|
rsls|Raise Sound Limit Simplified|P|Performance|G|O|3392|Mehr gleichzeitige Sounds (wichtig mit Sound-Mods)|
fabric-api|Fabric API|P|Basis & Werkzeuge|Y|K|283699|Pflicht-Bibliothek für fast alle Mods|VP
modmenu|Mod Menu|P|Basis & Werkzeuge|G|K|159186|Mod-Liste und Einstellungen im Spiel|VP
reeses-sodium-options|Reese's Sodium Options|P|Basis & Werkzeuge|G|K|87714|Übersichtlicheres Grafikmenü|
sodium-extra|Sodium Extra|P|Basis & Werkzeuge|G|K|105642|Mehr Grafikoptionen (Partikel, Animationen, Nebel)|VP
yosbr|Your Options Shall Be Respected|P|Basis & Werkzeuge|G|K|24670|Wichtig für uns: Pack liefert Standard-Einstellungen, überschreibt aber nie deine eigenen|
controlling|Controlling|P|Basis & Werkzeuge|G|K|42123|Tastenbelegung durchsuchen, Konflikte finden|VP
cherished-worlds|Cherished Worlds|P|Basis & Werkzeuge|G|O|33867|Welten als Favoriten anpinnen|VP
delete-worlds-to-trash|Delete Worlds To Trash|P|Basis & Werkzeuge|G|O|3384|Gelöschte Welten landen im Papierkorb|VP
fastquit|FastQuit|P|Basis & Werkzeuge|G|O|24717|Welt speichert im Hintergrund, schneller zurück ins Menü|
rrls|Remove Reloading Screen|P|Basis & Werkzeuge|G|O|28331|Resource Packs laden ohne Ladebildschirm|
borderless-fullscreen|Borderless Fullscreen|P|Basis & Werkzeuge|G|O|2879|Randloser Vollbildmodus|VP
cubes-without-borders|Cubes Without Borders|P|Basis & Werkzeuge|G|A|29540|Alternative zu Borderless Fullscreen|
crash-assistant|Crash Assistant|P|Basis & Werkzeuge|G|O|21279|Erklärt Abstürze verständlich|
debugify|Debugify|P|Basis & Werkzeuge|Y|O|38904|Behebt Vanilla-Bugs|
no-chat-reports|No Chat Reports|P|Basis & Werkzeuge|Y|O|61728|Deaktiviert Chat-Signierung|
packed-packs|Packed Packs|P|Basis & Werkzeuge|G|O|2805|Resource Packs in Ordnern/Profilen verwalten|VP
iris|Iris Shaders|V|Shader|G|K|192904|Shader-Lader, Pflicht für Shader|VP
complementary-reimagined|Complementary Reimagined|V|Shader|G|K|72093|Meine Empfehlung: sehr vanilla-treu, viele Einstellungen|VP
complementary-unbound|Complementary Unbound|V|Shader|G|A|46804|Dramatischer als Reimagined, gleiche Basis|
euphoria-patches|Euphoria Patches|V|Shader|G|O|29626|Erweitert Complementary (Effekte, Distant-Horizons-Support)|
bliss-shader|Bliss|V|Shader|G|A|15645|Sehr stimmungsvolles Licht/Nebel, schwerer|
photon-shader|Photon|V|Shader|G|A|29004|Realistischer, sehr schönes Wasser/Wolken|
solas-shader|Solas|V|Shader|G|A|18548|Weiches Licht, gute Performance|
bsl-shaders|BSL|V|Shader|G|A|31542|Klassiker, leicht und solide|
i-like-vanilla|I Like Vanilla|V|Shader|G|A|2885|Ganz dezent, sieht aus wie „Vanilla in schön“|VP
distanthorizons|Distant Horizons|V|Fernsicht|Y|A|37654|LOD-Fernsicht. Auf Vanilla-Servern nur Gebiete, die du gesehen hast. Alternative zu Voxy|J
voxy|Voxy|V|Fernsicht|G|A|7592|Neuere LOD-Fernsicht, sehr schnell. Alternative zu Distant Horizons|
bobby|Bobby|V|Fernsicht|G|O|21843|Merkt sich Chunks lokal. Hilft bei Servern mit kleiner Sichtweite|
continuity|Continuity|V|Welt & Licht|G|K|79248|Verbundene Texturen (Glas, Bücherregale)|J,VP
lambdynamiclights|LambDynamicLights|V|Welt & Licht|G|K|63212|Fackel in der Hand leuchtet|VP
visuality|Visuality|V|Welt & Licht|G|K|30803|Dezente Partikel (Glitzern, Funken)|VP
fallingleaves|Falling Leaves|V|Welt & Licht|G|K|28040|Blätter fallen von Bäumen|
particle-rain|Particle Rain|V|Welt & Licht|Q|K|22551|Regen/Schnee als Partikel, Nebel bei Sturm|VP
subtle-effects|Subtle Effects|V|Welt & Licht|Y|K|12724|Viele kleine Umwelteffekte (Glühwürmchen, Dampf, Staub)|
coolrain|Cool Rain|V|Welt & Licht|G|A|8250|Alternative zu Particle Rain|
particle-interactions|Particle Interactions|V|Welt & Licht|G|O|2747|Partikel reagieren auf Blöcke und Bewegung|D
better-smoke|Better Smoke|V|Welt & Licht|G|O|628|Schönerer Rauch|D
wakes|Wakes|V|Welt & Licht|G|O|7314|Bugwellen hinter Booten und Schwimmern|J
windy|Windy|V|Welt & Licht|G|O|1392|Sichtbare Windpartikel|J
grassier-grass|Grassier Grass|V|Welt & Licht|G|O|426|Volleres Gras|J
lambdabettergrass|LambdaBetterGrass|V|Welt & Licht|G|O|1926|Gras-Seiten verbunden (wie OptiFine Better Grass)|
better-biome-blend|Better Biome Blend|V|Welt & Licht|G|O|2026|Weichere Farbübergänge zwischen Biomen|
better-clouds|Better Clouds|V|Welt & Licht|G|O|5648|Schönere Wolken (ohne Shader)|
sodium-shadowy-path-blocks|Sodium Shadowy Path Blocks|V|Welt & Licht|Q|O|25103|Korrekte Schatten auf Trampelpfaden|VP
chunks-fade-in|Chunks fade in|V|Welt & Licht|Q|O|3649|Chunks blenden weich ein statt aufzuploppen|
fwa|Fancy World Animations|V|Welt & Licht|G|O|1721|Animationen beim Platzieren/Abbauen|D
snow-imprints|Soft Imprints|V|Welt & Licht|G|O|1178|Fußspuren im Schnee|
footprintparticle|FootprintParticle|V|Welt & Licht|Q|O|1870|Fußspuren als Partikel|D
immersive-storms|Immersive Storms|V|Welt & Licht|G|O|163|Dramatischere Gewitter|J
explosive-enhancement|Explosive Enhancement|V|Welt & Licht|G|O|7068|Bessere Explosionen|
make_bubbles_pop|Make Bubbles Pop|V|Welt & Licht|G|O|13864|Blasen platzen sichtbar|
atmospherics|Atmospherics|V|Welt & Licht|G|O|1133|Wetter- und Nebel-Stimmung|
ambient-environment|Ambient Environment|V|Welt & Licht|G|O|9857|Biomfarben, Effekte, Geräusche|
better-end-sky|Better End Sky|V|Welt & Licht|G|O|3172|Schönerer End-Himmel|
elytra-contrails-mod|Elytra Contrails|V|Welt & Licht|G|O|1640|Kondensstreifen beim Fliegen|D,VP
streams-reflowing|Streams Reflowing|V|Welt & Licht|Q|O|626|Fließendes Wasser wirkt natürlicher|D
wet-sand|Wet Sand|V|Welt & Licht|Q|O|78|Sand wird nass am Wasser|D
spyglass-astronomy|Spyglass Astronomy|V|Welt & Licht|G|O|2700|Sternbilder mit dem Fernrohr|
physicsmod|Physics Mod|V|Welt & Licht|G|O|24570|Physikalische Trümmer/Ragdolls, kostet viel Leistung|
entitytexturefeatures|Entity Texture Features|V|Animation & Modelle|G|K|110283|Nötig für Fresh Animations & Mob-Varianten|VP
entity-model-features|Entity Model Features|V|Animation & Modelle|G|K|104670|Nötig für Fresh Animations|VP
not-enough-animations|Not Enough Animations|V|Animation & Modelle|G|K|93634|Mehr Spieler-Animationen (Essen, Karten, Leitern)|VP
3dskinlayers|3D Skin Layers|V|Animation & Modelle|G|K|83815|Skin-Overlay in 3D|VP
first-person-model|First-person Model|V|Animation & Modelle|G|O|14860|Eigenen Körper in der Ego-Sicht sehen|J
cameraoverhaul|Camera Overhaul|V|Animation & Modelle|G|O|6696|Kamera neigt sich bei Bewegung|
punchy-fpa|Punchy!|V|Animation & Modelle|G|O|6704|Schwungvollere Arm-Animationen|J
wavey-capes|Wavey Capes|V|Animation & Modelle|G|O|18869|Umhänge wehen physikalisch|
elytra-physics|Elytra Physics|V|Animation & Modelle|G|O|2822|Elytra bewegt sich realistischer|
smooth-swapping|Smooth Swapping|V|Animation & Modelle|G|O|8611|Items gleiten beim Verschieben im Inventar|
animaticarefabricated|Animatica|V|Animation & Modelle|G|O|5471|Animierte Texturen für Resource Packs|VP
better-animations-collection|Better Animations Collection|V|Animation & Modelle|G|O|3134|Viele Mob-Animationen|
inventory-particles|Inventory Particles|V|Animation & Modelle|G|O|3657|Partikel im Inventar|J
do-a-barrel-roll|Do a Barrel Roll|V|Animation & Modelle|Y|O|11657|Elytra-Flug wie im Flugzeug|J,D
cinematic-respawn|Cinematic Respawn|V|Animation & Modelle|G|O|233|Filmischer Respawn|J
sound-physics-remastered|Sound Physics Remastered|V|Sound|Y|K|56512|Hall und Echo je nach Umgebung|
ambientsounds|AmbientSounds|V|Sound|G|K|41129|Umgebungsgeräusche je nach Biom/Tageszeit|J
presence-footsteps|Presence Footsteps|V|Sound|G|K|41282|Realistische Schrittgeräusche|J
sound|Sounds|V|Sound|Q|O|19776|Neue Sounds für UI und Interaktionen|
dripsounds|Drip Sounds|V|Sound|G|O|7762|Tropfgeräusche in Höhlen|
esf|Entity Sound Features|V|Sound|G|O|2963|Sound-Varianten für Mobs (für Resource Packs)|
xaeros-minimap|Xaero's Minimap|V|HUD & Bedienung|Y|O|119522|Minimap, läuft auf jedem Server|
xaeros-world-map|Xaero's World Map|V|HUD & Bedienung|Y|O|104887|Weltkarte|
journeymap|JourneyMap|V|HUD & Bedienung|Y|A|15407|Alternative zu Xaero's|
appleskin|AppleSkin|V|HUD & Bedienung|Y|K|97953|Sättigung im Hunger-Balken|
jade|Jade|V|HUD & Bedienung|Y|O|73362|Zeigt an, worauf du schaust|
zoomify|Zoomify|V|HUD & Bedienung|G|K|71886|Zoom-Taste|VP
betterf3|BetterF3|V|HUD & Bedienung|G|O|36180|Übersichtliches F3-Menü|VP
status-effect-bars|Status Effect Bars|V|HUD & Bedienung|G|O|7921|Effekt-Dauer als Balken|VP
detail-armor-bar-reconstructed|Detail Armor Bar|V|HUD & Bedienung|G|O|4390|Rüstungsleiste zeigt Material|VP
better-mount-hud|Better Mount HUD|V|HUD & Bedienung|G|O|25194|Besseres HUD beim Reiten|
shulkerboxtooltip|Shulker Box Tooltip|V|HUD & Bedienung|Y|O|40960|Inhalt von Shulkerkisten im Tooltip|
chat-heads|Chat Heads|V|HUD & Bedienung|G|O|52627|Spielerköpfe im Chat|
mouse-tweaks|Mouse Tweaks|V|HUD & Bedienung|G|O|63949|Schnelleres Inventar-Handling|VP
inventory-profiles-next|Inventory Profiles Next|V|HUD & Bedienung|G|O|42099|Sortieren per Tastendruck, auch auf Vanilla-Servern|
immersive-ui|Immersive UI|V|HUD & Bedienung|G|O|6698|Animierte Menüs|J
spatial-gui|Spatial GUI|V|HUD & Bedienung|G|O|429|Inventar schwebt räumlich|D
immersive-hotbar|Immersive Hotbar|V|HUD & Bedienung|G|O|2543|Animierte Hotbar|VP
smooth-scroll|Smooth Scrolling|V|HUD & Bedienung|G|O|13207|Weiches Scrollen in Menüs|
chatanimation|Chat Animation|V|HUD & Bedienung|G|O|24270|Chat blendet weich ein|VP
better-advancements|Better Advancements|V|HUD & Bedienung|G|O|27530|Übersichtlichere Fortschritte|VP
smooth-loading-screen|Smooth Loading Screen|V|HUD & Bedienung|G|O|16|Weicher Ladebildschirm|D
last-world-panorama|Last World Panorama|V|HUD & Bedienung|G|O|6|Hauptmenü zeigt deine letzte Welt|D
dynamiccrosshair|Dynamic Crosshair|V|HUD & Bedienung|G|O|22077|Fadenkreuz passt sich an|
freecam|Freecam|V|HUD & Bedienung|G|O|22938|Freie Kamera für Screenshots (Server-Regeln beachten)|VP
flashback|Flashback|V|HUD & Bedienung|G|O|12760|Aufnehmen & Kamerafahrten für Videos|VP
fresh-animations|Fresh Animations|V|Resource Packs|G|K|51447|Lebendige Mob-Animationen, sehr vanilla-treu|VP
fresh-animations-extensions|Fresh Animations: Extensions|V|Resource Packs|G|O|11874|Mehr Animationen für FA|
fa-player-extension|Fresh Animations: Player|V|Resource Packs|G|O|5088|FA-Animationen für Spieler|
fresh-animations-emissive|Fresh Animations: Emissive|V|Resource Packs|G|O|1817|Leuchtende Augen etc.|
low-on-fire|Low On Fire|V|Resource Packs|G|K|17349|Kleineres Feuer im Bild|
dramatic-skys|Dramatic Skys|V|Resource Packs|G|O|11404|Schönerer Himmel/Sterne|
glowing-glints|Enchantment Outlines|V|Resource Packs|G|O|7620|Verzauberte Items mit Kontur|VP
recolourful-containers-gui|Recolourful Containers GUI|V|Resource Packs|G|O|4313|Farbige Container-Menüs|VP
visual-armor-trims|Visual: Armor Trims|V|Resource Packs|G|O|4241|Rüstungsbesätze im Tooltip|VP
fresh-flower-pots|Fresh Flower Pots|V|Resource Packs|G|O|3285|Schönere Blumentöpfe|VP
better-lanterns|Better Lanterns|V|Resource Packs|G|O|3947|3D-Laternen|
weskersons-torches|Weskerson's Torches|V|Resource Packs|G|O|1786|3D-Fackeln|VP
theones-eating-animation-pack|Theone's Eating Animation|V|Resource Packs|G|O|2889|Essen-Animation (Item wird kleiner)|J,VP
vvi|Vocal Villagers|V|Resource Packs|G|O|3031|Neue Dorfbewohner-Stimmen|
enhanced-audio|Enhanced Audio|V|Resource Packs|G|O|3315|Bessere Vanilla-Sounds|
gentler-weather-sounds|Gentler Weather Sounds|V|Resource Packs|G|O|1838|Leiserer Regen/Donner|
enchanted-books-re-covered|Enchanted Books: Re-covered|V|Resource Packs|G|O|2642|Bücher zeigen ihre Verzauberung|VP
rays-3d-rails|RAY's 3D Rails|V|Resource Packs|G|O|3404|3D-Schienen|
rays-3d-ladders|RAY's 3D Ladders|V|Resource Packs|G|O|2851|3D-Leitern|
fancy-crops|Fancy Crops|V|Resource Packs|G|O|8291|Schönere Feldfrüchte|
clearer-slot-highlight|Clearer Slot Highlight|V|Resource Packs|G|O|1951|Deutlicher markierter Slot|VP
blinking-ender-eyes|Blinking Ender Eyes|V|Resource Packs|G|O|2107|Enderaugen blinzeln|
round-trees|Round Trees|V|Resource Packs|G|O|4209|Rundere Baumstämme (verändert Look deutlich)|
new-glowing-ores|New Glowing Ores|V|Resource Packs|G|O|8508|Erze leuchten leicht (grenzwertig, eher Komfort)|
rightclickharvest|RightClickHarvest|G|Komfort|R|K|13158|Ernten per Rechtsklick|J,VP
fallingtree|FallingTree|G|Komfort|R|O|13070|Ganze Bäume fällen|J
carry-on|Carry On|G|Komfort|R|O|27711|Truhen und Tiere tragen|J
visual-workbench|Visual Workbench|G|Komfort|R|O|27056|Items liegen sichtbar auf der Werkbank|J
easy-anvils|Easy Anvils|G|Komfort|R|O|17530|Amboss ohne „Zu teuer!“-Grenze|J
easy-magic|Easy Magic|G|Komfort|R|O|14420|Zaubertisch behält Items|J
easy-shulker-boxes|Easy Shulker Boxes|G|Komfort|R|O|5739|Shulkerkisten aus dem Inventar öffnen|J,VP
natures-compass|Nature's Compass|G|Komfort|R|O|27386|Biome finden|J
explorers-compass|Explorer's Compass|G|Komfort|R|O|12472|Strukturen finden|J
better-than-mending|Better Than Mending|G|Komfort|R|O|4444|Mit XP reparieren per Sneak-Klick|J
universal-graves|Universal Graves|G|Komfort|R|O|5118|Grab statt verstreuter Items|J
crawl|Crawl|G|Komfort|R|O|7914|Kriechen per Taste|
double-doors|Double Doors|G|Komfort|R|O|9430|Doppeltüren öffnen zusammen|
leaves-be-gone|Leaves Be Gone|G|Komfort|R|O|13459|Blätter verfallen schneller|
trade-cycling|Trade Cycling|G|Komfort|R|O|6873|Handel bei Dorfbewohnern neu würfeln|
items-displayed|Items Displayed|G|Komfort|R|O|2735|Items auf Blöcken ablegen|J
armor-poser|Armor Poser|G|Komfort|R|O|852|Rüstungsständer posieren|J
ping-wheel|Ping Wheel|G|Komfort|R|O|14535|Orte für Freunde markieren|
e4mc|e4mc|G|Komfort|Y|O|26393|Singleplayer-Welt per Link mit Freunden teilen, ohne Server|
simple-voice-chat|Simple Voice Chat|G|Komfort|R|O|75814|Proximity-Voice-Chat (Server braucht Mod/Plugin)|
lootr|Lootr|G|Komfort|R|O|23999|Jeder Spieler bekommt eigene Truhen-Beute|
little-joys|Little Joys|G|Inhalt|R|O|193|Kleine Überraschungen in der Welt|J
wandering-trader-may-leave|Wandering Trader May Leave|G|Inhalt|R|O|53|Händler verschwindet sichtbar|J
villager-names-serilum|Villager Names|G|Inhalt|Y|O|12600|Dorfbewohner bekommen Namen|
friends-and-foes|Friends & Foes|G|Inhalt|R|O|12186|Mobs aus den Mob-Votes|
variants-and-ventures|Variants & Ventures|G|Inhalt|R|O|1799|Neue Mob-Varianten im Vanilla-Stil|J
naturalist|Naturalist|G|Inhalt|R|O|11657|Echte Tiere (Bären, Hirsche)|
better-archeology|Better Archeology|G|Inhalt|R|O|7482|Mehr Archäologie|
farmers-delight-refabricated|Farmer's Delight|G|Inhalt|R|O|16877|Kochen und Landwirtschaft, deutlich mehr Inhalt|
serene-seasons|Serene Seasons|G|Inhalt|R|O|7619|Jahreszeiten, verändert Spielgefühl stark|
waystones|Waystones|G|Inhalt|R|O|27532|Teleport-Steine, eher wenig vanilla|
terralith|Terralith|T|Terrain|R|K|24608|Neue Biome nur aus Vanilla-Blöcken|
tectonic|Tectonic|T|Terrain|R|K|17539|Größere Berge, Täler, Flüsse; passt zu Terralith|
continents|Continents|T|Terrain|R|O|1363|Echte Kontinente und Ozeane|
geophilic|Geophilic|T|Terrain|R|O|11141|Überarbeitet Vanilla-Biome dezent|
clifftree|CliffTree|T|Terrain|R|O|367|Steilklippen und Felsformationen|
wwoo|William Wythers' Overhauled Overworld|T|Terrain|R|A|2158|Alternative zu Terralith + Tectonic|
wilder-wild|Wilder Wild|T|Terrain|R|O|1206|Natur-Details plus neue Blöcke und Mobs|
climate-rivers|Climate Rivers|T|Terrain|R|O|2087|Flüsse durch Klimazonen|
snow-under-trees|Snow Under Trees|T|Terrain|R|O|3190|Schnee auch unter Bäumen|
biomes-o-plenty|Biomes O' Plenty|T|Terrain|R|A|38592|Viele neue Biome mit neuen Blöcken, weniger vanilla|
amplified-nether|Amplified Nether|T|Nether & End|R|O|2396|Höherer, dramatischer Nether|
incendium|Incendium|T|Nether & End|R|O|10571|Nether-Biome & Strukturen|
nullscape|Nullscape|T|Nether & End|R|O|5910|Spektakuläreres End|
dungeons-and-taverns|Dungeons and Taverns|T|Strukturen|R|K|22129|Vanilla-nahe Strukturen + Überarbeitungen|VP
structory|Structory|T|Strukturen|R|O|9227|Kleine Ruinen und Lager|J
structory-towers|Structory: Towers|T|Strukturen|R|O|9859|Türme (hatte Probleme auf NeoForge)|
towns-and-towers|Towns and Towers|T|Strukturen|R|O|18675|Mehr Dorf- und Außenposten-Varianten|
trek|Trek|T|Strukturen|R|O|12626|Viele kleine Strukturen|
tidal-towns|Tidal Towns|T|Strukturen|R|O|4134|Dörfer auf dem Wasser|J
ati-structures-vanilla-edition|ATi Structures (Vanilla)|T|Strukturen|R|O|3972|Strukturen im Vanilla-Stil|
hopo-better-mineshaft|Hopo Better Mineshaft|T|Strukturen|R|O|2463|Bessere Minenschächte|
hopo-better-underwater-ruins|Hopo Better Underwater Ruins|T|Strukturen|R|O|2736|Bessere Unterwasser-Ruinen|
hopo-better-ruined-portals|Hopo Better Ruined Portals|T|Strukturen|R|O|1883|Bessere Portalruinen|
ct-overhaul-village|ChoiceTheorem's Overhauled Village|T|Strukturen|R|O|10949|Dörfer passen zum Biom|
moogs-voyager-structures|Moog's Voyager Structures|T|Strukturen|R|O|8998|Viele Reise-Strukturen|
repurposed-structures-fabric|Repurposed Structures|T|Strukturen|R|O|14769|Vanilla-Strukturen in neuen Biom-Varianten|
sparsestructures|Sparse Structures|T|Strukturen|R|O|8531|Regelt Struktur-Dichte (gegen Überfüllung)|
chunky|Chunky|T|Werkzeug|Y|O|19994|Welt vorgenerieren, ideal mit Distant Horizons|
"""
rows=[]
for line in D.strip().splitlines():
    p=line.split('|')
    slug,name,cat,sub,amp,role,dl,note=p[:8]; src=p[8] if len(p)>8 else ''
    rows.append(dict(slug=slug,name=name,cat=cat,sub=sub,ampel=amp,rolle=role,downloadsK=int(dl),notiz=note,quellen=[s for s in src.split(',') if s],mc="26.3",loader="fabric"))
json.dump(rows,open('/home/claude/modpack/mods.json','w'),ensure_ascii=False,indent=1)
from collections import Counter
print(len(rows), Counter(r['cat'] for r in rows), Counter(r['ampel'] for r in rows))
