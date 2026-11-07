<script lang="ts">
  import { pack, PT_T, CATS, PRESETS } from "../lib/pack.svelte";
  import { ui } from "../lib/ui.svelte";
  import ModCard from "./ModCard.svelte";
  import Decision from "./Decision.svelte";
  import PackBar from "./PackBar.svelte";
  import type { Mod } from "../lib/data";

  const XF = [["sel", "Ausgewählt"], ["rec", "Empfohlen"], ["van", "Läuft auf Vanilla-Server"], ["sug", "Vom Assistenten"]] as const;
  const TABNOTE: Record<string, string> = {
    m: "Mods verändern das Spiel selbst. Filtere nach Bereich oder suche direkt.",
    s: "Shader berechnen Licht, Schatten, Wasser und Himmel neu. Es ist immer nur einer aktiv, Iris kommt automatisch mit.",
    r: "Resource Packs tauschen Texturen, 3D-Modelle und Sounds aus. Die Reihenfolge setzt die Website automatisch richtig.",
    d: "Datapacks ändern Welt-Generierung oder Spielregeln und wirken nur in neuen Welten.",
  };
  const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  const items = $derived.by(() => {
    const q = norm(ui.q.trim()); const f = ui.filters;
    return pack.data.mods.filter(m => (pack.data.files[m.slug] || m.cf) && (m.pt || "m") === ui.tab && (ui.tab !== "m" || !ui.sub || m.cat === ui.sub)
      && (!q || norm(m.name + " " + m.sub + " " + m.notiz + " " + m.slug).includes(q))
      && (!f.has("sel") || pack.sel.has(m.slug)) && (!f.has("rec") || m.rolle === "K") && (!f.has("van") || (m.ampel !== "R" && m.cat !== "S")) && (!f.has("sug") || pack.sug.has(m.slug)));
  });
  const groups = $derived(pack.data.dec.gruppen.filter(g => g.mods.some(s => items.some(m => m.slug === s))));
  const sections = $derived.by(() => {
    const inG = new Set(groups.flatMap(g => g.mods)); const out: { title: string; list: Mod[] }[] = [];
    const cats = ui.tab === "m" ? ["P", "V", "G", "T", "S"] : [null];
    for (const c of cats) {
      const l = items.filter(m => !inG.has(m.slug) && (c === null || m.cat === c)).sort((a, b) => Number(b.rolle === "K") - Number(a.rolle === "K") || (b.downloadsK || 0) - (a.downloadsK || 0));
      const by: Record<string, Mod[]> = {}; for (const m of l) (by[m.sub] ||= []).push(m);
      for (const [sb, list] of Object.entries(by)) out.push({ title: (c && !ui.sub ? CATS[c].t + " · " : "") + sb, list });
    }
    return out;
  });
  const count = (t: string) => { const all = pack.data.mods.filter(m => (m.pt || "m") === t && (pack.data.files[m.slug] || m.cf)); return [all.filter(m => pack.sel.has(m.slug)).length, all.length]; };
  function toggleF(k: string) { const n = new Set(ui.filters); n.has(k) ? n.delete(k) : n.add(k); ui.filters = n; }
</script>

<section class="hero">
  <div class="intro">
    <h1>Stell dir dein Minecraft-Pack zusammen</h1>
    <p class="muted">Der Assistent fragt deinen PC ab und stellt Leistung und Grafik passend ein. Oder starte mit einer Vorlage und passe sie an.</p>
    <div class="row"><button class="btn primary" onclick={() => (ui.wizard = true)}>✦ Assistent starten</button>
</div>
  </div>
  <div class="presets" role="group" aria-label="Vorlagen">
    {#each PRESETS as p}
      {@const on = pack.preset?.id === p.id}
      <button class="preset" class:on aria-pressed={on} onclick={() => { pack.applyPreset(p.id); ui.say(`Vorlage „${p.name}“ geladen`, true); }}>
        <span class="pname">{p.name}{#if on}<span class="badge preset">aktiv</span>{/if}</span>
        <span class="ptext">{p.text}</span>
      </button>
    {/each}
  </div>
</section>

<div class="layout">
  <div class="main">
    <div class="tabs" role="tablist" aria-label="Art">
      {#each Object.entries(PT_T) as [k, l]}
        {@const [s, n] = count(k)}
        <button role="tab" aria-selected={ui.tab === k} class="tab" onclick={() => { ui.tab = k as any; ui.sub = null; }}>{l}<span>{s}/{n}</span></button>
      {/each}
    </div>
    <div class="filters">
      <input class="field search" type="search" placeholder="Suchen: Name, Funktion …" bind:value={ui.q} aria-label="Suchen" />
      <div class="chips">
        {#if ui.tab === "m"}
          <button class="chip" aria-pressed={!ui.sub} onclick={() => (ui.sub = null)}>Alle</button>
          {#each Object.entries(CATS) as [k, c]}<button class="chip" aria-pressed={ui.sub === k} onclick={() => (ui.sub = ui.sub === k ? null : k)}>{c.t}</button>{/each}
          <span class="sep"></span>
        {/if}
        {#each XF as [k, l]}{#if k !== "sug" || pack.sug.size}<button class="chip" aria-pressed={ui.filters.has(k)} onclick={() => toggleF(k)}>{l}</button>{/if}{/each}
      </div>
      <p class="note muted">{ui.tab === "m" && ui.sub ? CATS[ui.sub].n : TABNOTE[ui.tab]}</p>
    </div>

    {#if groups.length}
      <h2 class="sec">Entscheidungen <span class="muted">· nur eins pro Gruppe</span></h2>
      <div class="dgrid">{#each groups as g (g.id)}<Decision {g} />{/each}</div>
    {/if}
    {#each sections as s (s.title)}
      <h2 class="sec">{s.title} <span class="muted">{s.list.length}</span></h2>
      <div class="grid">{#each s.list as m (m.slug)}<ModCard {m} />{/each}</div>
    {/each}
    {#if !items.length}<p class="empty muted">Nichts gefunden. Nimm einen Filter heraus oder ändere die Suche.</p>{/if}
  </div>
  <PackBar />
</div>

<style>
  .hero { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.4fr); gap: 1.5rem; align-items: end; padding: 1.75rem 0 1.25rem; }
  h1 { font-size: clamp(1.5rem, 2.6vw, 2.15rem); line-height: 1.15; margin: 0 0 .4rem; letter-spacing: -.02em; text-wrap: balance; }
  .intro p { margin: 0 0 1rem; max-width: 52ch; }
  .row { display: flex; gap: .5rem; flex-wrap: wrap; }
  .presets { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .6rem; }
  .preset { text-align: left; display: flex; flex-direction: column; gap: .25rem; padding: .85rem .95rem; border-radius: var(--radius); border: 1px solid var(--line); background: var(--surface); color: var(--fg); font: inherit; cursor: pointer; transition: border-color .15s, background .15s; }
  .preset:hover { border-color: var(--preset); }
  .preset.on { border-color: var(--preset); background: var(--preset-soft); box-shadow: inset 0 0 0 1px var(--preset); }
  .pname { font-weight: 650; display: flex; gap: .4rem; align-items: center; }
  .ptext { font-size: .82rem; color: var(--muted); }
  .layout { display: grid; grid-template-columns: minmax(0, 1fr) 21rem; gap: 1.5rem; align-items: start; }
  .tabs { display: flex; gap: .35rem; border-bottom: 1px solid var(--line); overflow-x: auto; }
  .tab { display: flex; gap: .5rem; align-items: baseline; padding: .6rem .9rem; border: 0; border-bottom: 2px solid transparent; background: none; color: var(--muted); font: 600 .95rem var(--font); cursor: pointer; white-space: nowrap; }
  .tab span { font: 500 .72rem var(--mono); }
  .tab[aria-selected="true"] { color: var(--fg); border-bottom-color: var(--accent); }
  .filters { position: sticky; top: 3.6rem; z-index: 10; background: var(--bg); padding: .8rem 0 .4rem; display: grid; gap: .55rem; }
  .chips { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; }
  .sep { width: 1px; height: 1.4rem; background: var(--line); margin: 0 .2rem; }
  .note { margin: 0; font-size: .85rem; }
  .sec { font-size: .8rem; text-transform: uppercase; letter-spacing: .07em; font-weight: 650; margin: 1.6rem 0 .6rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(15.5rem, 1fr)); gap: .75rem; }
  .dgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(24rem, 1fr)); gap: .75rem; }
  .empty { padding: 3rem 0; text-align: center; }
  @media (max-width: 1100px) { .layout { grid-template-columns: minmax(0, 1fr); } .hero { grid-template-columns: minmax(0, 1fr); } }
  @media (max-width: 640px) { .presets { grid-template-columns: minmax(0, 1fr); } .dgrid { grid-template-columns: minmax(0, 1fr); } .grid { grid-template-columns: minmax(0, 1fr); } }
</style>
