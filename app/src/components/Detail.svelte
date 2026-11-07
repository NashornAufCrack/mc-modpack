<script lang="ts">
  import Modal from "./Modal.svelte";
  import { pack, PT_1, CATS } from "../lib/pack.svelte";
  import { ui } from "../lib/ui.svelte";
  const ART: Record<string, [string, string]> = { K: ["Konflikt", "bad"], D: ["Nur eins", "warn"], T: ["Testen", "info"], A: ["Gehört zusammen", "ok"], S: ["Passt gut", "ok"] };
  let open = $state(false);
  $effect(() => { open = !!ui.detail; });
  const s = $derived(ui.detail || ""); const m = $derived(pack.BY[s]);
  const imgs = $derived(m ? pack.img(s) : []); const vids = $derived(m ? pack.videos(s) : []);
  const det = $derived(pack.data.x.details[s] || {});
  const deps = $derived(m ? [...new Set((pack.data.files[s]?.[5] || []).concat(pack.implicit(s)))] : []);
  const rel = $derived(m ? pack.relInfo(s) : []);
  const auto = $derived(pack.data.x.prules.filter(p => p.slug === s));
  let play = $state<string | null>(null);
  $effect(() => { s; play = null; });
  const fmtK = (k: number) => (k >= 1000 ? (k / 1000).toFixed(k >= 10000 ? 0 : 1).replace(".", ",") + " Mio" : k + " Tsd");
</script>

<Modal bind:open title={m?.name || ""} width="980px" onclose={() => (ui.detail = null)}>
  {#if m}
    <div class="top">
      <div class="media">
        {#if imgs.length}
          <button class="hero" onclick={() => (ui.lightbox = { slug: s, i: 0 })}><img src={pack.imgHQ(s)[0] || imgs[0]} alt="Bild von {m.name}" /></button>
          {#if imgs.length > 1}<div class="strip">{#each imgs.slice(1, 9) as u, i}<button onclick={() => (ui.lightbox = { slug: s, i: i + 1 })}><img src={u} alt="" loading="lazy" onerror={(e) => (e.currentTarget as HTMLElement).parentElement!.remove()} /></button>{/each}</div>{/if}
        {:else}<div class="noimg muted">Noch keine Bilder – kommen über die Medien-Pipeline.</div>{/if}
      </div>
      <div class="facts">
        <p class="lead">{m.notiz}</p>
        <div class="tags"><span class="badge plain">{PT_1[m.pt || "m"]}</span><span class="badge plain">{CATS[m.cat].t}</span><span class="badge plain">{m.sub}</span>
          <span class="badge {m.ampel === 'R' ? 'bad' : m.ampel === 'Y' ? 'warn' : 'ok'}">{m.ampel === "R" ? "Server nötig" : m.ampel === "Y" ? "Server optional" : "Nur Client"}</span></div>
        <p class="small muted">Version {pack.data.files[s]?.[6] || "–"}{m.downloadsK ? ` · ${fmtK(m.downloadsK)} Downloads` : ""}</p>
        {#if m.cf && !pack.data.files[s]}<p class="small warn">Der Autor erlaubt keinen automatischen Download. Die Datei musst du einmal selbst von CurseForge laden und in den mods-Ordner legen. Die Website erinnert dich beim Export daran.</p>{/if}
        {#if deps.length}<p class="small muted">Bringt automatisch mit: {deps.map(d => pack.name(d)).join(", ")}</p>{/if}
        <div class="act">
          {#if pack.LOCKED.has(s)}<span class="badge ok">immer dabei</span>
          {:else}<button class="btn {pack.sel.has(s) ? '' : 'primary'}" onclick={() => ui.pick(s)}>{pack.sel.has(s) ? "Aus dem Pack entfernen" : "Zum Pack hinzufügen"}</button>{/if}
          {#if m.cf}<a class="btn ghost" href={m.cf} target="_blank" rel="noopener">CurseForge ↗</a>{:else}<a class="btn ghost" href="https://modrinth.com/project/{s}" target="_blank" rel="noopener">Modrinth ↗</a>{/if}
        </div>
      </div>
    </div>
    {#if vids.length}
      <h3>Videos</h3>
      <div class="vids">
        {#each vids as v}
          {#if play === v.id}<iframe class="yt" src="https://www.youtube-nocookie.com/embed/{v.id}?autoplay=1" title={v.titel || m.name} allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
          {:else}<button class="vcard" onclick={() => (play = v.id)}><img src="https://i.ytimg.com/vi/{v.id}/mqdefault.jpg" alt="" loading="lazy" /><span class="pl">▶</span><span class="vt">{v.titel || "Video ansehen"}</span></button>{/if}
        {/each}
      </div>
      <p class="small muted">Videos laden erst beim Klick (YouTube ohne Cookies).</p>
    {/if}
    {#if rel.length || auto.length}
      <h3>Verträglichkeit</h3>
      <ul class="rel">
        {#each rel as x}<li><span class="badge {ART[x.art]?.[1] || 'plain'}">{ART[x.art]?.[0] || x.art}</span> {x.others.map(o => pack.name(o)).join(", ")}: <span class="muted">{x.text}</span></li>{/each}
        {#each auto as a}<li><span class="badge info">automatisch</span> <span class="muted">{a.text}</span></li>{/each}
      </ul>
    {/if}
    {#if det.txt}<details class="long"><summary>Ausführliche Beschreibung (Projektseite, Englisch)</summary><p>{det.txt}</p></details>{/if}
  {/if}
</Modal>

<style>
  .top { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 1.2rem; }
  .hero { display: block; width: 100%; padding: 0; border: 0; border-radius: 12px; overflow: hidden; cursor: zoom-in; background: var(--bg-2); aspect-ratio: 16/9; }
  .hero img { width: 100%; height: 100%; object-fit: cover; }
  .strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: .35rem; margin-top: .35rem; }
  .strip button { padding: 0; border: 0; border-radius: 8px; overflow: hidden; aspect-ratio: 16/10; cursor: zoom-in; background: var(--bg-2); } .strip img { width: 100%; height: 100%; object-fit: cover; }
  .noimg { aspect-ratio: 16/9; display: grid; place-items: center; border: 1px dashed var(--line-2); border-radius: 12px; font-size: .85rem; padding: 1rem; text-align: center; }
  .lead { margin: 0 0 .6rem; font-size: 1.02rem; }
  .tags { display: flex; flex-wrap: wrap; gap: .3rem; margin-bottom: .5rem; }
  .small { font-size: .82rem; margin: .2rem 0; } .warn { color: var(--warn); }
  .act { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .8rem; }
  h3 { font-size: .8rem; text-transform: uppercase; letter-spacing: .07em; margin: 1.4rem 0 .5rem; }
  .vids { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: .6rem; }
  .vcard { position: relative; padding: 0; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: var(--bg-2); cursor: pointer; text-align: left; color: var(--fg); }
  .vcard img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
  .pl { position: absolute; top: 28%; left: 50%; transform: translate(-50%, -50%); width: 3rem; height: 2.1rem; border-radius: 9px; background: rgb(0 0 0 / .75); color: #fff; display: grid; place-items: center; }
  .vt { display: block; padding: .4rem .55rem; font-size: .8rem; line-height: 1.3; }
  .yt { width: 100%; aspect-ratio: 16/9; border: 0; border-radius: 10px; grid-column: 1 / -1; }
  .rel { margin: 0; padding: 0; list-style: none; display: grid; gap: .35rem; font-size: .88rem; }
  .long { margin-top: 1rem; } .long p { white-space: pre-line; font-size: .84rem; color: var(--muted); max-height: 18rem; overflow: auto; }
  summary { cursor: pointer; font-weight: 500; }
  @media (max-width: 760px) { .top { grid-template-columns: minmax(0, 1fr); } }
</style>
