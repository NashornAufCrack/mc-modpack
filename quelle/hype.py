import json
M=json.load(open('mods.json')); by={m['slug']:m for m in M}
DD=json.load(open('decisions.json'))
def add(slug,name,cat,sub,ampel,rolle,dl,notiz,q=("NEU",)):
    m=dict(slug=slug,name=name,cat=cat,sub=sub,ampel=ampel,rolle=rolle,downloadsK=dl,notiz=notiz,quellen=list(q),mc="26.3",loader="fabric",einstellungen=None,ueberschneidung="")
    if slug in by: by[slug].update({k:v for k,v in m.items() if k not in('quellen',)}); return
    M.append(m); by[slug]=m
add("living-horizon","Living Horizon","V","Fernsicht","G","O",2,"Zeigt Mobs und Spieler weit hinter der Sichtweite, direkt auf dem Voxy-Gelände. Beta, aber der Autor spielt selbst mit Voxy.")
add("diorama-map","Diorama","V","HUD & Bedienung","G","O",54,"Minimap und Weltkarte schräg von oben, wie ein Modell auf dem Tisch. Brandneu (20 Tage), schnell beliebt.")
add("ggtu","GGTU","P","Performance","G","O",68,"Rechnet in niedriger Auflösung und schärft temporal hoch. Nennt Photon als empfohlenen Shader. Alternative zu Photons eigenem TAAU.")
add("orthocamera","OrthoCamera","V","HUD & Bedienung","G","O",825,"Orthografische Kamera für Bau-Screenshots wie aus einem Isometrie-Spiel.",("Video",))
add("fresh-animations-objects","Fresh Animations: Objects","V","Resource Packs","G","O",2100,"Offizielle FA-Erweiterung: animiert Truhen, Boote, Loren.")
add("fresh-food","Fresh Food","V","Resource Packs","G","O",2862,"3D-Essen mit Ess-Animation, Punchy-Fix ist laut Collection schon eingebaut.")
add("fresh-flowers-and-plants","Fresh Flowers and Plants","V","Punchy-Packs","G","O",1450,"Blumen und Pflanzen in der Hand als 3D-Modell. In der Punchy-Collection.")
add("fresh-ores-and-ingots","Fresh Ores and Ingots","V","Resource Packs","G","O",467,"Erze und Barren in der Welt in 3D, im Inventar weiter 2D.")
add("low-shield-pack","Low Shield","V","Resource Packs","G","O",5704,"Schild in der Ego-Sicht tiefer, verdeckt weniger.")
add("fast-better-grass","Fast Better Grass","V","Resource Packs","G","A",14002,"Grasseiten mit Oberseiten-Textur als Resource Pack. Doppelt mit LambdaBetterGrass.")
add("os-colorful-grasses","Os' Colorful Grasses","V","Resource Packs","G","O",5211,"Buschigeres Gras mit farbigen Spitzen und Pampasgras.")
add("connected-paths","Connected Paths","V","Resource Packs","G","O",1983,"Trampelpfade gehen nahtlos ineinander über. Braucht Continuity.")
add("just-expressions","Just Expressions","V","Spieler-Animation","G","O",2416,"Augen- und Gesichtsanimationen für den Spieler (EMF). Mit Punchy noch ungetestet.")
add("sunbathing-godrays","Sunbathing Godrays","V","Resource Packs","G","A",671,"Sonnenstrahlen über Polytone. Mit Photon überflüssig, Photon hat eigene.")
add("steadfast-shaders","Steadfast","V","Shader","G","A",46,"Schneller, unaufdringlicher Shader vom Iris-Entwickler coderbot. Voxy-Support nicht bestätigt.")
add("enderscape","Enderscape","T","Nether & End","R","O",945,"Kompletter End-Umbau: vier Biome, neue Strongholds und Endstädte. Doppelt mit Nullscape.",("Video",))
add("clutternomore","Clutter No More","G","Komfort","R","O",73,"Ein Block statt Stufen, Platten, Treppen: Form per Taste wechseln.",("Video",))
add("offgrid","Offgrid","G","Komfort","R","O",17,"Blöcke frei platzieren: gemischte Platten, Bilder auf jeder Fläche. Brandneu, schnell beliebt.")
add("spooky-doors","Spooky Doors","G","Inhalt","R","O",211,"Türen halb öffnen, zuknallen, knarzen wie in Horror-Spielen.",("Video",))
add("zombified-player","Zombified Player","G","Inhalt","R","O",65,"Nach dem Tod läuft ein Zombie mit deinem Skin herum. Beta.",("Video",))
add("icys-better-horses","Icy's Better Horses","G","Inhalt","R","O",120,"Pferde als langfristige Begleiter: Bindung, Ausrüstung, Zucht.",("Video",))
add("reworked-keep-inventory","Reworked Keep Inventory","G","Komfort","R","O",1,"Ausrüstung bleibt beim Tod, Rest bewacht ein Allay. Kostet Haltbarkeit und halbe XP.")
add("matcha-flavoured","Matcha Flavoured","G","Inhalt","R","A",532,"Mehr Ressourcen ohne Farmen, für entspanntes Spielen. Verändert die Balance stark.")
by['fresh-animations-emissive']['rolle']="A"; by['fresh-animations-emissive']['notiz']="Schon in „Fresh Animations: Extensions“ enthalten, nur einzeln nötig, wenn man Extensions nicht nimmt."
by['xaeros-minimap']['notiz']="Minimap, läuft auf jedem Server. Mit Fresh Animations Zusatz-Pack für Mob-Icons nötig."
E=DD['entscheidungen']; R=DD['beziehungen']
E+= [
 dict(id="minimap",art="D",titel="Minimap und Weltkarte",frage="Drei Karten-Mods machen dasselbe.",optionen=[
   dict(id="xaero",label="Xaero's Minimap + World Map",behalten=["xaeros-minimap","xaeros-world-map"],weg=["diorama-map","journeymap"],pro=["Standard seit Jahren, sehr ausgereift","Wegpunkte, Höhlenkarte"],contra=["Mit Fresh Animations Zusatz-Pack für Mob-Icons nötig","Optisch flach"]),
   dict(id="diorama",label="Diorama",behalten=["diorama-map"],weg=["xaeros-minimap","xaeros-world-map","journeymap"],pro=["Wunderschön: Welt wie ein Modell, Bäume werfen Schatten","Minimap und Weltkarte in einem"],contra=["Brandneu (20 Tage), weniger Funktionen und Erfahrung"]),
   dict(id="journey",label="JourneyMap",behalten=["journeymap"],weg=["xaeros-minimap","xaeros-world-map","diorama-map"],pro=["Auch als Web-Karte im Browser"],contra=["Schwerer, wirkt weniger vanilla"]),
 ],empfehlung="diorama",quelle="Modrinth-Projektseiten, Xaero-FAQ",vorschau=["xaeros-minimap","diorama-map","journeymap"]),
 dict(id="upscaling",art="D",titel="Upscaling für mehr FPS",frage="Photon hat eigenes TAAU, GGTU ist ein Upscaler als Mod. Beides gleichzeitig ergibt keinen Sinn.",optionen=[
   dict(id="keins",label="Kein Upscaling",behalten=[],weg=["ggtu"],pro=["Volle Schärfe, nichts kann schiefgehen"],contra=["Keine Reserve, falls FPS fehlen"]),
   dict(id="photon-taau",label="Photons TAAU (nur bei Bedarf)",behalten=[],weg=["ggtu"],pro=["Direkt im Shader, kein zusätzlicher Mod"],contra=["Etwas weicher als native Auflösung"]),
   dict(id="ggtu",label="GGTU",behalten=["ggtu"],weg=[],pro=["Nennt Photon als empfohlenen Shader","Eigenes Schärfungsverfahren, laut Autor stark bei schweren Shadern"],contra=["Neu (68.000 Downloads), mit Voxy ungetestet","In Photon dann TAAU aus lassen"]),
 ],empfehlung="photon-taau",quelle="GGTU-Projektseite, Photon-Quellcode",vorschau=["ggtu"]),
 dict(id="grasseiten",art="D",titel="Grasseiten (Better Grass)",frage="LambdaBetterGrass und Fast Better Grass färben beide die Grasblock-Seiten grün.",optionen=[
   dict(id="lambda",label="LambdaBetterGrass",behalten=["lambdabettergrass"],weg=["fast-better-grass"],pro=["Verbindet Seiten nur dort, wo Gras angrenzt (wie OptiFine „Fancy“)","Bessere Schnee-Übergänge"],contra=["Ein Mod mehr"]),
   dict(id="fast",label="Fast Better Grass",behalten=["fast-better-grass"],weg=["lambdabettergrass"],pro=["Nur ein Resource Pack, null Leistung"],contra=["Alle Seiten grün, wirkt einfacher"]),
 ],empfehlung="lambda",quelle="Projektseiten",vorschau=["lambdabettergrass","fast-better-grass"]),
 dict(id="gras",art="D",titel="Gras-Look",frage="Grassier Grass und Os' Colorful Grasses ändern beide die Grasmodelle.",optionen=[
   dict(id="grassier",label="Grassier Grass",behalten=["grassier-grass"],weg=["os-colorful-grasses"],pro=["Volleres Gras, unterstützt Photon ausdrücklich"],contra=["Ein Mod statt Resource Pack"]),
   dict(id="os",label="Os' Colorful Grasses",behalten=["os-colorful-grasses"],weg=["grassier-grass"],pro=["Farbige Spitzen, Pampasgras, mehrere Varianten wählbar"],contra=["Stärkere Abweichung vom Vanilla-Look"]),
 ],empfehlung="grassier",quelle="Projektseiten",vorschau=["grassier-grass","os-colorful-grasses"]),
 dict(id="essen",art="D",titel="Ess-Animation",frage="Theone's Eating Animation und Fresh Food animieren beide das Essen.",optionen=[
   dict(id="fresh",label="Fresh Food",behalten=["fresh-food"],weg=["theones-eating-animation-pack","fresh-food-for-hyper-punchy"],pro=["3D-Essen plus Animation","Punchy-Fix laut Collection schon eingebaut"],contra=["Mehr Veränderung als nur die Animation"]),
   dict(id="theone",label="Theone's Eating Animation",behalten=["theones-eating-animation-pack","fresh-food-for-hyper-punchy"],weg=["fresh-food"],pro=["Nur die Animation, Items bleiben vanilla"],contra=["Mit Hyper Punchy Zusatz-Fix nötig"]),
 ],empfehlung="fresh",quelle="Punchy Compat Collection",vorschau=["fresh-food","theones-eating-animation-pack"]),
 dict(id="end",art="D",titel="End (Vanilla Plus)",frage="Enderscape und Nullscape überarbeiten beide die End-Generierung. Nullscape ist laut eigener Seite mit den meisten End-Mods inkompatibel.",optionen=[
   dict(id="enderscape",label="Enderscape",behalten=["enderscape"],weg=["nullscape"],pro=["Vier neue Biome, neue Strukturen, sehr aktiv"],contra=["Viel neuer Inhalt, weniger vanilla"]),
   dict(id="nullscape",label="Nullscape",behalten=["nullscape"],weg=["enderscape"],pro=["Nur spektakuläres Terrain aus Vanilla-Blöcken"],contra=["Kein neuer Inhalt"]),
   dict(id="vanilla",label="Vanilla-End",behalten=[],weg=["enderscape","nullscape"],pro=["Kein Risiko"],contra=["End bleibt leer"]),
 ],empfehlung="nullscape",quelle="Nullscape-Projektseite",vorschau=["enderscape","nullscape"]),
]
R+= [
 dict(art="S",mods=["living-horizon","voxy"],text="Living Horizon zeichnet Mobs und Spieler direkt auf das Voxy-Gelände."),
 dict(art="S",mods=["ggtu","photon-shader"],text="GGTU nennt Photon als empfohlenen Shader."),
 dict(art="A",mods=["connected-paths","continuity"],text="Connected Paths braucht Continuity."),
 dict(art="D",mods=["fresh-animations-extensions","fresh-animations-emissive"],text="Extensions enthält Emissive und Details schon."),
 dict(art="D",mods=["sunbathing-godrays","photon-shader"],text="Photon hat eigene Sonnenstrahlen."),
 dict(art="T",mods=["fresh-animations-objects","better-block-entities"],text="Beide verändern Truhen. Better Block Entities ist nur teilweise mit EMF kompatibel."),
 dict(art="T",mods=["just-expressions","punchymoves"],text="Beide verändern den Spieler. Zusammen ungetestet."),
 dict(art="A",mods=["fresh-animations-objects","fresh-animations"],text="Objects ist eine offizielle FA-Erweiterung."),
]
# preview targets on existing decisions
pv={"ego-animation":["punchy-fpa","hyper-punchy","first-person-model"],"third-person":["punchymoves","not-enough-animations","fa-player-extension"],"kamera":["cameraoverhaul","punchymoves"],"laternen":["luminous-lanterns","drigo-3d-lanterns-x-punchy","better-lanterns"],"menues":["spatial-gui","immersive-ui"],"fussspuren":["snow-imprints","footprintparticle"],"rauch":["better-smoke","subtle-effects"],"wolken":["photon-shader","better-clouds"],"biome":["terralith","geophilic","wwoo"],"nether":["incendium","amplified-nether"],"kontinente":["tectonic","continents"]}
for d in E:
    d.setdefault("vorschau",pv.get(d['id'],[]))
    for o in d['optionen']:
        for s in o['behalten']+o['weg']: assert s in by,s
json.dump(DD,open('decisions.json','w'),ensure_ascii=False,indent=1)
json.dump(M,open('mods.json','w'),ensure_ascii=False,indent=1)
print(len(M),len(E),len(R))
json.dump([[m['slug'],"x"] for m in M],open('slugs2.json','w'))
