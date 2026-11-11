# Datenprüfung für den Mod-Katalog (läuft lokal und in der Prüfung auf GitHub).
# Aufruf im Repo-Ordner: python3 qa/datacheck.py [--ci]
# FEHLER (Exit-Code 1 mit --ci) machen Exporte kaputt; HINWEISE sind Pflege-Aufgaben.
import json, re, sys, collections, os
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(base_dir)
A = json.load(open('data/app-data.json', encoding='utf-8')); F = A['files']; M = A['mods']; D = A['dec']; BY = {m['slug']: m for m in M}
Me = json.load(open('data/media.json', encoding='utf-8')) if os.path.exists('data/media.json') else {}
S = json.load(open('data/sounds.json', encoding='utf-8')) if os.path.exists('data/sounds.json') else {}
x = A.get('x', {}); rpbad = set(x.get('rpbad', [])); basis = set((x.get('basisfehlt') or {}).keys())
IGNORE = {'qsl', 'quilted-fabric-api', 'connector', 'modefite-item-definition-backport'}
ALLOWED = {'cdn.modrinth.com', 'github.com', 'raw.githubusercontent.com', 'gitlab.com'}
ALLOWED_MR_GROUPS = {'playeranim', 'guitex', 'bettergrass', 'grasslook'}
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

# 2c JAR-Inspektion: Breaks gegen das feste Leistungspaket und Minecraft 26.3 Kompatibilität
def clean_ver(v):
    v = re.sub(r'^(?:mc)?[0-9.]+[_-]?', '', str(v)) if any(str(v).startswith(p) for p in ['mc26', 'fabric-26']) else str(v)
    v = v.split('+')[0].split('-')[0]
    parts = re.findall(r'\d+', v)
    return [int(p) for p in parts] if parts else [0]

def cmp_ver(v1, v2):
    l = max(len(v1), len(v2))
    a = v1 + [0]*(l-len(v1)); b = v2 + [0]*(l-len(v2))
    for i in range(l):
        if a[i] < b[i]: return -1
        if a[i] > b[i]: return 1
    return 0

def is_mc26_compatible(constraint):
    if isinstance(constraint, list): return any(is_mc26_compatible(c) for c in constraint)
    c = str(constraint).strip()
    if not c or c == '*': return True
    if c.startswith('26.3') or '26.*' in c or c.startswith('^26') or c.startswith('~26'): return True
    rm = re.match(r'^(>=|>)\s*([0-9a-zA-Z._-]+)\s*(<=|<)\s*([0-9a-zA-Z._-]+)$', c)
    if rm:
        op1, low, op2, high = rm.groups()
        l = clean_ver(low); h = clean_ver(high); act = [26, 3]
        ok1 = (cmp_ver(act, l) >= 0) if op1 == '>=' else (cmp_ver(act, l) > 0)
        ok2 = (cmp_ver(act, h) <= 0) if op2 == '<=' else (cmp_ver(act, h) < 0)
        return ok1 and ok2
    m_low = re.match(r'^(>=|>)\s*([0-9a-zA-Z._-]+)$', c)
    if m_low:
        op, low = m_low.groups()
        l = clean_ver(low); act = [26, 3]
        return (cmp_ver(act, l) >= 0) if op == '>=' else (cmp_ver(act, l) > 0)
    m_hi = re.match(r'^(<=|<|=|==)?\s*([0-9a-zA-Z._-]+)$', c)
    if m_hi:
        op, hi = m_hi.groups()
        op = op or '='
        h = clean_ver(hi); act = [26, 3]
        c_val = cmp_ver(act, h)
        if op == '<=': return c_val <= 0
        if op == '<': return c_val < 0
        if op in ('=', '=='): return c_val == 0
    return False

def match_ver(actual, constraint):
    if isinstance(constraint, list): return any(match_ver(actual, c) for c in constraint)
    constraint = str(constraint).strip()
    if not constraint or constraint == '*': return True
    act = clean_ver(actual)
    m = re.match(r'^(<=|<|>=|>|=|~|\^)?\s*([0-9a-zA-Z._+-]+)$', constraint)
    if not m: return False
    op, req_s = m.groups()[0] or '=', m.groups()[1]
    req = clean_ver(req_s)
    c = cmp_ver(act, req)
    if op in ('~', '^', '=', '=='): return c == 0
    if op == '<=': return c <= 0
    if op == '<': return c < 0
    if op == '>=': return c >= 0
    if op == '>': return c > 0
    return c == 0

if os.path.exists('data/jar-inspection.json'):
    with open('data/jar-inspection.json', encoding='utf-8') as f_insp:
        INSP = json.load(f_insp)
    for s, f in F.items():
        if len(f) > 8 and f[8] != 'm': continue
        info = INSP.get(s, {})
        mc = info.get('depends', {}).get('minecraft')
        if mc and not is_mc26_compatible(mc):
            err['Mod inkompatibel mit Minecraft 26.3 (fabric.mod.json)'].append(f"{s}: erfordert {mc}")
        breaks = info.get('breaks', {})
        for target, constraint in breaks.items():
            if target in LOCKED and target in F:
                t_ver = F[target][6]
                if constraint == '*' or match_ver(t_ver, constraint):
                    err['Mod kollidiert mit festem Leistungspaket (breaks in JAR)'].append(f"{s} schließt {target} ({constraint}) aus")
# 3 Gruppen und Beziehungen
for g in D['gruppen']:
    for s in g['mods']:
        if s not in BY: err['Gruppe verweist auf fehlenden Eintrag'].append(f"{g['id']}: {s}")
    if any(s in LOCKED for s in g['mods']): note['Gruppe mit fest eingebautem Mitglied (andere nicht wählbar)'].append(f"{g['id']}: {g['mods']}")
    pts = {(BY.get(s, {}).get('pt') or 'm') for s in g['mods'] if s in BY}
    if 's' in pts: err['Shader darf nicht in einer Sperr-Gruppe stehen (im Spiel abschaltbar)'].append(f"{g['id']}: {g['mods']}")
    if {'m', 'r'}.issubset(pts) and g['id'] not in ALLOWED_MR_GROUPS: err['Ungenehmigte Mod+ResourcePack-Sperrgruppe (besser per Auto-Config lösen)'].append(f"{g['id']}: {g['mods']}")
for b in D['beziehungen']:
    for s in b['mods']:
        if s not in BY: err['Beziehung verweist auf fehlenden Eintrag'].append(f"{b['art']} {b['mods']}")
    if b.get('erledigt'): note['Beziehung „erledigt“ ohne Wirkung'].append(f"{' + '.join(b['mods'])}")
    if b['art'] in ('K', 'D') and any((BY.get(s, {}).get('pt') or 'm') == 's' for s in b['mods']): err['Shader darf nicht per K/D gesperrt werden (im Spiel abschaltbar, Hinweis T oder Auto-Config nutzen)'].append(' + '.join(b['mods']))
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
    if (m.get('pt') or 'm') == 's' and (m.get('voxy') or {}).get('s') not in ('ja', 'nein', '?'): note['Shader ohne Voxy-Angabe (Feld voxy, siehe quelle/tools/datafix_2026_11_08c.py)'].append(m['slug'])
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
