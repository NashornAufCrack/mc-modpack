<script lang="ts">
  import type { Gruppe } from "../lib/data";
  import { pack } from "../lib/pack.svelte";
  import { ui } from "../lib/ui.svelte";
  let { g }: { g: Gruppe } = $props();
  const opts = $derived(g.mods.filter(s => pack.BY[s] && pack.data.files[s]));
  const chosen = $derived(opts.find(s => pack.sel.has(s)) || null);
  function choose(s: string | null) {
    if (s === chosen) return;
    pack.set(s || opts[0], !!s, opts.filter(o => o !== s));
    if (!s) opts.forEach(o => pack.sel.has(o) && pack.set(o, false));
    ui.say(s ? `${g.titel}: ${pack.name(s)}` : `${g.titel}: keins`, true);
  }
</script>

<section class="dec" aria-label={g.titel}>
  <header><h3>{g.titel}</h3><span class="badge {chosen ? 'ok' : 'warn'}">{chosen ? "entschieden" : "offen"}</span></header>
  <p class="muted">{g.text}</p>
  <div class="opts" role="radiogroup" aria-label={g.titel}>
    {#each opts as s}
      {@const m = pack.BY[s]}{@const img = pack.img(s)[0]}
      <div class="opt" class:on={chosen === s}>
        <button class="pick" role="radio" aria-checked={chosen === s} onclick={() => choose(s)}>
          <span class="im">{#if img}<img src={img} alt="" loading="lazy" onerror={(e) => (e.currentTarget as HTMLElement).remove()} />{/if}</span>
          <span class="nm"><span class="dot"></span>{m.name}</span>
          <span class="nt">{m.notiz}</span>
        </button>
        <button class="btn sm ghost info" onclick={() => (ui.detail = s)}>Details</button>
      </div>
    {/each}
    <button class="none" role="radio" aria-checked={!chosen} onclick={() => choose(null)}>Keins davon</button>
  </div>
</section>

<style>
  .dec { border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); padding: .9rem; display: flex; flex-direction: column; gap: .5rem; }
  header { display: flex; align-items: center; gap: .5rem; } h3 { margin: 0; font-size: 1rem; flex: 1; }
  p { margin: 0; font-size: .84rem; }
  .opts { display: grid; grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr)); gap: .5rem; }
  .opt { position: relative; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: var(--surface-2); }
  .opt.on { border-color: var(--accent); box-shadow: inset 0 0 0 1.5px var(--accent); }
  .pick { display: flex; flex-direction: column; width: 100%; padding: 0 0 2.2rem; border: 0; background: none; color: var(--fg); text-align: left; cursor: pointer; font: inherit; }
  .im { height: 5.5rem; background: var(--bg-2); display: block; } .im img { width: 100%; height: 100%; object-fit: cover; }
  .nm { display: flex; align-items: center; gap: .4rem; padding: .5rem .6rem 0; font-weight: 600; font-size: .88rem; }
  .dot { width: .85rem; height: .85rem; flex: none; border-radius: 50%; border: 2px solid var(--line-2); }
  .on .dot { border-color: var(--accent); background: radial-gradient(var(--accent) 45%, transparent 50%); }
  .nt { padding: .2rem .6rem 0; font-size: .76rem; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .info { position: absolute; right: .3rem; bottom: .3rem; }
  .none { border: 1px dashed var(--line-2); border-radius: 10px; background: none; color: var(--muted); font: 500 .84rem var(--font); cursor: pointer; min-height: 2.4rem; }
  .none[aria-checked="true"] { border-style: solid; border-color: var(--fg); color: var(--fg); }
</style>
