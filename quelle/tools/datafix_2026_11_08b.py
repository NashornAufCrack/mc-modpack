# Entscheidungen vom 08.11.2026 abends (idempotent):
# 1) Server-Pack: harmlose Technik-Werkzeuge weiter automatisch, schädliche nur auf Wunsch
# 2) Alles, was mit dem festen Leistungspaket nicht zusammen klappt oder es nur doppelt, fliegt raus
import json
Q = '/home/claude/modpack/'
mods = json.load(open(Q + 'mods.json')); dec = json.load(open(Q + 'decisions.json')); files = json.load(open(Q + 'files.json'))

# 1) nicht automatisch ins Server-Pack (bleiben wählbar); Grund steht in den Details
NICHT_AUTO = {
    'automodpack': 'Dann bräuchte jeder Spieler AutoModpack selbst.',
    'chunky-offline': 'Startet von selbst eine Welt-Vorgenerierung mit 10.000 Blöcken Radius, sobald niemand online ist.',
    'tt20': 'Ändert Spielabläufe bei Lag und schaltet die Rückversetzung bei zu schnellem Bewegen ab.',
}
for m in mods:
    if m['slug'] in NICHT_AUTO: m['nichtAuto'] = NICHT_AUTO[m['slug']]

# 2) raus: Konflikt mit festen Mods (Moonrise ↔ C2ME/Async, Partikel-Optimierer ↔ Smart Particles)
#    und Doppelungen fester Mods (Cull Leaves = MoreCulling, Better Block Entities = OBE, Packet Fixer = XXL Packets)
RAUS = {'moonrise-opt', 'asyncparticles', 'particle-core', 'cull-leaves', 'better-block-entities', 'packet-fixer'}
mods = [m for m in mods if m['slug'] not in RAUS]
for s in RAUS: files.pop(s, None)
dec['gruppen'] = [{**g, 'mods': [s for s in g['mods'] if s not in RAUS]} for g in dec['gruppen']]
dec['gruppen'] = [g for g in dec['gruppen'] if len(g['mods']) >= 2]
dec['beziehungen'] = [b for b in dec['beziehungen'] if not (set(b['mods']) & RAUS)]
dec['entscheidungen'] = [e for e in dec['entscheidungen'] if e['id'] != 'chunks']

json.dump(mods, open(Q + 'mods.json', 'w'), ensure_ascii=False)
json.dump(files, open(Q + 'files.json', 'w'), ensure_ascii=False)
json.dump(dec, open(Q + 'decisions.json', 'w'), ensure_ascii=False, indent=1)
print('Katalog', len(mods), '| Gruppen', len(dec['gruppen']), '| Beziehungen', len(dec['beziehungen']), '| Entscheidungen', len(dec['entscheidungen']))
