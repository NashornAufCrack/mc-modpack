# Umbau-Plan Mod-Katalog 26.3

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

**Wünsche ohne 26.3-Version (Stand 07.11.):** Pog's Fresher Ores (26.2), Voxy SeedGen (26.2), Soft Leaves (26.2), Road Weaver (1.21.11), Portal Glimpse (1.21.1), Timber Tales (nicht als Mod gefunden), Weather Glass und Rainbow Foliage Vanilla (nicht gefunden). Ebenso fehlen Kerria, Figura, AnimatiCam, Exordium, Better Third Person, Sodium Dynamic Lights und Cave Dust.

**Offen:** Zukunftsplan für die nächste Minecraft-Version (besprechen wir die Tage).

---

## Weiter gültig aus dem ursprünglichen Plan
- **Technik:** Svelte 5 + Vite + TypeScript + Tailwind v4. Zwei Ausgaben: GitHub Pages (`/neu/`) und Einzeldatei fürs Artifact.
- **Design:** ruhiges dunkles Design (hell wählbar), links Katalog, rechts dauerhaft die Pack-Leiste. Startseite = Builder mit Assistent, Vorlagen und Suche.
- **Entscheidungs-Karten** im Builder statt eigenem Tab. Assistent als Schritt-für-Schritt-Dialog mit Vorschau. Vorlagen-Banner mit Änderungen.
- **Konflikte in vier Stufen:** inkompatibel (gesperrt) · gleiche Funktion (nur eins) · Teilüberschneidung (Hinweis) · passt gut zusammen.
- **Ideen für später:** Installations-Anleitung mit Bildern, Crash-Log-Erklärung, Leistungskosten aus echten Messungen, Vorher/Nachher-Schieberegler, Pack-Versionen vergleichen.
- **Review-Zeit:** samstags ab 16 Uhr (1–2 Std.).
- **Gestrichen:** Config-Editor, Tastatur/Maus-Ansicht, Headless-Config-Pipeline.
