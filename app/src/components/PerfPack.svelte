<script lang="ts">
  import { pack } from "../lib/pack.svelte";
  import { ui } from "../lib/ui.svelte";
  let open = $state(false);
  const list = $derived(pack.data.mods.filter(m => pack.LOCKED.has(m.slug)).sort((a, b) => Number(b.sub === "Performance") - Number(a.sub === "Performance") || (b.downloadsK || 0) - (a.downloadsK || 0)));
  const perf = $derived(list.filter(m => m.sub === "Performance"));
  const base = $derived(list.filter(m => m.sub !== "Performance"));
  const icon = (s: string) => pack.img(s)[0];
</script>

<section class="pp" aria-labelledby="pp-h">
  <div class="head">
    <div>
      <span class="badge ok">immer dabei</span>
      <h2 id="pp-h">Leistungspaket</h2>
      <p class="muted">{perf.length} Leistungs-Mods und {base.length} Grundbausteine stecken automatisch in jedem Pack. Sie machen Minecraft schneller und stabiler, ohne das Aussehen zu ändern. Du wählst nur Optik, Gameplay, Welt, Shader und Resource Packs.</p>
    </div>
    <button class="btn" aria-expanded={open} onclick={() => (open = !open)}>{open ? "Weniger" : "Alle ansehen"}</button>
  </div>
  <ul class="row" aria-label="Wichtigste Leistungs-Mods">
    {#each perf.slice(0, 8) as m (m.slug)}<li><button class="pill" onclick={() => (ui.detail = m.slug)}>{#if icon(m.slug)}<img src={icon(m.slug)} alt="" loading="lazy" />{/if}{m.name}</button></li>{/each}
    {#if perf.length > 8}<li class="more muted">+{perf.length - 8}</li>{/if}
  </ul>
  {#if open}
    <div class="all">
      {#each [["Leistung", perf], ["Grundbausteine (Absturzschutz, Menüs, Bibliotheken)", base]] as [t, l]}
        <h3>{t}</h3>
        <ul class="cols">{#each l as m (m.slug)}<li><button class="lnk" onclick={() => (ui.detail = m.slug)}>{m.name}</button><span class="muted">&nbsp;– {m.notiz}</span></li>{/each}</ul>
      {/each}
      <p class="small muted">Nvidium wirkt nur auf NVIDIA-Karten und schaltet sich bei aktiven Shadern selbst ab. Nicht automatisch dabei, weil nachweislich mit Nebenwirkungen: Krypton (Verbindungsprobleme im Client), Moonrise (nicht mit C2ME), Alternate Current (ändert Redstone). Sie bleiben unten wählbar.</p>
    </div>
  {/if}
</section>

<style>
  .pp { border: 1px solid var(--line); border-radius: var(--radius); background: linear-gradient(135deg, var(--accent-soft), transparent 60%), var(--surface); padding: 1rem 1.1rem; margin-top: 1rem; }
  .head { display: flex; gap: 1rem; justify-content: space-between; align-items: flex-start; }
  h2 { margin: .35rem 0 .2rem; font-size: 1.15rem; } .head p { margin: 0; font-size: .88rem; max-width: 70ch; }
  .row { list-style: none; padding: 0; margin: .8rem 0 0; display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; }
  .pill { display: flex; gap: .4rem; align-items: center; padding: .3rem .6rem .3rem .3rem; border-radius: 99px; border: 1px solid var(--line-2); background: var(--bg-2); color: var(--fg); font: 500 .8rem var(--font); cursor: pointer; }
  .pill:hover { border-color: var(--accent); } .pill img { width: 1.4rem; height: 1.4rem; border-radius: 50%; object-fit: cover; }
  .more { font-size: .8rem; }
  .all h3 { font-size: .8rem; text-transform: uppercase; letter-spacing: .06em; margin: 1rem 0 .4rem; }
  .cols { columns: 2 22rem; column-gap: 1.5rem; padding: 0; list-style: none; margin: 0; font-size: .84rem; } .cols li { break-inside: avoid; margin-bottom: .3rem; }
  .lnk { background: none; border: 0; padding: 0; color: var(--fg); font: 600 .84rem var(--font); cursor: pointer; text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }
  .lnk:hover { text-decoration-color: var(--accent); }
  .small { font-size: .8rem; margin: .8rem 0 0; }
  @media (max-width: 640px) { .head { flex-direction: column; } }
</style>
