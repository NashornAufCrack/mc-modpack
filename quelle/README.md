# Quelle des Katalogs

Die Skripte erwarten feste Pfade. In einer neuen Sitzung zuerst:

    git clone https://github.com/NashornAufCrack/mc-modpack /home/claude/mc-modpack
    ln -s /home/claude/mc-modpack/quelle /home/claude/modpack

- `mods.json`, `files.json`, `decisions.json`: Katalog (Quelle der Wahrheit)
- `build.py`: erzeugt `data/*.json` und `data/app-data.json` (übernimmt vorher automatische Updates aus `data/files.json`)
- `tools/merge_auto.py`: übernimmt kuratierte Einträge aus `data/auto.json`
- App: `cd app && npm ci && npm run build` (Website `/neu/`) bzw. `npm run artifact`
