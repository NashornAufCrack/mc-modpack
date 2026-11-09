<script lang="ts">
  import { pack } from "../lib/pack.svelte";

  let input = $state("");
  let loading = $state(false);
  let result = $state<{
    ok: boolean;
    title: string;
    culprit?: string;
    details: string;
    solution: string;
    type: "ram" | "dep" | "mixin" | "shader" | "java" | "dup" | "other";
  } | null>(null);

  async function analyze() {
    let raw = input.trim();
    if (!raw) { result = null; return; }

    // mclo.gs Link eingegeben? Automatisch das echte Log laden
    const mclMatch = raw.match(/mclo\.gs\/([A-Za-z0-9]+)/);
    if (mclMatch) {
      loading = true;
      try {
        const res = await fetch(`https://api.mclo.gs/1/raw/${mclMatch[1]}`);
        if (res.ok) raw = await res.text();
      } catch {}
      loading = false;
    }

    result = parseLog(raw);
  }

  function parseLog(t: string) {
    // 1. RAM / Out of Memory
    if (/java\.lang\.OutOfMemoryError|There is insufficient memory|insufficient memory for the Java Runtime/i.test(t)) {
      return {
        ok: false,
        type: "ram" as const,
        title: "Zu wenig Arbeitsspeicher (RAM)",
        details: "Minecraft konnte nicht starten oder ist abgestürzt, weil der zugewiesene Arbeitsspeicher voll war.",
        solution: "Stelle im Launcher (z. B. Prism oder Modrinth App) unter Instanz › Einstellungen › Java mindestens 4 bis 6 GB (4096 bis 6144 MB) ein."
      };
    }

    // 2. Falsche Java-Version
    if (/has been compiled by a more recent version of the Java Runtime \(class file version 6[789]|Java 2[56]/i.test(t)) {
      return {
        ok: false,
        type: "java" as const,
        title: "Java-Version zu alt",
        details: "Minecraft 26.3 und seine Mods setzen eine moderne Java-Laufzeitumgebung (Java 25+) voraus.",
        solution: "Wähle im Launcher unter den Java-Einstellungen eine Java 25-Laufzeitumgebung aus (z. B. Eclipse Temurin oder Microsoft OpenJDK)."
      };
    }

    // 3. Doppelte Mod-Dateien
    const dupM = t.match(/Duplicate versions of (?:mod )?['"]?([a-z0-9_-]+)['"]?/i) || t.match(/Multiple versions of mod ([a-z0-9_-]+)/i);
    if (dupM) {
      const slug = dupM[1];
      const mName = pack.name(slug);
      return {
        ok: false,
        type: "dup" as const,
        title: `Doppelte Mod gefunden: ${mName}`,
        culprit: mName,
        details: `Im Ordner „mods“ befinden sich zwei verschiedene Versionen der Mod „${mName}“.`,
        solution: `Öffne den Ordner .minecraft/mods und lösche die ältere der beiden .jar-Dateien von ${mName}.`
      };
    }

    // 4. Fehlende Abhängigkeiten (Fabric Loader dependency error)
    if (/Unmet dependency|requires|needs/i.test(t) && /Mod ['"]?([a-z0-9_-]+)['"]? requires ['"]?([a-z0-9_-]+)['"]?/i.test(t)) {
      const depM = t.match(/Mod ['"]?([a-z0-9_-]+)['"]? requires (?:version .+ of )?['"]?([a-z0-9_-]+)['"]?/i);
      const modA = depM ? pack.name(depM[1]) : "Eine Mod";
      const modB = depM ? pack.name(depM[2]) : "eine andere Mod";
      return {
        ok: false,
        type: "dep" as const,
        title: `Fehlende Hilfs-Mod für ${modA}`,
        culprit: modA,
        details: `${modA} benötigt die Mod/Bibliothek „${modB}“, welche aktuell nicht im Ordner mods vorhanden ist.`,
        solution: `Füge „${modB}“ zu deinem Pack hinzu oder exportiere dein Pack erneut über den Katalog, damit alle Abhängigkeiten automatisch enthalten sind.`
      };
    }

    // 5. Mixin-Fehler / Mod-Crash beim Spielstart
    const mixinM = t.match(/(?:in|from) config \[([a-z0-9_-]+)\.mixins?\.json\]/i)
      || t.match(/Failed to apply mixin .+ in ([a-z0-9_-]+)\.mixins?\.json/i)
      || t.match(/MixinTransformerError: .+ in ([a-z0-9_-]+)\.mixins?\.json/i)
      || t.match(/([a-z0-9_-]+)\.mixins?\.json.+failed/i);

    if (mixinM) {
      let slug = mixinM[1].toLowerCase().replace(/^fabric-/, "").replace(/-fabric$/, "");
      const mName = pack.name(slug);
      return {
        ok: false,
        type: "mixin" as const,
        title: `Absturz ausgelöst durch: ${mName}`,
        culprit: mName,
        details: `Der Absturzbericht meldet einen Fehler in der Konfigurationsdatei „${mixinM[1]}.mixins.json“. Dies bedeutet fast immer, dass ${mName} nicht mit einem anderen Mod oder der Minecraft-Version zusammenpasst.`,
        solution: `Nimm „${mName}“ testweise aus deinem Pack oder deaktiviere die Datei im mods-Ordner. Prüfe danach, ob das Spiel startet.`
      };
    }

    // 6. Grafiktreiber / Shader / OpenGL Absturz
    if (/OpenGLException|GLFW error 65542|WGL: The driver does not appear to support OpenGL|GL_OUT_OF_MEMORY|Failed to compile shader/i.test(t)) {
      return {
        ok: false,
        type: "shader" as const,
        title: "Grafikkarten- oder Shader-Absturz",
        details: "Der Grafikkartentreiber unterstützt die geforderten Grafikfunktionen nicht oder der Shader konnte nicht kompiliert werden.",
        solution: "1. Schalte deinen Shader im Spiel mit Taste K aus oder entferne den Ordner shaderpacks.\n2. Aktualisiere den Grafikkartentreiber deiner Grafikkarte (NVIDIA, AMD oder Intel)."
      };
    }

    // 7. Allgemeiner Absturz mit bekannter Mod im Stacktrace
    const stackMod = t.match(/at net\.fabricmc\..+?\((.+?\.jar)\)/) || t.match(/-- Affected level --[\s\S]+?at (.+?)\./);
    if (/Crash Report/i.test(t)) {
      return {
        ok: false,
        type: "other" as const,
        title: "Absturzbericht erkannt",
        details: "Ein Minecraft-Absturzbericht wurde erkannt, aber kein eindeutiger einzelner Mod-Auslöser gefunden.",
        solution: "Prüfe in der Pack-Leiste des Katalogs den „Start-Check“. Stelle sicher, dass du genügend RAM zugewiesen hast (4–6 GB) und teste das Pack ggf. mit der Vorlage „Nur Performance“."
      };
    }

    return {
      ok: true,
      type: "other" as const,
      title: "Kein bekannter Absturzfehler",
      details: "In dem eingefügten Text konnte kein typischer Fehler (RAM, Mixin, Shader oder fehlende Abhängigkeit) gefunden werden.",
      solution: "Kopiere den Inhalt der Datei crash-reports/crash-....txt oder logs/latest.log und füge ihn hier ein."
    };
  }

  function sample(type: string) {
    if (type === "ram") input = "java.lang.OutOfMemoryError: Java heap space\n\tat net.minecraft.client.main.Main.main(Main.java:214)";
    else if (type === "mixin") input = "org.spongepowered.asm.mixin.transformer.throwables.MixinTransformerError: An unexpected critical error was encountered\n\t... in config [fallingtree.mixins.json]";
    else if (type === "shader") input = "org.lwjgl.opengl.OpenGLException: Cannot compile shader program: 1282";
    analyze();
  }
</script>

<section class="crash-wrap">
  <div class="head">
    <h2>Absturz-Hilfe &amp; Log-Analyse</h2>
    <p class="muted">Minecraft startet nicht oder schließt sich mit einem Fehler? Füge hier dein Absturz-Log (aus <code>crash-reports/</code> oder <code>logs/latest.log</code>) oder einen <code>mclo.gs</code>-Link ein. Wir sagen dir direkt auf Deutsch, welche Mod schuld ist und wie du es behebst.</p>
  </div>

  <div class="input-box">
    <textarea
      class="field log-input"
      rows="7"
      placeholder="Absturzbericht (Crash Report), latest.log oder mclo.gs-Link hier hineinkopieren …"
      bind:value={input}
      oninput={analyze}
    ></textarea>
    <div class="bar-acts">
      <button class="btn primary sm" disabled={loading || !input.trim()} onclick={analyze}>
        {#if loading}Lade von mclo.gs …{:else}Log analysieren{/if}
      </button>
      {#if input}
        <button class="btn ghost sm" onclick={() => { input = ""; result = null; }}>Leeren</button>
      {/if}
      <span class="samples muted small">Beispiele testen:
        <button class="link-btn" onclick={() => sample('ram')}>RAM voll</button> ·
        <button class="link-btn" onclick={() => sample('mixin')}>Mod-Fehler</button> ·
        <button class="link-btn" onclick={() => sample('shader')}>Shader</button>
      </span>
    </div>
  </div>

  {#if result}
    <div class="res-box" class:bad={!result.ok} class:ok={result.ok}>
      <div class="res-head">
        <span class="badge {result.ok ? 'ok' : 'bad'}">{result.ok ? 'Hinweis' : 'Ursache gefunden'}</span>
        <h3>{result.title}</h3>
      </div>
      <p class="res-det">{result.details}</p>
      <div class="res-sol">
        <b>Was du jetzt tun kannst:</b>
        <p>{result.solution}</p>
      </div>
    </div>
  {/if}

  <div class="info-card">
    <h4>Wo finde ich den Absturzbericht?</h4>
    <ul>
      <li><b>Prism Launcher:</b> Klicke links in Prism auf deine Instanz und dann rechts auf <b>„Protokoll ansehen“</b>.</li>
      <li><b>Modrinth App:</b> Klicke bei deiner Instanz auf <b>„Logs“</b>.</li>
      <li><b>Im Windows-Explorer:</b> Drücke <kbd>Windows</kbd>+<kbd>R</kbd>, tippe <code>%appdata%\.minecraft\crash-reports</code> ein und öffne die neueste Textdatei.</li>
    </ul>
  </div>
</section>

<style>
  .crash-wrap { display: flex; flex-direction: column; gap: 1rem; max-width: 880px; padding: 1.5rem 0; }
  .head h2 { margin: 0 0 .3rem; font-size: 1.35rem; }
  .head p { margin: 0; font-size: .9rem; max-width: 65ch; }
  .input-box { display: flex; flex-direction: column; gap: .5rem; }
  .log-input { width: 100%; font: .82rem var(--mono); padding: .75rem; border-radius: var(--radius); border: 1px solid var(--line); background: var(--surface); color: var(--fg); resize: vertical; }
  .bar-acts { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
  .samples { font-size: .8rem; margin-left: auto; }
  .link-btn { background: none; border: 0; padding: 0; color: var(--accent); font: inherit; cursor: pointer; text-decoration: underline; }
  .res-box { border-radius: var(--radius); padding: 1.1rem; display: flex; flex-direction: column; gap: .6rem; border: 1px solid var(--line); }
  .res-box.bad { background: var(--bad-soft); border-color: var(--bad); }
  .res-box.ok { background: var(--accent-soft); border-color: var(--accent); }
  .res-head { display: flex; align-items: center; gap: .6rem; }
  .res-head h3 { margin: 0; font-size: 1.08rem; }
  .res-det { margin: 0; font-size: .88rem; }
  .res-sol { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: .75rem .85rem; font-size: .85rem; }
  .res-sol b { display: block; margin-bottom: .25rem; color: var(--fg); }
  .res-sol p { margin: 0; white-space: pre-line; color: var(--muted); }
  .info-card { border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); padding: 1rem; }
  .info-card h4 { margin: 0 0 .5rem; font-size: .92rem; }
  .info-card ul { margin: 0; padding-left: 1.2rem; display: grid; gap: .35rem; font-size: .85rem; color: var(--muted); }
  code, kbd { font: .82rem var(--mono); background: var(--bg-2); padding: .1rem .3rem; border-radius: 4px; border: 1px solid var(--line); }
</style>
