<script lang="ts">
  import { pack } from "../lib/pack.svelte";
  import { ui } from "../lib/ui.svelte";
  import { KIT, TESTSEED } from "../lib/export";
  import { parseFps, prompt, type Fps } from "../lib/ai";
  let fps = $state<Fps | null>(null); let msg = $state(""); let link = $state(""); let note = $state(""); let txt = $state("");
  let hist = $state<any[]>([]);
  try { hist = JSON.parse(localStorage.getItem("mk-tests") || "[]"); } catch {}
  async function file(e: Event) { const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (!f) return; fps = parseFps(await f.text()); msg = fps ? "" : "Diese Datei kenne ich nicht. Bitte die fps.csv aus dem Test-Kit nehmen."; }
  function save() {
    if (!fps) { msg = "Bitte zuerst die fps.csv hochladen."; return; }
    if (link && !/^https:\/\/spark\.lucko\.me\//.test(link)) { msg = "Der spark-Link beginnt mit https://spark.lucko.me/"; return; }
    hist = [{ at: new Date().toISOString(), link, note, n: pack.resolve().mods.size, ...fps }, ...hist].slice(0, 20);
    try { localStorage.setItem("mk-tests", JSON.stringify(hist)); } catch {} msg = "Gespeichert.";
  }
  function gen() { txt = prompt(fps || hist[0] || null, link, note); navigator.clipboard?.writeText(txt).then(() => ui.say("Text kopiert – in den Chat oder deine KI einfügen")); }
  const STEPS = [
    ["Test-Kit laden", "Benchmark-Datapack, FPS-Messung.bat und Anleitung in einer ZIP. Beim Export ist spark automatisch dabei, wenn du testen willst."],
    ["Einmal starten", "Pack importieren und Minecraft einmal bis ins Hauptmenü starten."],
    ["Testwelt", `Neue Welt mit Seed ${TESTSEED}, Kreativ, Cheats an. Unter „Datenpakete“ die Benchmark-Datapack.zip hineinziehen. Nach dem Erstellen 1–2 Minuten warten.`],
    ["Messen", "FPS-Messung.bat starten (Admin bestätigen). Im Spiel /function bench:start und /sparkc profiler start --timeout 180 eingeben, dann in der .bat eine Taste drücken."],
    ["Hochladen", "Nach 3 Minuten fps.csv hier hochladen und den spark-Link aus dem Chat einfügen."],
  ];
</script>

<section class="wrap">
  <h1>Pack testen</h1>
  <p class="muted lead">Ein Datapack fliegt dich 3 Minuten lang über dieselbe Strecke (Tag, Nacht, Regen), ein kleines Windows-Programm misst jedes Bild. Du lädst nur die Messdatei hoch, den Rest rechnet die Seite.</p>
  <ol class="steps">{#each STEPS as [t, d], i}<li><span class="n">{i + 1}</span><div><b>{t}</b><p class="muted">{d}</p>{#if i === 0}<a class="btn" href={KIT}>Test-Kit herunterladen</a>{/if}</div></li>{/each}</ol>
  <div class="card-surface box">
    <label class="btn primary file">fps.csv wählen<input type="file" accept=".csv,text/csv" onchange={file} /></label>
    {#if fps}<div class="res"><div><b>{fps.avg}</b><span>FPS Ø</span></div><div><b>{fps.low1}</b><span>1 %-Tief</span></div><div><b>{fps.low01}</b><span>0,1 %-Tief</span></div><div><b>{fps.stutter}</b><span>Ruckler</span></div></div>{/if}
    <label>spark-Link<input class="field" bind:value={link} placeholder="https://spark.lucko.me/…" /></label>
    <label>Was ist dir aufgefallen?<textarea class="field" rows="3" bind:value={note}></textarea></label>
    <div class="row"><button class="btn" onclick={save}>Ergebnis speichern</button><button class="btn" onclick={gen}>Text für die KI erzeugen</button><button class="btn" onclick={() => (ui.tool = "ai")}>KI-Antwort einfügen</button></div>
    {#if msg}<p role="status">{msg}</p>{/if}
    {#if txt}<textarea class="field mono" rows="8" readonly value={txt}></textarea>{/if}
  </div>
  {#if hist.length}<h2>Bisherige Tests</h2><table><thead><tr><th>Datum</th><th>Ø FPS</th><th>1 %-Tief</th><th>Mods</th><th></th></tr></thead><tbody>{#each hist as t}<tr><td>{new Date(t.at).toLocaleDateString("de-DE")}</td><td>{t.avg}</td><td>{t.low1}</td><td>{t.n}</td><td>{#if t.link}<a href={t.link} target="_blank" rel="noopener">spark</a>{/if}</td></tr>{/each}</tbody></table>{/if}
</section>

<style>
  .wrap { max-width: 880px; padding: 1.8rem 0; } h1 { margin: 0 0 .4rem; } .lead { margin: 0 0 1.4rem; }
  .steps { list-style: none; padding: 0; display: grid; gap: .8rem; }
  .steps li { display: grid; grid-template-columns: 2.2rem 1fr; gap: .8rem; } .n { width: 2.2rem; height: 2.2rem; border-radius: 50%; display: grid; place-items: center; background: var(--accent-soft); color: var(--ok); font-weight: 700; }
  .steps p { margin: .1rem 0 .4rem; }
  .box { padding: 1.1rem; display: grid; gap: .8rem; margin: 1.4rem 0; } .box label { display: grid; gap: .3rem; font-size: .85rem; color: var(--muted); }
  .file { justify-self: start; } .file input { display: none; }
  .res { display: grid; grid-template-columns: repeat(4, 1fr); text-align: center; } .res b { display: block; font: 600 1.6rem var(--mono); } .res span { font-size: .78rem; color: var(--muted); }
  .row { display: flex; gap: .5rem; flex-wrap: wrap; } .mono { font: .8rem var(--mono); }
  table { width: 100%; border-collapse: collapse; } th, td { text-align: left; padding: .4rem; border-bottom: 1px solid var(--line); }
</style>
