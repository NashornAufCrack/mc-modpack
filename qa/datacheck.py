# Datenprüfung für den Mod-Katalog (läuft lokal und in der Prüfung auf GitHub).
# Aufruf im Repo-Ordner: python3 qa/datacheck.py [--ci]
# FEHLER (Exit-Code 1 mit --ci) machen Exporte kaputt; HINWEISE sind Pflege-Aufgaben.
import json, re, sys, collections, os
A = json.load(open('data/app-data.json')); F = A['files']; M = A['mods']; D = A['dec']; BY = {m['slug']: m for m in M}
Me = json.load(open('data/media.json')) if os.path.exists('data/media.json') else {}
S = json.load(open('data/sounds.json')) if os.path.exists('data/sounds.json') else {}
x = A.get('x', {}); rpbad = set(x.get('rpbad', [])); basis = set((x.get('basisfehlt') or {}).keys())
IGNORE = {'qsl', 'quilted-fabric-api', 'connector', 'modefite-item-definition-backport'}
ALLOWED = {'cdn.modrinth.com', 'github.com', 'raw.githubusercontent.com', 'gitlab.com'}
err, note = collections.defaultdict(list), collections.defaultdict(list)
LOCKED = {m['slug'] for m in M if (m['cat'] == 'P' and m.get('rolle') == 'K') or m.get('pflicht')}
vis = [m for m in M if (m['slug'] in F or m.get('cf')) and m['slug'] not in rpbad and m['slug'] not in basis]

def missing(s):
    out, seen, st = [], set(), [s]
    while st:
        y = st.pop()
        if y in seen or y in IGNORE: continue
        seen.add(y)
        if y not in F: out.append(y); continue
        t = F[y][8] if len(F[y]) > 8 else 'm'
        st += F[y][5] + (['iris'] if t == 's' else []) + (['globalpacks'] if t == 'd' else [])
    return out

# 1 Dateien
for s, f in F.items():
    if len(f) < 9: err['Dateieintrag unvollständig'].append(s); continue
    url, fn, sha1, sha512, size, deps, ver, title, t = f[:9]
    h = re.sub(r'^https?://([^/]+).*', r'\1', url or '')
    if h not in ALLOWED: err['Download-Host nicht erlaubt (.mrpack)'].append(f'{s}: {h}')
    if not re.fullmatch(r'[0-9a-f]{40}', sha1 or ''): err['sha1 fehlt/ungültig'].append(s)
    if not re.fullmatch(r'[0-9a-f]{128}', sha512 or ''): err['sha512 fehlt/ungültig'].append(s)
    if not size or size <= 0: err['Größe 0'].append(s)
    if s in BY and (BY[s].get('pt') or 'm') != t: err['Typ Katalog ≠ Datei'].append(f"{s}: {BY[s].get('pt')} vs {t}")
    if re.fullmatch(r'[A-Za-z0-9]{8}', ' '.join(deps) or 'x') is None:
        for d in deps:
            if re.fullmatch(r'[A-Za-z0-9]{8}', d) and d not in F and any(c.isupper() for c in d): note['Abhängigkeit als Projekt-ID statt Slug'].append(f'{s} → {d}')
# 2 Abhängigkeiten
for m in M:
    if m['slug'] in F:
        mi = missing(m['slug'])
        if mi and m['slug'] in LOCKED: err['Fest eingebaut, aber Abhängigkeit fehlt'].append(f"{m['slug']} → {', '.join(mi)}")
        elif mi and m['slug'] not in basis: note['Abhängigkeit fehlt (Website blendet aus)'].append(f"{m['slug']} → {', '.join(mi)}")
for m in M:
    if m['slug'] in LOCKED and m['slug'] not in F: err['Fest eingebaut, aber ohne Datei'].append(m['slug'])
# 2b Doppelungen/Konflikte mit dem festen Leistungspaket (Entscheidung 08.11.: solche Einträge gehören nicht in den Katalog)
for b in D['beziehungen']:
    if b['art'] in ('K', 'D') and any(s in LOCKED for s in b['mods']) and any(s not in LOCKED for s in b['mods']):
        err['Konflikt mit festem Leistungspaket (Eintrag entfernen)'].append(' + '.join(b['mods']))
# 3 Gruppen und Beziehungen
for g in D['gruppen']:
    for s in g['mods']:
        if s not in BY: err['Gruppe verweist auf fehlenden Eintrag'].append(f"{g['id']}: {s}")
    if any(s in LOCKED for s in g['mods']): note['Gruppe mit fest eingebautem Mitglied (andere nicht wählbar)'].append(f"{g['id']}: {g['mods']}")
for b in D['beziehungen']:
    for s in b['mods']:
        if s not in BY: err['Beziehung verweist auf fehlenden Eintrag'].append(f"{b['art']} {b['mods']}")
    if b.get('erledigt'): note['Beziehung „erledigt“ ohne Wirkung'].append(f"{' + '.join(b['mods'])}")
    if b['art'] in ('K', 'D') and all((BY.get(s, {}).get('pt') or 'm') == 's' for s in b['mods']): err['Shader schließen sich aus (Entscheidung: mehrere erlaubt)'].append(' + '.join(b['mods']))
# 4 Katalogtexte
EN = set('''a an the of to in for on with as by at from it its is are be been was were this that these those your you we our us can will would more most all
any some no not but or and if so than then when while because into out up down over under just only also very much many new adds add makes make allows allow
lets let shows show improves improve better fixes fix changes change removes remove take takes get gets give gives use uses using which what who how they their
there here like way everything anything something nothing simple simply easy easily small little big large lightweight fully fast faster'''.split())
DE = set('der die das und mit für ein eine einen einem eines ist nicht auf im in zu den dem des sich bei wird werden oder auch nur aus wie läuft macht zeigt dass beim vom zum zur kein keine mehr als sie es du dein deine dich dir wenn noch schon sehr ohne über unter'.split())
for m in vis:
    w = re.findall(r"[a-zäöüß']+", (m.get('notiz') or '').lower()); e = sum(t in EN for t in w); d = sum(t in DE for t in w) + (2 if re.search('[äöüß]', m.get('notiz') or '') else 0)
    if not m.get('notiz'): note['Beschreibung fehlt'].append(m['slug'])
    elif e > d: note['Beschreibung noch englisch'].append(f"{m['slug']}: {m['notiz'][:70]}")
    if m['cat'] not in ('P', 'V', 'B', 'G', 'T', 'S'): err['Unbekannte Kategorie'].append(f"{m['slug']}: {m['cat']}")
# 5 Medien
def ok(s):
    e = Me.get(s, {}); return any(v.get('status') in ('auto', 'ok') for v in e.get('videos', [])) or (e.get('breite') or 0) >= 1280 or bool(S.get(s, {}).get('proben'))
for m in vis:
    if not ok(m['slug']) and m['slug'] not in LOCKED: note['Medien: ohne HD-Bild/Video/Hörprobe'].append(m['slug'])
pend = sum(1 for e in Me.values() if isinstance(e, dict) for v in e.get('videos', []) if v.get('status') == 'review')
note['_Zahlen'].append(f"sichtbar {len(vis)}, Dateien {len(F)}, Gruppen {len(D['gruppen'])}, Beziehungen {len(D['beziehungen'])}, ausgeblendet {len(rpbad) + len(basis)}, Videos zur Prüfung offen {pend}")

for title, bag in (('FEHLER', err), ('HINWEISE', note)):
    print(f'# {title}: {sum(len(v) for v in bag.values())}')
    for k, v in bag.items(): print(f'\n## {k} ({len(v)})'); [print(' -', y) for y in v[:20]]
    print()
if '--ci' in sys.argv and err: sys.exit(1)
