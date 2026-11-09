<script lang="ts">
  import { ui } from "../lib/ui.svelte";

  const G: [string, string][] = [
    ["Mod", "Eine Erweiterung, die das Spiel selbst verändert, z. B. schneller macht oder neue Funktionen bringt. Läuft über Fabric."],
    ["Fabric", "Das Grundgerüst, das Mods lädt. Alle Mods hier sind für Fabric und Minecraft 26.3."],
    ["Shader", "Berechnet Licht, Schatten, Wasser und Himmel neu. Braucht Iris (kommt automatisch). Es ist immer nur ein Shader aktiv."],
    ["Resource Pack", "Tauscht Texturen, 3D-Modelle oder Sounds aus. Mehrere gleichzeitig möglich, die Reihenfolge entscheidet, welches gewinnt."],
    ["Datapack", "Ändert Regeln oder die Welt-Generierung. Wirkt in neuen Welten bzw. neuen Gebieten."],
    ["Fernsicht (Voxy)", "Zeigt die Landschaft weit hinter der normalen Sichtweite als vereinfachtes Modell."],
    ["Vanilla-Server", "Ein Server ohne Mods. Dort laufen nur Mods, die allein auf deinem PC arbeiten (Optik, Sound, Komfort)."],
    ["Konflikt", "Zwei Einträge, die dasselbe tun oder sich stören. Die Website lässt immer nur einen zu."],
    ["Vorlage", "Eine fertige Auswahl als Startpunkt. Deine Änderungen daran siehst du rechts in der Pack-Leiste."],
    ["Prism / Modrinth App", "Programme, die Minecraft mit Mods starten. Prism-Datei: Arbeitsspeicher ist schon eingestellt. .mrpack: in die Modrinth App ziehen."],
    ["Arbeitsspeicher (RAM)", "So viel Speicher bekommt Minecraft. Zu wenig führt zu Rucklern, zu viel bringt nichts."],
    ["FPS, 1 %-Tief", "Bilder pro Sekunde. Das 1 %-Tief zeigt die schlechtesten Momente, also wie stark es ruckelt."],
  ];
  const INST = [
    ["Prism Launcher", "„Für Prism herunterladen“ → in Prism auf „Instanz hinzufügen“ → „Importieren“ → die ZIP wählen → starten."],
    ["Modrinth App", "„.mrpack“ herunterladen → Datei in die Modrinth App ziehen → bei der Instanz unter Einstellungen › Java den Arbeitsspeicher einstellen."],
  ];
</script>

<section class="wrap">
  <h1>Hilfe & Glossar</h1>

  <div class="card-surface crash-banner">
    <div>
      <b>Minecraft stürzt ab oder startet nicht?</b>
      <p class="muted">Nutze unsere automatische Absturz-Hilfe: Log oder Fehlermeldung einfügen, wir nennen dir sofort auf Deutsch die schuldige Mod und die Lösung.</p>
    </div>
    <a class="btn primary sm" href="#crash" onclick={() => (ui.view = "crash")}>Zur Absturz-Hilfe →</a>
  </div>

  <div class="card-surface crash-banner" style="background: var(--surface-2); border-color: var(--line-2);">
    <div>
      <b>Fotos &amp; Videos kuratieren</b>
      <p class="muted">Mit unserem interaktiven Prüf-Werkzeug kannst du alle Mod-Bilder und YouTube-Videos durchklicken, unpassende Bilder rauswerfen und deine Auswahl speichern.</p>
    </div>
    <a class="btn sm" href="../pruefung/seite.html" target="_blank" rel="noopener">Zur Medien-Prüfung ↗</a>
  </div>

  <h2>Schritt-für-Schritt Launcher-Anleitungen</h2>
  <p class="muted">Wähle deinen Launcher. Alle Packs aus dem Mod-Katalog sind für <b>Fabric</b> und <b>Minecraft 26.3</b> vorkonfiguriert.</p>

  <div class="launcher-cards">
    <!-- Modrinth App -->
    <div class="card-surface launcher-card">
      <div class="lh">
        <span class="lbadge modrinth">Empfohlen</span>
        <h3>Modrinth App</h3>
      </div>
      <ol class="steps">
        <li><b>.mrpack herunterladen:</b> Baue dein Pack im Katalog zusammen und klicke rechts in der Pack-Leiste auf <i>„.mrpack herunterladen“</i>.</li>
        <li><b>Per Drag &amp; Drop importieren:</b> Öffne die Modrinth App und ziehe die heruntergeladene Datei <code>.mrpack</code> einfach mitten ins App-Fenster (oder klicke links auf <i>„+ Profil erstellen“ › „Aus Datei importieren“</i>).</li>
        <li><b>Arbeitsspeicher (RAM) prüfen:</b> Klicke beim neuen Profil auf das Zahnrad ⚙️ (Optionen) › <i>Java / Memory</i> und stelle den von der Website empfohlenen RAM-Wert ein (z. B. 4–6 GB).</li>
        <li><b>Starten:</b> Auf das grüne <i>„Spielen“</i>-Dreieck klicken – alle Mods, Shader und Configs laden automatisch!</li>
      </ol>
      <div class="placeholder-img" title="Bilder-Vorschau (kann später mit Screenshots ergänzt werden)">
        <span>🖼️ Screenshot-Bereich: Modrinth App Drag &amp; Drop</span>
      </div>
    </div>

    <!-- Prism Launcher -->
    <div class="card-surface launcher-card">
      <div class="lh">
        <span class="lbadge prism">Open Source</span>
        <h3>Prism Launcher</h3>
      </div>
      <ol class="steps">
        <li><b>Instanz herunterladen:</b> Klicke rechts in der Pack-Leiste auf <i>„Für Prism herunterladen“</i> (lädt ein vorkonfiguriertes ZIP-Paket).</li>
        <li><b>Instanz importieren:</b> Klicke in Prism oben links auf <i>„Instanz hinzufügen“</i>, wähle links den Reiter <i>„Importieren“</i> und wähle die heruntergeladene ZIP-Datei aus.</li>
        <li><b>Vorkonfiguriert:</b> Der empfohlene Arbeitsspeicher, Shader-Pfade und die richtige Resource-Pack-Reihenfolge sind bereits fest in der Instanz hinterlegt!</li>
        <li><b>Starten:</b> Doppelklick auf die Instanz in Prism – die Mods werden beim ersten Start blitzschnell geladen.</li>
      </ol>
      <div class="placeholder-img" title="Bilder-Vorschau (kann später mit Screenshots ergänzt werden)">
        <span>🖼️ Screenshot-Bereich: Prism Launcher Import</span>
      </div>
    </div>

    <!-- CurseForge App -->
    <div class="card-surface launcher-card">
      <div class="lh">
        <span class="lbadge curseforge">CurseForge</span>
        <h3>CurseForge App</h3>
      </div>
      <ol class="steps">
        <li><b>Eigenes Profil anlegen:</b> In der CurseForge-App auf <i>„Eigenes Profil erstellen“</i> klicken (Minecraft 26.3, Modloader: Fabric).</li>
        <li><b>Ordner öffnen:</b> Rechtsklick auf das erstellte Profil › <i>„Ordner öffnen“</i>.</li>
        <li><b>Dateien einfügen:</b> Kopiere deine heruntergeladenen Mod-Dateien in den Ordner <code>mods</code> und eventuelle Shader in <code>shaderpacks</code>.</li>
        <li><b>Spielen:</b> Auf <i>„Spielen“</i> klicken und Minecraft startet mit deinen ausgewählten Inhalten.</li>
      </ol>
      <div class="placeholder-img" title="Bilder-Vorschau (kann später mit Screenshots ergänzt werden)">
        <span>🖼️ Screenshot-Bereich: CurseForge Profil</span>
      </div>
    </div>
  </div>

  <h2>Begriffe</h2>
  <dl>{#each G as [t, d]}<div><dt>{t}</dt><dd class="muted">{d}</dd></div>{/each}</dl>
</section>

<style>
  .wrap { max-width: 880px; padding: 1.8rem 0; } h1 { margin: 0 0 1rem; } h2 { font-size: 1.05rem; margin: 1.6rem 0 .6rem; }
  .crash-banner { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.2rem; border-radius: var(--radius); border: 1px solid var(--accent); background: var(--accent-soft); margin-bottom: 1.5rem; flex-wrap: wrap; }
  .crash-banner p { margin: .25rem 0 0; font-size: .88rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: .7rem; } .it { padding: .9rem; } .it p { margin: .3rem 0 0; font-size: .9rem; }
  dl { display: grid; gap: .6rem; margin: 0; } dt { font-weight: 600; } dd { margin: .1rem 0 0; font-size: .9rem; }

  .launcher-cards { display: grid; gap: 1.2rem; margin: 1rem 0 2rem; }
  .launcher-card { padding: 1.2rem; border-radius: var(--radius); border: 1px solid var(--line); display: grid; gap: .8rem; }
  .lh { display: flex; align-items: center; justify-content: space-between; }
  .lh h3 { margin: 0; font-size: 1.15rem; }
  .lbadge { font: 600 .75rem var(--mono); padding: 2px 8px; border-radius: 6px; }
  .lbadge.modrinth { background: rgba(29, 185, 84, 0.15); color: #1db954; border: 1px solid rgba(29, 185, 84, 0.3); }
  .lbadge.prism { background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); }
  .lbadge.curseforge { background: rgba(249, 115, 22, 0.15); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.3); }
  .steps { margin: 0; padding-left: 1.4rem; display: grid; gap: .5rem; font-size: .92rem; }
  .steps li code { font-family: var(--mono); font-size: .85em; background: var(--bg); padding: 2px 6px; border-radius: 4px; }
  .placeholder-img { border: 1px dashed var(--line-2); border-radius: 8px; padding: 1rem; text-align: center; color: var(--muted); font-size: .85rem; background: var(--bg-2); }
</style>
