# Quelle des Katalogs

Die Skripte erwarten feste Pfade. In einer neuen Sitzung zuerst:

    git clone https://github.com/NashornAufCrack/mc-modpack /home/claude/mc-modpack
    ln -s /home/claude/mc-modpack/quelle /home/claude/modpack

- `mods.json`, `files.json`, `decisions.json`: Katalog (Quelle der Wahrheit)
- `build.py`: erzeugt `data/*.json` und `data/app-data.json`; übersetzt Abhängigkeiten (Projekt-IDs → Namen, `data/deps-fix.json`). Vorher `git pull`: der Update-Check schreibt `quelle/files.json` selbst.
- `tools/de_notiz.json`: deutsche Beschreibungen; `tools/de_notiz_2.py` und `tools/datafix_2026_11_08.py`: Korrekturen aus dem Audit (wiederholbar)
- Prüfen: `python3 qa/datacheck.py` (Daten) und `node qa/e2e.js qa/out` bei laufendem `python3 -m http.server 8765` im Repo-Ordner (Abläufe, Exporte, Barrierefreiheit). Beides läuft auch auf GitHub im Ablauf „Prüfung“.
- `tools/merge_auto.py`: übernimmt kuratierte Einträge aus `data/auto.json`
- App: `cd app && npm ci && npm run build` (Website `/neu/`) bzw. `npm run artifact`
