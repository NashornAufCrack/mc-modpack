<script lang="ts">
  import { pack, PT_T, CATS, PRESETS, normQ } from "../lib/pack.svelte";
  import { tick } from "svelte";
  import { ui } from "../lib/ui.svelte";
  import ModCard from "./ModCard.svelte";
  import Decision from "./Decision.svelte";
  import PackBar from "./PackBar.svelte";
  import PerfPack from "./PerfPack.svelte";
  import type { Mod } from "../lib/data";

  const XF = [
    ["sel", "Ausgewählt"],
    ["rec", "Empfohlen"],
    ["van", "Läuft auf Vanilla-Server"],
    ["vid", "Mit Video"],
    ["snd", "Mit Hörprobe"],
    ["sug", "Vom Assistenten"]
  ] as const;

  const TABNOTE: Record<string, string> = {
    m: "Mods verändern das Spiel selbst. Filtere nach Bereich oder suche direkt.",
    s: "Shader berechnen Licht, Schatten, Wasser und Himmel neu. Du kannst mehrere mitnehmen und im Spiel zwischen ihnen wechseln. Iris kommt automatisch mit.",
    r: "Resource Packs tauschen Texturen, 3D-Modelle und Sounds aus. Die Reihenfolge setzt die Website automatisch richtig.",
    d: "Datapacks ändern Welt-Generierung oder Spielregeln und wirken nur in neuen Welten.",
  };

  const items = $derived.by(() => {
    const q = normQ(ui.q.trim());
    const f = ui.filters;
    return pack.data.mods.filter(m =>
      (pack.data.files[m.slug] || m.cf) &&
      (m.pt || "m") === ui.tab &&
      (ui.tab !== "m" || !ui.sub || m.cat === ui.sub) &&
      (!ui.sub2 || m.sub === ui.sub2) &&
      (!!q || !pack.LOCKED.has(m.slug)) &&
      pack.matches(m.slug, q) &&
      (!f.has("sel") || pack.sel.has(m.slug)) &&
      (!f.has("rec") || m.rolle === "K") &&
      (!f.has("van") || (m.ampel !== "R" && m.cat !== "S")) &&
      (!f.has("vid") || pack.videos(m.slug).length > 0) &&
      (!f.has("snd") || pack.proben(m.slug).length > 0) &&
      (!f.has("sug") || pack.sug.has(m.slug))
    );
  });

  const itemSet = $derived(new Set(items.map(m => m.slug)));

  const subs = $derived.by(() => {
    const c: Record<string, number> = {};
    for (const m of pack.data.mods) {
      if (m.cat === ui.sub && (m.pt || "m") === "m" && (pack.data.files[m.slug] || m.cf) && !pack.LOCKED.has(m.slug)) {
        c[m.sub] = (c[m.sub] || 0) + 1;
      }
    }
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  });

  // Dynamische Anzahl der Einträge je Filter für den aktuellen Tab
  const filterCounts = $derived.by(() => {
    const list = pack.data.mods.filter(m =>
      (pack.data.files[m.slug] || m.cf) &&
      (m.pt || "m") === ui.tab &&
      (ui.tab !== "m" || !ui.sub || m.cat === ui.sub) &&
      (!ui.sub2 || m.sub === ui.sub2) &&
      !pack.LOCKED.has(m.slug)
    );
    return {
      sel: list.filter(m => pack.sel.has(m.slug)).length,
      rec: list.filter(m => m.rolle === "K").length,
      van: list.filter(m => m.ampel !== "R" && m.cat !== "S").length,
      vid: list.filter(m => pack.videos(m.slug).length > 0).length,
      snd: list.filter(m => pack.proben(m.slug).length > 0).length,
      sug: list.filter(m => pack.sug.has(m.slug)).length
    };
  });

  // Gruppen mit einem fest eingebauten Mitglied sind keine echte Wahl
  // Wenn gefiltert wird, nur Gruppen anzeigen, bei denen mindestens 2 Optionen den Filter erfüllen
  const isFiltered = $derived(ui.filters.size > 0 || !!ui.q.trim() || !!ui.sub2);
  const groups = $derived(pack.data.dec.gruppen.filter(g => {
    if (g.mods.some(s => pack.LOCKED.has(s))) return false;
    const matchCount = g.mods.filter(s => itemSet.has(s)).length;
    return isFiltered ? matchCount >= 2 : matchCount >= 1;
  }));

  const inG = $derived(new Set(groups.flatMap(g => g.mods.filter(s => (isFiltered ? itemSet.has(s) : true)))));

  const sections = $derived.by(() => {
    const out: { title: string; list: Mod[] }[] = [];
    const cats = ui.tab === "m" ? ["P", "V", "B", "G", "T", "S"] : [null];
    for (const c of cats) {
      const l = items.filter(m => !inG.has(m.slug) && (c === null || m.cat === c)).sort((a, b) => Number(b.rolle === "K") - Number(a.rolle === "K") || (b.downloadsK || 0) - (a.downloadsK || 0));
      const by: Record<string, Mod[]> = {};
      for (const m of l) (by[m.sub] ||= []).push(m);
      for (const [sb, list] of Object.entries(by)) out.push({ title: (c && !ui.sub ? CATS[c].t + " · " : "") + sb, list });
    }
    return out;
  });

  // Zähler je Tab einmal pro Auswahländerung berechnen
  const counts = $derived.by(() => {
    const c: Record<string, [number, number]> = { m: [0, 0], s: [0, 0], r: [0, 0], d: [0, 0] };
    for (const m of pack.data.mods) {
      if (!(pack.data.files[m.slug] || m.cf)) continue;
      const t = c[m.pt || "m"];
      if (!t) continue;
      t[1]++;
      if (pack.sel.has(m.slug)) t[0]++;
    }
    return c;
  });

  // Tabs: gleicher Tab nochmal geklickt = nach oben; anderer Tab = dessen letzte Scroll-Position wiederherstellen
  const tabMem: Record<string, { y: number; sub: string | null; sub2: string | null }> = {};
  let tabsEl: HTMLElement | null = $state(null);
  const listTop = () => {
    if (!tabsEl) return 0;
    const top = document.querySelector(".top") as HTMLElement | null;
    return Math.max(0, tabsEl.parentElement!.getBoundingClientRect().top + window.scrollY - (top?.offsetHeight || 0) - 8);
  };

  async function selectTab(k: string) {
    const lt = listTop();
    if (ui.tab === k) { window.scrollTo({ top: window.scrollY > lt + 4 ? lt : 0, behavior: "smooth" }); return; }
    tabMem[ui.tab] = { y: window.scrollY, sub: ui.sub, sub2: ui.sub2 };
    const m = tabMem[k];
    ui.tab = k as any; ui.sub = m?.sub ?? null; ui.sub2 = m?.sub2 ?? null;
    await tick();
    const y = m ? m.y : Math.min(window.scrollY, lt);
    window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
  }

  let search: HTMLInputElement | null = $state(null);
  function hotkey(e: KeyboardEvent) {
    const t = e.target as HTMLElement; const typing = t?.closest?.("input, textarea, select, [contenteditable]");
    if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey))) {
      if (document.querySelector("dialog[open]")) return;
      e.preventDefault(); search?.focus(); search?.select();
    }
  }

  const rr = $derived(pack.resolve());
  const nSel = $derived([...rr.mods].filter(s => !pack.LOCKED.has(s)).length);
  const nProb = $derived(pack.problems().length);
  function toPack() { const el = document.getElementById("pack"); el?.focus({ preventScroll: true }); el?.scrollIntoView({ block: "start" }); }
  function toggleF(k: string) { const n = new Set(ui.filters); n.has(k) ? n.delete(k) : n.add(k); ui.filters = n; }
  function resetFilters() { ui.filters = new Set(); ui.q = ""; ui.sub = null; ui.sub2 = null; }
</script>

<svelte:window onkeydown={hotkey} />

<section class="hero">
  <div class="intro">
    <h1>Stell dir dein Minecraft-Pack zusammen</h1>
    <p class="muted">Der Assistent fragt deinen PC ab und stellt Leistung und Grafik passend ein. Oder starte mit einer Vorlage und passe sie an.</p>
    <div class="row"><button class="btn primary" onclick={() => (ui.wizard = true)}>✦ Assistent starten</button></div>
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
    <div class="tabs" role="tablist" aria-label="Art" bind:this={tabsEl}>
      {#each Object.entries(PT_T) as [k, l]}
        {@const [s, n] = counts[k]}
        <button role="tab" aria-selected={ui.tab === k} class="tab" title={ui.tab === k ? "Nochmal klicken: nach oben" : ""} onclick={() => selectTab(k)}>{l}<span>{s}/{n}</span></button>
      {/each}
    </div>
    <div class="filters">
      <div class="search-row">
        <input class="field search" type="search" placeholder="Suchen: Name, Funktion, Tags (/ oder Strg+K) …" bind:this={search} bind:value={ui.q} aria-label="Suchen" aria-keyshortcuts="/ Control+K" />
        {#if ui.q || ui.filters.size || ui.sub || ui.sub2}
          <button class="btn sm ghost reset-btn" onclick={resetFilters}>✕ Filter zurücksetzen</button>
        {/if}
      </div>
      <div class="chips">
        {#if ui.tab === "m"}
          <button class="chip" aria-pressed={!ui.sub} onclick={() => { ui.sub = null; ui.sub2 = null; }}>Alle</button>
          {#each Object.entries(CATS) as [k, c]}<button class="chip" aria-pressed={ui.sub === k} onclick={() => { ui.sub = ui.sub === k ? null : k; ui.sub2 = null; }}>{c.t}</button>{/each}
          <span class="sep"></span>
        {/if}
        {#each XF as [k, l]}
          {@const cnt = filterCounts[k] ?? 0}
          {#if k !== "sug" || pack.sug.size}
            <button class="chip" class:sugchip={k === "sug"} aria-pressed={ui.filters.has(k)} onclick={() => toggleF(k)}>
              {l} <span class="fcount">({cnt})</span>
            </button>
          {/if}
        {/each}
      </div>
      {#if ui.tab === "m" && ui.sub && subs.length > 1}
        <div class="chips sub2" role="group" aria-label="Unterbereich">
          {#each subs as [sb, n]}
            <button class="chip sm" aria-pressed={ui.sub2 === sb} onclick={() => (ui.sub2 = ui.sub2 === sb ? null : sb)}>{sb} <span class="muted">{n}</span></button>
          {/each}
        </div>
      {/if}
      <p class="note muted">{ui.tab === "m" && ui.sub ? CATS[ui.sub].n : TABNOTE[ui.tab]}</p>
    </div>

    <!-- Festes Leistungspaket: wird ausgeblendet wenn aktiv gefiltert oder gesucht wird -->
    <div style:display={ui.tab === "m" && (!ui.sub || ui.sub === "P") && !ui.q && !ui.filters.size ? "" : "none"}>
      <PerfPack />
    </div>

    {#if groups.length}
      <h2 class="sec">Entscheidungen <span class="muted">· nur eins pro Gruppe</span></h2>
      <div class="dgrid">{#each groups as g (g.id)}<Decision {g} {itemSet} />{/each}</div>
    {/if}

    {#each sections as s, i (s.title)}
      <h2 class="sec">{s.title} <span class="muted">{s.list.length}</span></h2>
      <div class="grid">{#each s.list as m (m.slug)}<ModCard {m} />{/each}</div>
    {/each}

    {#if !items.length}<p class="empty muted">Nichts gefunden. Nimm einen Filter heraus oder ändere die Suche.</p>{/if}
  </div>
  <PackBar />
</div>
<div class="mobilebar" role="region" aria-label="Pack-Übersicht">
  <span><b>{nSel}</b> gewählt{#if nProb} · <b class="bad">{nProb} Konflikte</b>{/if}</span>
  <button class="btn primary sm" onclick={toPack}>Zum Pack &amp; Export ↓</button>
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
  .tabs { --tabs-h: 2.75rem; position: sticky; top: var(--top-h, 3.6rem); z-index: 12; height: var(--tabs-h); background: var(--bg); display: flex; gap: .35rem; border-bottom: 1px solid var(--line); overflow-x: auto; overflow-y: hidden; }
  .tab { display: flex; gap: .5rem; align-items: baseline; padding: .6rem .9rem; border: 0; border-bottom: 2px solid transparent; background: none; color: var(--muted); font: 600 .95rem var(--font); cursor: pointer; white-space: nowrap; }
  .tab span { font: 500 .72rem var(--mono); }
  .tab[aria-selected="true"] { color: var(--fg); border-bottom-color: var(--accent); }
  .filters { position: sticky; top: calc(var(--top-h, 3.6rem) + 2.75rem); z-index: 10; background: var(--bg); padding: .8rem 0 .4rem; display: grid; gap: .55rem; }
  .search-row { display: flex; gap: .5rem; align-items: center; }
  .search-row .search { flex: 1; }
  .reset-btn { border-color: var(--line-2); color: var(--muted); white-space: nowrap; }
  .reset-btn:hover { color: var(--fg); border-color: var(--accent); }
  .chips { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; }
  .fcount { font: 500 .72rem var(--mono); opacity: .8; margin-left: .15rem; }
  .sep { width: 1px; height: 1.4rem; background: var(--line); margin: 0 .2rem; }
  .note { margin: 0; font-size: .85rem; }
  .sec { font-size: .8rem; text-transform: uppercase; letter-spacing: .07em; font-weight: 650; margin: 1.6rem 0 .6rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(15.5rem, 1fr)); gap: .75rem; }
  .grid :global(.card) { content-visibility: auto; contain-intrinsic-size: auto none auto 290px; }
  .dgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(24rem, 1fr)); gap: .75rem; }
  .dgrid :global(.dec) { content-visibility: auto; contain-intrinsic-size: auto none auto 340px; }
  .empty { padding: 3rem 0; text-align: center; }
  .mobilebar { display: none; }
  @media (max-width: 1100px) { .layout { grid-template-columns: minmax(0, 1fr); } .hero { grid-template-columns: minmax(0, 1fr); }
    .mobilebar { display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; gap: .8rem; align-items: center; justify-content: space-between; padding: .6rem clamp(12px, 2.5vw, 28px) calc(.6rem + env(safe-area-inset-bottom)); background: color-mix(in srgb, var(--surface) 94%, transparent); backdrop-filter: blur(10px); border-top: 1px solid var(--line); font-size: .9rem; }
    .mobilebar .bad { color: var(--bad); }
    .layout { padding-bottom: 4rem; } }
  @media (max-width: 640px) { .filters { position: static; } }
  @media (max-width: 640px) { .presets { grid-template-columns: minmax(0, 1fr); } .dgrid { grid-template-columns: minmax(0, 1fr); } .grid { grid-template-columns: minmax(0, 1fr); } }
  .sugchip { border-color: var(--preset); }
  .sub2 { padding-left: .6rem; border-left: 2px solid var(--accent); } .chip.sm { font-size: .8rem; padding: .25rem .6rem; }
</style>