<script lang="ts">
  import Modal from "./Modal.svelte";
  import { pack } from "../lib/pack.svelte";
  import { ui } from "../lib/ui.svelte";
  let open = $state(false);
  $effect(() => { open = !!ui.lightbox; });
  const lb = $derived(ui.lightbox); const imgs = $derived(lb ? pack.img(lb.slug) : []);
  const go = (d: number) => { if (lb && imgs.length) ui.lightbox = { slug: lb.slug, i: (lb.i + d + imgs.length) % imgs.length }; };
  function key(e: KeyboardEvent) { if (!lb) return; if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); }
</script>

<svelte:window onkeydown={key} />
<Modal bind:open title={lb ? `${pack.name(lb.slug)} · Bild ${lb.i + 1} von ${imgs.length}` : ""} width="1400px" onclose={() => (ui.lightbox = null)}>
  {#if lb}
    <div class="lb">
      <button class="btn nav" onclick={() => go(-1)} aria-label="Vorheriges Bild" disabled={imgs.length < 2}>‹</button>
      <img src={imgs[lb.i]} alt="Bild {lb.i + 1} von {pack.name(lb.slug)}" />
      <button class="btn nav" onclick={() => go(1)} aria-label="Nächstes Bild" disabled={imgs.length < 2}>›</button>
    </div>
    <div class="thumbs">{#each imgs as u, i}<button class:on={i === lb.i} onclick={() => (ui.lightbox = { slug: lb.slug, i })} aria-label="Bild {i + 1}"><img src={u} alt="" loading="lazy" /></button>{/each}</div>
  {/if}
</Modal>

<style>
  .lb { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: .6rem; align-items: center; }
  .lb img { width: 100%; max-height: 72vh; object-fit: contain; border-radius: 10px; background: var(--bg-2); }
  .nav { font-size: 1.6rem; width: 2.8rem; height: 2.8rem; }
  .thumbs { display: flex; gap: .35rem; overflow-x: auto; margin-top: .6rem; }
  .thumbs button { flex: none; width: 6rem; aspect-ratio: 16/10; padding: 0; border: 2px solid transparent; border-radius: 8px; overflow: hidden; cursor: pointer; background: var(--bg-2); }
  .thumbs button.on { border-color: var(--accent); } .thumbs img { width: 100%; height: 100%; object-fit: cover; }
</style>
