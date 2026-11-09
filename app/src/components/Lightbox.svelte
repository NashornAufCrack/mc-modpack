<script lang="ts">
  import Modal from "./Modal.svelte";
  import { pack } from "../lib/pack.svelte";
  import { thumb } from "../lib/data";
  import { ui } from "../lib/ui.svelte";

  let open = $state(false);
  $effect(() => { open = !!ui.lightbox; });
  const lb = $derived(ui.lightbox);
  const gal = $derived(lb ? pack.gallery(lb.slug) : []);
  const imgs = $derived(gal.map(g => g.full));
  const th = $derived(gal.map(g => g.thumb));
  const vids = $derived(lb ? pack.videos(lb.slug) : []);

  let curVid = $state<string | null>(null);
  let cmp = $state(false);
  let cmpB = $state(1);
  let split = $state(50);

  $effect(() => {
    if (lb) {
      curVid = lb.video || null;
      cmp = false;
      cmpB = (lb.i + 1) % Math.max(1, imgs.length);
      split = 50;
    }
  });

  const go = (d: number) => {
    if (!lb || !imgs.length) return;
    curVid = null;
    ui.lightbox = { slug: lb.slug, i: (lb.i + d + imgs.length) % imgs.length };
  };

  function key(e: KeyboardEvent) {
    if (!lb || cmp || curVid) return;
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  }
</script>

<svelte:window onkeydown={key} />
<Modal bind:open title={lb ? `${pack.name(lb.slug)} · ${curVid ? "Video" : cmp ? `Vergleich Bild ${lb.i + 1} vs. ${cmpB + 1}` : imgs.length ? `Bild ${lb.i + 1} von ${imgs.length}` : "Vorschau"}` : ""} width="1400px" onclose={() => (ui.lightbox = null)}>
  {#if lb}
    {#if curVid}
      <div class="vid-wrap">
        <iframe
          class="yt-frame"
          src="https://www.youtube-nocookie.com/embed/{curVid}?autoplay=1"
          referrerpolicy="strict-origin-when-cross-origin"
          title="{pack.name(lb.slug)} Video"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
    {:else if cmp && imgs.length >= 2}
      <div class="cmpwrap">
        <img class="cmpimg" referrerpolicy="no-referrer" src={imgs[cmpB]} alt="Vergleichsbild {cmpB + 1} von {pack.name(lb.slug)}" />
        <img class="cmpimg" style="clip-path:inset(0 {100 - split}% 0 0)" referrerpolicy="no-referrer" src={imgs[lb.i]} alt="Vergleichsbild {lb.i + 1} von {pack.name(lb.slug)}" />
        <div class="cmpline" style="left:{split}%" aria-hidden="true"><span class="cmphandle">⇄</span></div>
        <span class="cmplbl l" aria-hidden="true">Bild {lb.i + 1}</span>
        <span class="cmplbl r" aria-hidden="true">Bild {cmpB + 1}</span>
        <input class="cmprange" type="range" min="0" max="100" bind:value={split} aria-label="Schieberegler für Bildvergleich" />
      </div>
    {:else if imgs.length}
      <div class="lb">
        <button class="btn nav" onclick={() => go(-1)} aria-label="Vorheriges Bild" disabled={imgs.length < 2}>‹</button>
        <img referrerpolicy="no-referrer" src={imgs[lb.i]} alt="Bild {lb.i + 1} von {pack.name(lb.slug)}" />
        <button class="btn nav" onclick={() => go(1)} aria-label="Nächstes Bild" disabled={imgs.length < 2}>›</button>
      </div>
    {:else}
      <div class="lb">
        <p class="muted" style="text-align:center; padding: 3rem 0; width: 100%;">Keine Bilder vorhanden.</p>
      </div>
    {/if}
    <div class="bar">
      {#if imgs.length >= 2 && !curVid}
        <button class="btn sm ghost" aria-pressed={cmp} onclick={() => { cmp = !cmp; if (cmp && cmpB === lb.i) cmpB = (lb.i + 1) % imgs.length; }}>⇄ {cmp ? "Einzelbild" : "Bilder vergleichen"}</button>
      {/if}
      <div class="thumbs">
        {#each vids as v}
          <button class="vthumb" class:on={curVid === v.id} onclick={() => { curVid = v.id; cmp = false; }} aria-label="Video abspielen">
            <img referrerpolicy="no-referrer" src={thumb(v)} alt="" loading="lazy" />
            <span class="vtag">▶ Video</span>
          </button>
        {/each}
        {#each th as u, i}
          <button class:on={!curVid && i === lb.i} class:onB={!curVid && cmp && i === cmpB} onclick={() => { curVid = null; if (cmp && i !== lb.i) cmpB = i; else ui.lightbox = { slug: lb.slug, i }; }} aria-label="Bild {i + 1}"><img referrerpolicy="no-referrer" src={u} alt="" loading="lazy" /></button>
        {/each}
      </div>
    </div>
  {/if}
</Modal>

<style>
  .lb { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: .6rem; align-items: center; }
  .lb img { width: 100%; max-height: 72vh; object-fit: contain; border-radius: 10px; background: var(--bg-2); }
  .vid-wrap { position: relative; width: 100%; aspect-ratio: 16/9; max-height: 72vh; border-radius: 10px; overflow: hidden; background: #000; margin: 0 auto; }
  .yt-frame { width: 100%; height: 100%; border: 0; }
  .cmpwrap { position: relative; width: 100%; aspect-ratio: 16/9; max-height: 72vh; border-radius: 10px; overflow: hidden; background: var(--bg-2); user-select: none; margin: 0 auto; }
  .cmpimg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
  .cmpline { position: absolute; top: 0; bottom: 0; width: 2px; background: #fff; box-shadow: 0 0 6px rgb(0 0 0 / .6); pointer-events: none; transform: translateX(-1px); }
  .cmphandle { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 2.4rem; height: 2.4rem; border-radius: 50%; background: var(--accent); color: var(--accent-fg); display: grid; place-items: center; font-weight: 700; box-shadow: 0 2px 8px rgb(0 0 0 / .45); }
  .cmplbl { position: absolute; bottom: .6rem; padding: .2rem .55rem; border-radius: 6px; background: rgb(0 0 0 / .72); color: #fff; font: 600 .78rem var(--font); pointer-events: none; }
  .cmplbl.l { left: .6rem; } .cmplbl.r { right: .6rem; }
  .cmprange { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: ew-resize; }
  .nav { font-size: 1.6rem; width: 2.8rem; height: 2.8rem; }
  .bar { display: flex; gap: .6rem; align-items: center; margin-top: .6rem; flex-wrap: wrap; }
  .thumbs { display: flex; gap: .35rem; overflow-x: auto; flex: 1; }
  .thumbs button { flex: none; width: 6rem; aspect-ratio: 16/10; padding: 0; border: 2px solid transparent; border-radius: 8px; overflow: hidden; cursor: pointer; background: var(--bg-2); position: relative; }
  .thumbs button.on { border-color: var(--accent); } .thumbs button.onB { border-color: var(--info); } .thumbs img { width: 100%; height: 100%; object-fit: cover; }
  .vthumb .vtag { position: absolute; inset: 0; display: grid; place-items: center; background: rgb(0 0 0 / .55); color: #fff; font: 700 .75rem var(--font); }
  .vthumb.on .vtag { background: rgb(0 0 0 / .3); color: var(--accent); }
</style>