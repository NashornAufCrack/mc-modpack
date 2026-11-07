<script lang="ts">
  import type { Mod } from "../lib/data";
  import { pack } from "../lib/pack.svelte";
  import { ui } from "../lib/ui.svelte";
  let { m, compact = false }: { m: Mod; compact?: boolean } = $props();
  const on = $derived(pack.sel.has(m.slug));
  const lk = $derived(pack.LOCKED.has(m.slug));
  const imgs = $derived(pack.img(m.slug).slice(0, 3));
  const fromPreset = $derived(!!pack.preset && pack.preset.base.includes(m.slug));
  const vids = $derived(pack.videos(m.slug).length);
</script>

<article class="card" class:on class:lk class:compact>
  <button class="hit" aria-pressed={on} aria-label="{m.name}: {lk ? 'immer dabei, Details zeigen' : on ? 'im Pack, klicken zum Entfernen' : 'klicken zum Hinzufügen'}" onclick={() => (lk ? (ui.detail = m.slug) : ui.pick(m.slug))}></button>
  {#if !compact}
    <div class="thumbs">
      {#each imgs as u, i}<button class="zoom" onclick={() => (ui.lightbox = { slug: m.slug, i })} aria-label="Bild {i + 1} von {m.name} vergrößern"><img src={u} alt="" loading="lazy" decoding="async" onerror={(e) => (e.currentTarget as HTMLElement).parentElement?.remove()} /></button>{:else}<span class="ph">{m.name.slice(0, 1)}</span>{/each}
      {#if vids}<span class="vid" aria-hidden="true">▶ Video</span>{/if}
    </div>
  {/if}
  <div class="body">
    <h3>{m.name}</h3>
    <p>{m.notiz}</p>
    <div class="meta">
      {#if lk}<span class="badge ok">immer dabei</span>{:else if m.rolle === "K"}<span class="badge ok">empfohlen</span>{/if}
      {#if fromPreset}<span class="badge preset" title="Kommt aus der gewählten Vorlage">Vorlage</span>{:else if on && pack.preset && !lk}<span class="badge info" title="Von dir hinzugefügt">+ von dir</span>{/if}
      {#if (m as any).neu}<span class="badge info">neu</span>{/if}
      {#if m.cf}<span class="badge plain">CurseForge</span>{/if}
      {#if m.cf && !pack.data.files[m.slug]}<span class="badge warn">nur manuell</span>{/if}
      {#if m.ampel === "R"}<span class="badge bad">Server nötig</span>{/if}
      {#if pack.cost(m.slug) >= 5}<span class="badge warn">kostet FPS</span>{/if}
    </div>
  </div>
  <span class="check" aria-hidden="true">{on ? "✓" : "+"}</span>
  <button class="more" onclick={() => (ui.detail = m.slug)}>Details</button>
</article>

<style>
  .card { position: relative; display: flex; flex-direction: column; min-width: 0; border-radius: var(--radius); border: 1px solid var(--line); background: var(--surface); overflow: hidden; transition: border-color .15s, box-shadow .15s, transform .15s; content-visibility: auto; contain-intrinsic-size: auto 290px; }
  .card:hover { border-color: var(--line-2); transform: translateY(-1px); box-shadow: var(--shadow); }
  .card.on { border-color: var(--accent); box-shadow: inset 0 0 0 1.5px var(--accent); }
  .card.lk { cursor: default; }
  .thumbs { position: relative; display: flex; gap: 2px; height: 8.5rem; background: var(--bg-2); }
  .hit { position: absolute; inset: 0; z-index: 1; border: 0; background: none; cursor: pointer; border-radius: inherit; }
  .lk .hit { cursor: default; }
  .zoom { position: relative; z-index: 2; flex: 1 1 0; min-width: 0; height: 100%; padding: 0; border: 0; background: none; cursor: zoom-in; }
  .zoom img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .more, .check { z-index: 2; } .check { pointer-events: none; }
  .ph { margin: auto; font: 700 2.4rem var(--mono); color: var(--line-2); }
  .vid { position: absolute; left: .5rem; bottom: .5rem; padding: .1rem .45rem; border-radius: 6px; background: rgb(0 0 0 / .7); color: #fff; font: 600 .7rem var(--font); }
  .body { padding: .75rem .85rem 2.6rem; display: flex; flex-direction: column; gap: .3rem; }
  h3 { margin: 0; font-size: .98rem; font-weight: 650; line-height: 1.25; padding-right: 1.8rem; overflow-wrap: anywhere; }
  .compact h3 { padding-right: 2.2rem; }
  p { margin: 0; font-size: .84rem; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .meta { display: flex; flex-wrap: wrap; gap: .3rem; margin-top: .25rem; }
  .check { position: absolute; top: .55rem; right: .55rem; width: 1.8rem; height: 1.8rem; display: grid; place-items: center; border-radius: 50%; background: var(--surface); border: 1px solid var(--line-2); font-weight: 700; color: var(--muted); }
  .compact .check { top: .65rem; }
  .on .check { background: var(--accent); border-color: var(--accent); color: var(--accent-fg); }
  .more { position: absolute; right: .55rem; bottom: .55rem; border: 1px solid var(--line); background: var(--surface-2); color: var(--fg); border-radius: 8px; padding: .2rem .65rem; font: 500 .8rem var(--font); cursor: pointer; }
  .more:hover { border-color: var(--accent); color: var(--accent); }
</style>
