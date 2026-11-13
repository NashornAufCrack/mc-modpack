<script lang="ts">
  import Modal from "./Modal.svelte";
  import { pack } from "../lib/pack.svelte";
  import { ui } from "../lib/ui.svelte";
  const c = $derived(ui.conflict);
  const ys = $derived(c ? [...new Set(c.cl.map(k => k.y))] : []);
  const texts = $derived(c ? [...new Set(c.cl.map(k => k.text))] : []);
</script>

<Modal bind:open={() => !!ui.conflict, (v) => { if (!v && ui.conflict) ui.resolveConflict(false); }} title={c ? "Nur eins geht: " + [c.x, ...ys].map(s => pack.name(s)).join(" oder ") : ""} width="900px" onclose={() => ui.conflict && ui.resolveConflict(false)}>
  {#if c}
    <p class="muted">{texts.join(" ")}</p>
    <div class="cmp">
      {#each [c.x, ...ys] as s, i (s)}
        {@const m = pack.BY[s]}{@const im = pack.img(s).slice(0, 2)}
        <div class="opt" class:new={i === 0}>
          <div class="im">{#each im as u, j}<button class="z" onclick={() => (ui.lightbox = { slug: s, i: j })} aria-label="Bild vergrößern"><img referrerpolicy="no-referrer" src={u} alt="" loading="lazy" /></button>{:else}<span class="muted">kein Bild</span>{/each}</div>
          <h3>{m.name} {#if i === 0}<span class="badge info">neu</span>{:else}<span class="badge plain">im Pack</span>{/if}</h3>
          <p>{m.notiz}</p>
          {#if pack.cost(s) >= 5}<span class="badge warn">kostet spürbar FPS</span>{/if}
        </div>
      {/each}
    </div>
  {/if}
  {#snippet foot()}
    {#if c}
      <button class="btn" onclick={() => ui.resolveConflict(false)}>{ys.map(s => pack.name(s)).join(", ")} behalten</button>
      <button class="btn primary" onclick={() => ui.resolveConflict(true)}>{pack.name(c.x)} nehmen</button>
    {/if}
  {/snippet}
</Modal>

<style>
  .cmp { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: .8rem; margin-top: .6rem; }
  .opt { border: 1px solid var(--line); border-radius: 12px; padding: .6rem; background: var(--surface-2); }
  .opt.new { border-color: var(--info); }
  .im { display: flex; gap: 3px; height: 9rem; border-radius: 8px; overflow: hidden; background: var(--bg-2); align-items: center; justify-content: center; }
  .z { flex: 1; min-width: 0; height: 100%; padding: 0; border: 0; cursor: zoom-in; } .z img { width: 100%; height: 100%; object-fit: cover; }
  h3 { font-size: 1rem; margin: .55rem 0 .2rem; display: flex; gap: .4rem; align-items: center; } p { margin: 0 0 .4rem; font-size: .86rem; color: var(--muted); }
</style>
