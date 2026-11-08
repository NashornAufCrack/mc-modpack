# Perfektes MC Modpack – Entscheidungen & offene Punkte

Stand: 08.11.2026 abends (Antworten zum Audit und Feature-Entscheidungen)

## Festgelegt
- Zwei Packs als Schichten: Basis „Vanilla Visual“ (nur clientseitig) + Schicht „Vanilla Plus“
- Fabric · MC 26.3 · Fabric Loader 0.20.1
- RTX 3080, 1440p, 144 Hz, G-Sync → FPS-Limit 140
- Fernsicht: Voxy (Distant Horizons bleibt wählbare Alternative, nie zusammen) · Shader: Photon · Spieler: Punchy (Ego) + Punchy! Moves (Third Person), sonst Fresh Animations
- Festgelegte Versionen (nie automatisch ändern): Sodium 0.9.2, Iris 1.11.7, Voxy 0.2.20-beta, Photon v1.4
- Pflichtmods: Technopig (technomodel), Default Options, Not Enough Crashes, Crash Assistant, Neruina, mclo.gs
- Leistungspaket: alle Performance-Mods fest dabei und nicht abwählbar; ausgeschlossen nur bei belegtem Schaden (Krypton, Moonrise, Alternate Current, Better Block Entities, Cull Leaves, Let Me Despawn). Nvidium bleibt.
- Beta-Mods erlaubt. Auto-Update: kein automatischer Wechsel von stabil auf Beta.
- Config- und Tastatur-Funktionen gestrichen (07.11., 17:18).
- Studious Keybinds, Cinematic Interactions, Timber Tales, Weather Glass, Ping, Improved Inventory Tabs: von CurseForge gespiegelt, laden automatisch (privates Projekt).
- Resource Packs nur, wenn pack.mcmeta 26.3 (Format 97.1) unterstützt.
- Jeden Sonntag: Update-Bericht + Vorschläge für neue Mods, Aufnahme nur nach Rücksprache. Der Bericht nennt auch das Ergebnis der „Prüfung“.
- Datapacks wirken über Global Packs (kommt automatisch mit) in jeder neu erstellten Welt; sie stecken in .mrpack, Prism-Instanz und Server-Pack.
- Alles, was mit dem festen Leistungspaket nicht zusammen funktioniert oder es nur doppelt, fliegt raus (08.11. abends): Moonrise, AsyncParticles, Particle Core (Konflikt mit C2ME/Async bzw. Smart Particles), Cull Leaves, Better Block Entities, Packet Fixer (doppeln MoreCulling, OBE, XXL Packets). Die Website blendet solche Einträge künftig von selbst aus und nennt sie auf der Update-Seite; die Datenprüfung meldet sie als Fehler.
- Server-Pack (08.11. abends): harmlose Technik-Werkzeuge kommen automatisch hinein, auch Carpet mit Erweiterungen und Chunky. AutoModpack (bräuchte jeder Spieler), Chunky Offline (startet von selbst eine Vorgenerierung mit 10.000 Blöcken Radius) und TT20 (ändert Spielabläufe bei Lag) nur, wenn gewählt (Feld `nichtAuto`). Neue Server-Werkzeuge, die von selbst etwas an Welt oder Spielablauf ändern, bekommen ebenfalls `nichtAuto`.
- Video-Prüfung über die Prüfseite (https://claude.ai/artifact/Vhs2mkJz1cYP8XUjH8ySvG), damit die Hauptseite nutzbar bleibt. Der Sonntagslauf übernimmt die Urteile (`scripts/urteile-import.mjs`); zurückgenommene Urteile werden wieder offen.
- Einträge, deren Pflicht-Abhängigkeit es für 26.3 nicht gibt, werden ausgeblendet und auf der Update-Seite genannt (z. B. Bare Bones x Fresh Animations, Basis Bare Bones nur bis 1.21.9).
- Vorlage „Nur Performance“ = nur das feste Leistungspaket (ohne Krypton).
- Teilen-Links speichern Mod-Namen (#p=…); alte #pack-Links werden noch gelesen.
- Grundregel echte Doppelungen: nie zwei gleichzeitig im Pack. Doppelungen werden einzeln mit Tiziano geklärt.
- Zugriff: Launcher-Ordner NUR LESEN; schreiben nur in A:\Claude Projekt 1. Downloads-Ordner nicht pauschal auflisten.

## Doppelungen – Tizianos Entscheidungen
- Raus: Sound Physics Remastered (→ Perfected), Wakes Reforged (→ Wakes), CrashPatch, OneConfig-Familie, Held Item Tooltips, The One Probe, alle Sortierer außer ClientSort, Bind Commands + MacroKeybinds, Resourcify + Easy Install, YOSBR, Disenchanting Table, Glow Trims, Dynamic Crosshair, LiteMiner, FA-Einzelpacks, A Good Place, Round Trees
- Nur eins wählbar (51 Gruppen), u. a.: Blätter (inkl. Cubic Leaves, Rainbow's Foliage), Menü-Optik, Minimap, Fadenkreuz, Effekt-Anzeige, Bäume fällen (FallingTree/Timber Tales), Block-Platzier-Animation (SBA/Fresh Block Animations), Fortschritte, Aufnahme (ReplayMod/Flashback), Better-Grass, Totem, Spawn-Eier, Betten, 3D-Laternen, 3D-Items, Pferde, End- und Nether-Umbau, Spieler-Animation Third Person (Punchy! Moves/NEA/CPA/Detailed/FA Player), Ego-Animation (Punchy/Interactive Stuff)
- Shader: mehrere wählbar, im Spiel ist immer einer aktiv. Ausschließen nur, was genau dasselbe macht oder sich schadet.
- Fancy World Animations nicht zusammen mit Animated Doors bzw. Swinging Lanterns (die beiden untereinander schon)
- Frei kombinierbar: Umgebungs-Partikel (Hinweis auf mögliche Doppel-Effekte), Erz-Packs, Biome-Mods, Nature X
- Partikel-Optimierer: Smart Particles steckt fest im Leistungspaket; AsyncParticles und Particle Core sind deshalb raus.

## Feature-Liste – Tizianos Entscheidungen (08.11.2026, im Audit-Dokument)
- Ja: Starttest je Vorlage, Abhängigkeits-Check aus den Mod-Dateien, Absturz-Hilfe, deutsche Launcher-Anleitungen, Video-Prüfseite (erledigt), Website baut sich selbst, Grafik-Warnung im Assistenten, Shader und Fernsicht (Voxy-Verträglichkeit je Shader), Server-Pack wählbar, Symbolbilder für Technik-Mods, Vorher-nachher-Regler für Shader, Textur-Vorschau im Browser, YouTube-Vorschaubilder selbst hosten, packwiz-Export und RSS-Feed
- Muss noch genauer besprochen werden: Pack importieren, mehrere Packs speichern und vergleichen, TikTok-Videos als Quelle
- Noch offen: Änderungsprotokolle auf der Update-Seite

## Offene Punkte
- Zukunftsplan für die nächste Minecraft-Version (besprechen)
- 78 wählbare Einträge ohne HD-Bild, Video oder Hörprobe; 399 Videos warten auf der Prüfseite (Stand 08.11. abends)
- Netzzugang für YouTube, i.ytimg, github.io, Fabric, CurseForge, mclo.gs: Anleitung geschickt (Edit cloud environment → Network access → Custom), noch nicht freigegeben
- Feature-Liste: drei Punkte besprechen, einer offen (siehe oben)
