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

  <h2>Installieren</h2>
  <div class="grid">{#each INST as [t, d]}<div class="card-surface it"><b>{t}</b><p class="muted">{d}</p></div>{/each}</div>

  <h2>Begriffe</h2>
  <dl>{#each G as [t, d]}<div><dt>{t}</dt><dd class="muted">{d}</dd></div>{/each}</dl>
</section>

<style>
  .wrap { max-width: 880px; padding: 1.8rem 0; } h1 { margin: 0 0 1rem; } h2 { font-size: 1.05rem; margin: 1.6rem 0 .6rem; }
  .crash-banner { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.2rem; border-radius: var(--radius); border: 1px solid var(--accent); background: var(--accent-soft); margin-bottom: 1.5rem; flex-wrap: wrap; }
  .crash-banner p { margin: .25rem 0 0; font-size: .88rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: .7rem; } .it { padding: .9rem; } .it p { margin: .3rem 0 0; font-size: .9rem; }
  dl { display: grid; gap: .6rem; margin: 0; } dt { font-weight: 600; } dd { margin: .1rem 0 0; font-size: .9rem; }
</style>
