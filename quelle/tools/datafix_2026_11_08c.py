# Feature „Shader und Fernsicht“ (08.11.2026): pro Shader, ob er mit Voxy zusammen funktioniert (idempotent).
# Quellen (geprüft für die Versionen im Katalog): voxy-mod.com/shaders-that-work-with-voxy,
# gist.github.com/appleneko2001/51dcf842c934db4c6201146f2e594953 (Stand 12.09.2026),
# Modrinth-Beschreibungen und Changelogs der Shader. Neue Shader brauchen dieses Feld (qa/datacheck.py meldet es).
import json
VOXY = {
    'photon-shader':             ('ja', 'Unterstützt Voxy offiziell (ab v1.3).'),
    'complementary-reimagined':  ('ja', 'Unterstützt Voxy (ab r5.8).'),
    'complementary-unbound':     ('ja', 'Unterstützt Voxy (ab r5.8).'),
    'solas-shader':              ('ja', 'Unterstützt Voxy (ab 3.2).'),
    'bsl-shaders':               ('ja', 'Unterstützt Voxy (ab 10.1p1).'),
    'i-like-vanilla':            ('ja', 'Unterstützt Voxy (ab 1.1.3).'),
    'steadfast-shaders':         ('ja', 'Unterstützt Voxy (ab 0.8.0).'),
    'makeup-ultra-fast-shaders': ('ja', 'Unterstützt Voxy (ab 9.5).'),
    'noble':                     ('ja', 'Unterstützt Voxy (ab 1.8.6).'),
    'sildurs-vibrant-shaders':   ('ja', 'Unterstützt Voxy (ab 1.56).'),
    'lumenite-shaders':          ('ja', 'Unterstützt laut Autor Voxy und Distant Horizons.'),
    'beautify-shaders':          ('ja', 'Unterstützt Voxy (ab 1.3.5).'),
    'mellow':                    ('nein', 'Mit Voxy auf 26.3 kaputt (bekannter Fehler laut Autor). Nimm einen anderen Shader oder statt Voxy Distant Horizons.'),
    'bliss-shader':              ('nein', 'Voxy-Unterstützung gibt es nur in der Entwicklerversion, nicht in der Version hier. Mit Voxy einen anderen Shader nehmen.'),
    'pegasus':                   ('?', 'Der Autor nennt nur Distant Horizons, Voxy nicht. Die ferne Landschaft fehlt dann wahrscheinlich oder sieht falsch aus.'),
    'astralex':                  ('?', 'Der Autor nennt keine Voxy-Unterstützung. Die ferne Landschaft fehlt dann wahrscheinlich oder sieht falsch aus.'),
    'lumarit':                   ('?', 'Der Autor nennt keine Voxy-Unterstützung. Die ferne Landschaft fehlt dann wahrscheinlich oder sieht falsch aus.'),
    'shiroi-visuals':            ('?', 'Der Autor nennt keine Voxy-Unterstützung. Die ferne Landschaft fehlt dann wahrscheinlich oder sieht falsch aus.'),
    'komorebi-shaders':          ('?', 'Der Autor nennt keine Voxy-Unterstützung. Die ferne Landschaft fehlt dann wahrscheinlich oder sieht falsch aus.'),
}
mods = json.load(open('mods.json'))
n = 0
for m in mods:
    if m['slug'] in VOXY:
        s, t = VOXY[m['slug']]; m['voxy'] = {'s': s, 't': t}; n += 1
    if m['slug'] == 'steadfast-shaders':
        m['notiz'] = 'Schneller, unaufdringlicher Shader vom Iris-Entwickler coderbot.'
json.dump(mods, open('mods.json', 'w'), ensure_ascii=False)
print(n, 'Shader mit Voxy-Angabe')
