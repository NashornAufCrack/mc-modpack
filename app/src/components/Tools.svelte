<script lang="ts">
  import Modal from "./Modal.svelte";
  import { pack } from "../lib/pack.svelte";
  import { ui } from "../lib/ui.svelte";
  import { rpTopDown } from "../lib/rp";
  import { aiParse, aiApply } from "../lib/ai";
  let open = $state(false);
  $effect(() => { open = !!ui.tool; });
  const T: Record<string, string> = { rp: "Resource-Pack-Reihenfolge", base: "Grundeinstellungen", ai: "KI-Antwort übernehmen" };
  const rps = $derived([...pack.resolve().mods].filter(s => pack.BY[s].pt === "r"));
  const order = $derived(rpTopDown(rps));
  function move(i: number, d: number) { const o = [...order]; const j = i + d; if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; pack.cfg = { ...pack.cfg, _rpord: o }; pack.save(); }
  function auto() { const c = { ...pack.cfg }; delete c._rpord; pack.cfg = c; pack.save(); }
  let raw = $state(""); const plan = $derived(raw ? aiParse(raw) : null);
</script>

<Modal bind:open title={ui.tool ? T[ui.tool] : ""} width="760px" onclose={() => (ui.tool = null)}>
  {#if ui.tool === "rp"}
    <p class="muted">Oben gewinnt: Ändern zwei Packs dieselbe Datei, zählt das obere. Die Website sortiert nach den Regeln der Pack-Autoren (Erweiterungen über ihrem Basis-Pack, Komplett-Texturen ganz unten). Die Reihenfolge landet beim Export direkt in der options.txt.</p>
    {#if order.length}
      <ol class="rpo">{#each order as s, i (s)}<li><span class="im">{#if pack.img(s)[0]}<img referrerpolicy="no-referrer" src={pack.img(s)[0]} alt="" />{/if}</span><span class="nm">{pack.name(s)}</span><button class="btn sm" disabled={!i} onclick={() => move(i, -1)} aria-label="nach oben">↑</button><button class="btn sm" disabled={i === order.length - 1} onclick={() => move(i, 1)} aria-label="nach unten">↓</button></li>{/each}</ol>
      {#if pack.cfg._rpord}<button class="btn" onclick={auto}>Wieder automatisch sortieren</button>{/if}
    {:else}<p class="muted">Noch keine Resource Packs gewählt.</p>{/if}
  {:else if ui.tool === "ai"}
    <p class="muted">Füge die Antwort deiner KI ein. Die Website sucht den JSON-Block selbst heraus und zeigt vorher, was sich ändert.</p>
    <textarea class="field" rows="8" bind:value={raw} placeholder={'{"aktionen":[…]}'}></textarea>
    {#if plan}
      {#if plan.err}<p class="bad">{plan.err}</p>{:else}
        <ul class="ai">{#each plan.ok as a}<li><span class="badge {a.typ === 'entfernen' ? 'bad' : a.typ === 'hinzufuegen' ? 'ok' : 'info'}">{a.typ}</span> {a.slug === "_base" ? "Grundeinstellung" : pack.name(a.slug)}{#if a.key} · {a.key} = {String(a.wert)}{/if} <span class="muted">{a.grund || ""}</span></li>{/each}</ul>
        {#if plan.bad}<p class="muted">{plan.bad} Vorschläge ignoriert (unbekannter Mod oder Schlüssel).</p>{/if}
        <button class="btn primary" disabled={!plan.ok.length} onclick={() => { aiApply(plan.ok); ui.tool = null; ui.say(`${plan.ok.length} Änderungen übernommen`, true); }}>{plan.ok.length} Änderungen übernehmen</button>
      {/if}
    {/if}
  {/if}
</Modal>

<style>
  .rpo { padding-left: 1.4rem; display: grid; gap: .35rem; }
  .rpo li { display: grid; grid-template-columns: 3rem minmax(0, 1fr) auto auto; gap: .5rem; align-items: center; }
  .im { height: 2rem; border-radius: 5px; overflow: hidden; background: var(--bg-2); } .im img { width: 100%; height: 100%; object-fit: cover; }
  .ai { padding-left: 1rem; display: grid; gap: .3rem; font-size: .88rem; } .bad { color: var(--bad); }
  textarea.field { font: .85rem var(--mono); }
</style>
