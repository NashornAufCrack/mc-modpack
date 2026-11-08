# Umbau-Plan Mod-Katalog 26.3

## Nach deinen Antworten (08.11.2026, abends)

- Umgesetzt: Server-Pack-Regel (`nichtAuto` für AutoModpack, Chunky Offline, TT20), 6 Mods mit Konflikt oder Doppelung zum Leistungspaket entfernt, Website blendet solche Einträge künftig selbst aus.
- Prüfseite für Videos: https://claude.ai/artifact/Vhs2mkJz1cYP8XUjH8ySvG. Bildbögen baut der Workflow „Prüfseite“ (`scripts/pruefseite.py`), Urteile übernimmt `scripts/urteile-import.mjs` (Sonntagslauf, Aufgabe 1b). Auf der Seite entschiedene Videos bleiben dort änderbar.
- Feature-Umsetzung in dieser Reihenfolge (klein zuerst): Website baut sich selbst → Server-Pack wählbar → Grafik-Warnung → Shader und Fernsicht → packwiz-Export und RSS-Feed → YouTube-Vorschaubilder selbst hosten → Symbolbilder für Technik-Mods → Abhängigkeits-Check aus den Mod-Dateien → Absturz-Hilfe → Starttest je Vorlage → Launcher-Anleitungen → Vorher-nachher-Regler (Bilder von Tiziano) → Textur-Vorschau.
- Zu besprechen: Pack importieren, mehrere Packs speichern und vergleichen, TikTok als Quelle; offen: Änderungsprotokolle.

## Audit, Optimierung & Feature-Liste (08.11.2026)

Vollständige Durchsicht von Website-Code, Abläufen, Katalogdaten und Medien, mit Browser-Tests (Playwright, axe) und einem unabhängigen Zweitprüfer. Details, Fehlertabelle und Feature-Liste: Dokument „Mod-Katalog 26.3 – Audit, Optimierung & Feature-Liste“ (https://claude.ai/artifact/Wa5jeWL9xwzzEuM6n6NCqZ).

- 29 Fehler behoben, 8 davon schwer (Datapacks im Export, doppelte Dateinamen, Abhängigkeiten als Projekt-IDs, Update-Check verwarf neue Pflicht-Abhängigkeiten, Teilen-Links, Sackgasse bei Konflikten mit festen Mods, Shader-Ausschluss Pegasus/Photon).
- 127 Beschreibungen übersetzt, Datenprüfung 0 Fehler, Browser-Tests 0 Fehler, axe 0 Verstöße, Typprüfung 0 Fehler.
- Neu: Ablauf „Prüfung“ (.github/workflows/pruefung.yml) nach jeder Änderung und nach jedem Update-Check; Prüfwerkzeuge in `qa/` (datacheck.py, e2e.js).
- Update-Check: lädt neue Pflicht-Abhängigkeiten nach oder hält das Update zurück, schreibt `quelle/files.json` mit, rechnet bei Push-Konflikt neu. `build.py` gleicht deshalb nicht mehr mit `data/files.json` ab.
- Medien: schlanke `data/media-app.json` für die Website; vorübergehende Fehler werden bis zu 3-mal wiederholt.
- Offen: 79 Einträge ohne HD-Medien, 409 Videos in Prüfung, 4 Fragen und 18 Feature-Ideen zum Entscheiden.

## Aktueller Stand und Planänderung (07.11.2026, abends)

**Gestrichen (deine Entscheidung 17:18):** alle Config- und Tastatur-Funktionen (Abschnitte 5 und 6 unten sind nur noch Archiv). Assistent, Auswahl und Resource-Pack-Sortierung bleiben unverändert.

**Neue Schwerpunkte**
- Jede Mod bestmöglich erklären und zeigen: deutsche Beschreibung, Bilder und Videos in guter Qualität.
- Leistungspaket: alle Performance-Mods sind fest dabei und erscheinen als eine Karte. Ausgeschlossen sind nur Mods mit belegtem Schaden: Krypton, Moonrise, Alternate Current, Better Block Entities, Cull Leaves, Let Me Despawn. Nvidium bleibt (wirkt ohne Shader).
- Wählbar sind nur Optik, Gameplay, Welt/Terrain, Shader und Resource Packs. Gameplay und Terrain lassen sich oben herausfiltern.
- Punchy! Moves ist Standard für den Spieler, sonst Fresh Animations. Beta-Mods sind erlaubt.
- CurseForge-Mods (Studious Keybinds, Cinematic Interactions, Improved Inventory Tabs, Ping) werden gespiegelt und laden im Export automatisch mit.

**Umgesetzt**
- 159 neue kuratierte Einträge (insgesamt 690), alle mit deutschem Text.
- Medien:
  - Modrinth- und CurseForge-Bilder in voller Auflösung
  - YouTube per API und zusätzlich yt-dlp-Suche (ohne Kontingent)
  - Visuelle Prüfung über Prüfbögen aus YouTube-Vorschaubildern. Downloads sind von GitHub aus gesperrt.
  - Erste 96 Mods geprüft: 103 Videos freigegeben, 96 abgelehnt
- Resource Packs: pack.mcmeta jeder Datei wird gegen Format 97.1 (26.3) geprüft. Veraltete Packs werden ausgeblendet.
- Auto-Update täglich für alle Inhalte:
  - Festgelegte Versionen (Sodium 0.9.2, Iris 1.11.7, Voxy 0.2.20-beta, Photon v1.4) wechseln nie automatisch.
  - Ein Wechsel von einer stabilen Version auf eine Beta passiert ebenfalls nicht automatisch. Beides wird nur gemeldet.
  - Ergebnis in UPDATES.md (Repo) und auf der Updates-Seite der Website.
- Geplante Aufgabe jeden Sonntag 10:43:
  - Update-Bericht
  - Vorschläge für neue gehypte Mods, aufgenommen erst nach deiner Zustimmung
- Katalog-Quelle liegt jetzt im Repo unter `quelle/`, damit auch neue Sitzungen weiterarbeiten können.

**Wünsche ohne 26.3-Version (Stand 07.11.):** Pog's Fresher Ores (26.2), Voxy SeedGen (26.2), Soft Leaves (26.2), Road Weaver (1.21.11), Portal Glimpse (1.21.1). Timber Tales, Weather Glass und Rainbow's Foliage sind inzwischen im Katalog. Ebenso fehlen Kerria, Figura, AnimatiCam, Exordium, Better Third Person, Sodium Dynamic Lights und Cave Dust.

**Offen:** Zukunftsplan für die nächste Minecraft-Version (besprechen wir die Tage).

---

## Weiter gültig aus dem ursprünglichen Plan
- **Technik:** Svelte 5 + Vite + TypeScript + Tailwind v4. Zwei Ausgaben: GitHub Pages (`/neu/`) und Einzeldatei fürs Artifact.
- **Design:** ruhiges dunkles Design (hell wählbar), links Katalog, rechts dauerhaft die Pack-Leiste. Startseite = Builder mit Assistent, Vorlagen und Suche.
- **Entscheidungs-Karten** im Builder statt eigenem Tab. Assistent als Schritt-für-Schritt-Dialog mit Vorschau. Vorlagen-Banner mit Änderungen.
- **Konflikte in vier Stufen:** inkompatibel (gesperrt) · gleiche Funktion (nur eins) · Teilüberschneidung (Hinweis) · passt gut zusammen.
- **Ideen für später:** jetzt gesammelt in der Feature-Liste des Audit-Dokuments (18 Ideen mit Entscheidungs-Spalte).
- **Review-Zeit:** samstags ab 16 Uhr (1–2 Std.).
- **Gestrichen:** Config-Editor, Tastatur/Maus-Ansicht, Headless-Config-Pipeline.
