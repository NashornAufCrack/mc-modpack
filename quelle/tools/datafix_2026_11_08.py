# Einmalige Datenkorrekturen aus dem Audit vom 08.11.2026 (idempotent, darf mehrfach laufen)
import json
Q = '/home/claude/modpack/'
mods = json.load(open(Q + 'mods.json')); dec = json.load(open(Q + 'decisions.json')); de = json.load(open(Q + 'tools/de_notiz.json'))

# 1) Datapacks, die als Mod eingetragen waren (Datei ist eine .zip)
for m in mods:
    if m['slug'] in ('armor-stand-arms', 'players-drop-heads'):
        m['pt'] = 'd'; m['loader'] = ''

# 1b) Server-Werkzeuge, die fälschlich als „Nur Client“ markiert waren (laufen auf dem Server, Client optional)
for m in mods:
    if m['slug'] in ('carpet-tis-addition', 'litematica-server-paster', 'carpet-ams-addition', 'chunkyborder', 'carpet-extra-extras'):
        m['ampel'] = 'Y'

# 2) Englische Beschreibungen
DE = {
    'capes': 'Zeigt Umhänge aus OptiFine, LabyMod und anderen Umhang-Mods an, deine eigenen und die anderer Spieler.',
    'pick-up-notifier': 'Zeigt am Bildschirmrand kurz an, was du gerade aufgesammelt hast.',
    'diagonal-walls': 'Mauern verbinden sich auch schräg miteinander. Passt zu Diagonal Fences.',
    'resourcepackcached': 'Hält Server-Resource-Packs geladen, damit sie beim erneuten Betreten nicht jedes Mal neu laden. Spart Wartezeit.',
    'breakfree': 'Abbauen läuft weiter, wenn du währenddessen das Werkzeug wechselst.',
    'better-boat-movement': 'Boote fahren über einzelne Blockstufen hinweg, besonders praktisch auf Eisstrecken.',
    'oh-the-trees-youll-grow': 'Baum-Bibliothek, die Mods wie Oh The Biomes You\'ll Go brauchen. Allein bringt sie nichts.',
}
for m in mods:
    if m['slug'] in DE: m['notiz'] = DE[m['slug']]
de.update(DE)

# 3) Beziehungen, die am gestrichenen Config-Export hingen: jetzt Tipp mit Anleitung fürs Spiel
PH = 'Optionen › Grafikeinstellungen › Shaderpakete › Photon › Shaderpaket-Einstellungen'
for r in dec['beziehungen']:
    k = set(r['mods'])
    if k == {'photon-shader', 'lambdynamiclights'}:
        r.update(art='T', text=f'Beide machen Licht in der Hand, zusammen doppelt hell. Im Spiel in Photon ausschalten: {PH} › Lighting › „Handheld Lighting“ auf Off.'); r.pop('erledigt', None)
    elif k == {'photon-shader', 'particle-rain'} and r.get('erledigt'):
        r.update(art='T', text=f'Beide machen Sandstürme in der Wüste. Im Spiel in Photon ausschalten: {PH} › World › „Desert Sandstorm“ auf Off.'); r.pop('erledigt', None)
    elif k == {'particle-rain', 'immersive-storms'} and r.get('erledigt'):
        r.update(art='S', text='Immersive Storms schaltet seine Sandstürme selbst ab, wenn Particle Rain dabei ist.'); r.pop('erledigt', None)

# 4) Shader schließen sich nicht aus (Entscheidung: mehrere Shader wählbar, im Spiel ist immer einer aktiv)
dec['beziehungen'] = [r for r in dec['beziehungen'] if not (set(r['mods']) == {'pegasus', 'photon-shader'} and r['art'] in ('D', 'K'))]

json.dump(mods, open(Q + 'mods.json', 'w'), ensure_ascii=False)
json.dump(dec, open(Q + 'decisions.json', 'w'), ensure_ascii=False, indent=1)
open(Q + "tools/de_notiz.json", "w").write("{\n" + ",\n".join(json.dumps(k, ensure_ascii=False) + ":" + json.dumps(v, ensure_ascii=False) for k, v in de.items()) + "\n}")
print('ok')
