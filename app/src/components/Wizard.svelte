<script lang="ts">
  import Modal from "./Modal.svelte";
  import { pack } from "../lib/pack.svelte";
  import { ui } from "../lib/ui.svelte";
  import { plan, applyPlan, shaderChoices } from "../lib/wizard";
  import { conflicts } from "../lib/keys";
  let open = $state(false);
  $effect(() => { open = ui.wizard; });
  let w: Record<string, any> = $state({});
  let step = $state(0);
  $effect(() => { if (ui.wizard) { w = { w: 2560, h: 1440, hz: 144, ...pack.wiz }; step = 0; } });
  type Q = { k: string; t: string; ex: string; img?: string; o?: [string, string, string?][] };
  const Qs: Q[] = [
    { k: "srv", t: "Wo spielst du?", ex: "Auf einem normalen Server dürfen nur Mods laufen, die allein auf deinem PC arbeiten. Gameplay- und Welt-Mods bräuchten die Mod auch auf dem Server.", o: [["vanilla", "Auf dem Vanilla-Server von Freunden", "Nur Optik, Sound und Komfort"], ["own", "Einzelspieler oder eigener Server", "Alles möglich, auch Gameplay und Welt"]] },
    { k: "vendor", t: "Welche Grafikkarte hast du?", ex: "Einige Leistungs-Mods laufen nur auf bestimmten Karten. Nvidium macht NVIDIA-Karten deutlich schneller.", o: [["nvidia", "NVIDIA (GeForce RTX/GTX)"], ["amd", "AMD (Radeon)"], ["intel", "Intel oder Laptop-Grafik"]] },
    { k: "gpu", t: "Wie stark ist sie?", ex: "Bestimmt Shader, Schattenqualität und Fernsicht. Im Zweifel eine Stufe niedriger wählen.", o: [["low", "Einsteiger", "GTX 1060, RX 580, Laptop"], ["mid", "Mittelklasse", "RTX 3060/4060, RX 6600–7600"], ["high", "Oberklasse", "RTX 3080/4070 Ti, RX 6800+"], ["top", "High-End", "RTX 4080/5080+, RX 7900+"]] },
    { k: "ram", t: "Wie viel Arbeitsspeicher hat dein PC?", ex: "Minecraft bekommt davon höchstens die Hälfte, damit Windows, Browser und Discord flüssig bleiben. Zu finden unter Windows › Einstellungen › System › Info.", o: [["8", "8 GB"], ["16", "16 GB"], ["32", "32 GB"], ["64", "64 GB oder mehr"]] },
    { k: "mon", t: "Dein Monitor", ex: "Auflösung und Bildwiederholrate bestimmen, wie viel die Grafikkarte leisten muss und wo das FPS-Limit liegt." },
    { k: "fps", t: "Was ist dir wichtiger?", ex: "Mehr FPS fühlen sich flüssiger an. Weniger FPS erlauben schönere Grafik.", o: [["hz", "Flüssig", "So viele FPS, wie der Monitor zeigen kann"], ["60", "Schön", "Stabile 60 FPS reichen, dafür mehr Grafik"]] },
    { k: "shader", t: "Shader verwenden?", ex: "Shader berechnen Licht, Schatten, Wasser und Himmel neu. Das sieht viel schöner aus, kostet aber am meisten Leistung.", img: "photon-shader", o: [["yes", "Ja, Shader"], ["no", "Nein, lieber mehr FPS"]] },
    { k: "lod", t: "Fernsicht?", ex: "Voxy zeigt Berge und Landschaft weit hinter der normalen Sichtweite als vereinfachtes Modell. Braucht etwas Grafikspeicher.", img: "voxy", o: [["voxy", "Ja, weite Fernsicht"], ["none", "Nein"]] },
    { k: "anim", t: "Animierte Hände und Items?", ex: "Punchy animiert deine Hände in der Ego-Sicht: Schwerter schwingen, Essen wird zum Mund geführt, Tränke getrunken.", img: "punchy-fpa", o: [["punchy", "Ja, mit Punchy"], ["none", "Nein, wie Vanilla"]] },
    { k: "feel", t: "Wie nah an Vanilla?", ex: "Bestimmt, wie viele Vorschläge über Optik hinausgehen.", o: [["pure", "Fast wie Vanilla, nur schöner"], ["plus", "Vanilla+ mit Komfort"], ["more", "Gern auch neue Inhalte"]] },
  ];
  const N = Qs.length;
  const q = $derived(Qs[step]);
  const answered = $derived(step >= N || (q.k === "mon" ? Number(w.w) > 0 && Number(w.h) > 0 && Number(w.hz) > 0 && !!w.sync : !!w[q.k] && (q.k !== "shader" || w.shader === "no" || !!w.shaderpack)));
  const preview = $derived(step >= N ? plan(w) : null);
  const kc = $derived(conflicts().length);
  function choose(k: string, v: string) { w[k] = v; if (k === "shader" && v === "yes" && !w.shaderpack) w.shaderpack = shaderChoices(w)[0][0]; }
  function finish() { const p = applyPlan(w); ui.wizard = false; ui.filters = new Set(["sug"]); ui.say(`Fertig: ${p.add.length} Vorschläge übernommen, FPS-Limit ${p.fps}`, true); }
</script>

<Modal bind:open title="Assistent" width="720px" onclose={() => (ui.wizard = false)}>
  <div class="prog" aria-label="Fortschritt"><span style="width:{(Math.min(step, N) / N) * 100}%"></span></div>
  <p class="stepno muted">{step < N ? `Schritt ${step + 1} von ${N}` : "Vorschau"}</p>
  {#if step < N}
    <h3>{q.t}</h3>
    <p class="ex muted">{q.ex}</p>
    {#if q.img}{@const im = pack.img(q.img)[0]}{#if im}<img class="exi" src={im} alt="" />{/if}{/if}
    {#if q.k === "mon"}
      <div class="mon">
        <label>Breite (Pixel)<input class="field" inputmode="numeric" bind:value={w.w} /></label>
        <label>Höhe (Pixel)<input class="field" inputmode="numeric" bind:value={w.h} /></label>
        <label>Hz<input class="field" inputmode="numeric" bind:value={w.hz} /></label>
      </div>
      <p class="small muted">Typisch: 1920×1080, 2560×1440, 3440×1440, 3840×2160 · 60, 144, 165, 240 Hz</p>
      <div class="opts">{#each [["yes", "G-Sync / FreeSync vorhanden"], ["no", "Kein G-Sync / weiß nicht"]] as [v, l]}<button class="opt" aria-pressed={w.sync === v} onclick={() => (w.sync = v)}><b>{l}</b></button>{/each}</div>
    {:else}
      <div class="opts" role="radiogroup" aria-label={q.t}>
        {#each q.o! as [v, l, d]}<button class="opt" role="radio" aria-checked={w[q.k] === v} onclick={() => choose(q.k, v)}><b>{l}</b>{#if d}<span class="muted">{d}</span>{/if}</button>{/each}
      </div>
      {#if q.k === "shader" && w.shader === "yes"}
        <h4>Welcher Shader? <span class="muted">passend zu deinem PC sortiert</span></h4>
        <div class="opts">
          {#each shaderChoices(w) as [s, n, t], i}<button class="opt" aria-pressed={w.shaderpack === s} onclick={() => (w.shaderpack = s)}><b>{n} {#if i === 0}<span class="badge ok">empfohlen</span>{/if}</b><span class="muted">{t}</span></button>{/each}
        </div>
      {/if}
    {/if}
  {:else if preview}
    <h3>Das würde der Assistent einstellen</h3>
    <ul class="sum">
      <li><b>{preview.add.length}</b> Mods und Packs werden ausgewählt (Leistung & Pflicht-Mods sind immer dabei)</li>
      <li>FPS-Limit <b>{preview.fps}</b>, Sichtweite <b>{preview.rd}</b> Chunks, Arbeitsspeicher ca. <b>{Math.min(pack.ramGB(), preview.ram)} GB</b></li>
      {#if w.shader === "yes"}<li>Shader: <b>{pack.name(w.shaderpack)}</b>, Schatten {preview.P.sm} px</li>{/if}
      {#if w.lod !== "none"}<li>Fernsicht Voxy: <b>{preview.P.vx * 32}</b> Chunks</li>{/if}
      {#if kc}<li>{kc} doppelt belegte Tasten von Mods bekommen eine freie Taste (Vanilla-Tasten bleiben)</li>{/if}
      <li>Deine bisherige Auswahl wird ersetzt (Rückgängig ist möglich).</li>
    </ul>
    <details><summary>Alle {preview.add.length} Vorschläge ansehen</summary><ul class="list">{#each preview.add as s}<li>{pack.name(s)} <span class="muted">– {preview.why[s]}</span></li>{/each}</ul></details>
  {/if}
  {#snippet foot()}
    {#if step > 0}<button class="btn ghost" onclick={() => step--}>Zurück</button>{/if}
    <span style="flex:1"></span>
    {#if step < N}<button class="btn primary" disabled={!answered} onclick={() => step++}>{step === N - 1 ? "Vorschau" : "Weiter"}</button>
    {:else}<button class="btn primary" onclick={finish}>Übernehmen</button>{/if}
  {/snippet}
</Modal>

<style>
  .prog { height: 4px; border-radius: 4px; background: var(--bg-2); overflow: hidden; } .prog span { display: block; height: 100%; background: var(--accent); transition: width .25s; }
  .stepno { font-size: .78rem; margin: .5rem 0 0; }
  h3 { margin: .2rem 0 .3rem; font-size: 1.3rem; } h4 { margin: 1rem 0 .4rem; font-size: .95rem; }
  .ex { margin: 0 0 .9rem; } .exi { width: 100%; max-height: 13rem; object-fit: cover; border-radius: 12px; margin-bottom: .9rem; }
  .opts { display: grid; gap: .5rem; }
  .opt { display: flex; flex-direction: column; gap: .15rem; text-align: left; padding: .75rem .9rem; border-radius: 12px; border: 1px solid var(--line-2); background: var(--surface); color: var(--fg); font: inherit; cursor: pointer; }
  .opt:hover { border-color: var(--accent); }
  .opt[aria-pressed="true"], .opt[aria-checked="true"] { border-color: var(--accent); background: var(--accent-soft); box-shadow: inset 0 0 0 1px var(--accent); }
  .opt b { display: flex; gap: .4rem; align-items: center; font-weight: 600; } .opt span { font-size: .84rem; }
  .mon { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .6rem; margin-bottom: .3rem; } .mon label { display: grid; gap: .25rem; font-size: .82rem; color: var(--muted); }
  .small { font-size: .8rem; margin: 0 0 .8rem; }
  .sum { padding-left: 1.1rem; display: grid; gap: .3rem; } .list { font-size: .85rem; max-height: 14rem; overflow: auto; }
  @media (max-width: 540px) { .mon { grid-template-columns: minmax(0, 1fr); } }
</style>
