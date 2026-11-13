<script lang="ts">
  import { SOUNDBASE, thumb } from "../lib/data";
  import Modal from "./Modal.svelte";
  import { pack, PT_1, CATS, DEP_IGNORE } from "../lib/pack.svelte";
  import { AUTO_RULES, type AutoMode } from "../lib/auto-cfg";
  import { ui } from "../lib/ui.svelte";
  const ART: Record<string, [string, string]> = { K: ["Konflikt", "bad"], D: ["Nur eins", "warn"], T: ["Testen", "info"], A: ["Gehört zusammen", "ok"], S: ["Passt gut", "ok"] };
  const s = $derived(ui.detail || ""); const m = $derived(pack.BY[s]);
  const gal = $derived(m ? pack.gallery(s) : []); const imgs = $derived(gal.map(g => g.thumb)); const vids = $derived(m ? pack.videos(s) : []);
  const bl = $derived(pack.BLOCKED.get(s));
  const det = $derived(pack.data.x.details[s] || {});
  const deps = $derived(m ? [...new Set<string>((pack.data.files[s]?.[5] || []).concat(pack.implicit(s)))].filter(d => !DEP_IGNORE.has(d)) : []);
  const rel = $derived(m ? pack.relInfo(s) : []);
  const autos = $derived(m ? pack.autoRules(s) : []);
  let play = $state<string | null>(null);
  let cmp = $state(false);
  let cmpA = $state(0);
  let cmpB = $state(1);
  let split = $state(50);
  $effect(() => { s; play = null; cmp = false; cmpA = 0; cmpB = 1; split = 50; });
  function pickThumb(idx: number) {
    if (!cmp) { ui.lightbox = { slug: s, i: idx }; return; }
    if (idx === cmpA) return;
    if (idx === cmpB) { [cmpA, cmpB] = [cmpB, cmpA]; return; }
    cmpB = idx;
  }
  const fmtK = (k: number) => (k >= 1000 ? (k / 1000).toFixed(k >= 10000 ? 0 : 1).replace(".", ",") + " Mio" : k + " Tsd");
</script>

<Modal bind:open={() => !!ui.detail, (v) => { if (!v) ui.detail = null; }} title={m?.name || ""} width="980px" onclose={() => (ui.detail = null)}>
  {#if m}
    <div class="top">
      <div class="media">
        {#if imgs.length}
          {#if cmp && gal.length >= 2}
            <div class="cmpbox">
              <img class="cmpimg" referrerpolicy="no-referrer" src={gal[cmpB]?.full || gal[0].full} alt="Vergleichsbild B ({cmpB + 1}) von {m.name}" />
              <img class="cmpimg clip" style="clip-path:inset(0 {100 - split}% 0 0)" referrerpolicy="no-referrer" src={gal[cmpA]?.full || gal[0].full} alt="Vergleichsbild A ({cmpA + 1}) von {m.name}" />
              <div class="cmpline" style="left:{split}%" aria-hidden="true"><span class="cmphandle">⇄</span></div>
              <span class="cmplbl l" aria-hidden="true">Bild {cmpA + 1}</span>
              <span class="cmplbl r" aria-hidden="true">Bild {cmpB + 1}</span>
              <input class="cmprange" type="range" min="0" max="100" bind:value={split} aria-label="Schieberegler für Bildvergleich" />
            </div>
          {:else}
            <button class="hero" onclick={() => (ui.lightbox = { slug: s, i: 0 })}><img referrerpolicy="no-referrer" src={gal[0].full} alt="Bild von {m.name}" /></button>
          {/if}
          {#if imgs.length > 1}
            <div class="mbar">
              <button class="btn sm {m.pt === 'r' || m.pt === 's' ? 'primary' : 'ghost'}" aria-pressed={cmp} onclick={() => (cmp = !cmp)}>
                ⇄ {cmp ? "Vergleich beenden" : m.pt === "r" ? "Textur-Vorschau (Vorher / Nachher)" : m.pt === "s" ? "Shader-Vergleich (Vorher / Nachher)" : "Bilder vergleichen"}
              </button>
              {#if cmp}<span class="small muted">Schieberegler ziehen · Klick unten wechselt das Vergleichsbild</span>{/if}
            </div>
            <div class="strip">
              {#each imgs.slice(cmp ? 0 : 1, 9) as u, idx}
                {@const realIdx = cmp ? idx : idx + 1}
                <button class:selA={cmp && realIdx === cmpA} class:selB={cmp && realIdx === cmpB} onclick={() => pickThumb(realIdx)} aria-label={cmp ? `Bild ${realIdx + 1} für Vergleich wählen` : `Bild ${realIdx + 1} von ${m.name} vergrößern`}><img referrerpolicy="no-referrer" src={u} alt="" loading="lazy" onerror={(e) => (e.currentTarget as HTMLElement).parentElement!.remove()} /></button>
              {/each}
            </div>
          {/if}
        {:else}<div class="noimg muted">Noch keine Bilder – kommen über die Medien-Pipeline.</div>{/if}
      </div>
      <div class="facts">
        <p class="lead">{m.notiz}</p>
        <div class="tags"><span class="badge plain">{PT_1[m.pt || "m"]}</span><span class="badge plain">{CATS[m.cat].t}</span><span class="badge plain">{m.sub}</span>
          <span class="badge {m.ampel === 'R' ? 'bad' : m.ampel === 'Y' ? 'warn' : 'ok'}">{m.ampel === "R" ? "Server nötig" : m.ampel === "Y" ? "Server optional" : "Nur Client"}</span></div>
        <p class="small muted">Version {pack.data.files[s]?.[6] || "–"}{m.downloadsK ? ` · ${fmtK(m.downloadsK)} Downloads` : ""}</p>
        {#if m.cf && !pack.data.files[s]}<p class="small warn">Der Autor erlaubt keinen automatischen Download. Die Datei musst du einmal selbst von CurseForge laden und in den mods-Ordner legen. Die Website erinnert dich beim Export daran.</p>{/if}
        {#if m.pt === "s" && m.voxy}<p class="small {m.voxy.s === 'ja' ? 'muted' : 'warn'}"><b>Fernsicht (Voxy):</b> {m.voxy.t}</p>{/if}
        {#if m.nichtAuto}<p class="small muted">Kommt nur ins Server-Pack, wenn du es auswählst. {m.nichtAuto}</p>{/if}
        {#if bl}<p class="small warn">Nicht wählbar: verträgt sich nicht mit {bl.map(y => pack.name(y)).join(", ")}, das fest im Leistungspaket steckt.</p>{/if}
        {#if deps.length}<p class="small muted">Bringt automatisch mit: {deps.map(d => pack.name(d)).join(", ")}</p>{/if}
        <div class="act">
          {#if pack.LOCKED.has(s)}<span class="badge ok">immer dabei</span>
          {:else if bl}<span class="badge bad">nicht wählbar</span>
          {:else}<button class="btn {pack.sel.has(s) ? '' : 'primary'}" onclick={() => ui.pick(s)}>{pack.sel.has(s) ? "Aus dem Pack entfernen" : "Zum Pack hinzufügen"}</button>{/if}
          {#if m.cf}<a class="btn ghost" href={m.cf} target="_blank" rel="noopener">CurseForge ↗</a>{:else}<a class="btn ghost" href="https://modrinth.com/project/{s}" target="_blank" rel="noopener">Modrinth ↗</a>{/if}
        </div>
      </div>
    </div>
    {#if pack.proben(s).length}
      <h3>Hörproben</h3>
      <ul class="snd">{#each pack.proben(s) as p (p.datei)}<li><span>{p.titel}</span><audio controls preload="none" src={SOUNDBASE + p.datei}></audio></li>{/each}</ul>
      <p class="small muted">Direkt aus den Dateien der Mod bzw. des Packs.</p>
    {/if}
    {#if vids.length}
      <h3>Videos</h3>
      <div class="vids">
        {#each vids as v (v.id)}
          {#if play === v.id}<iframe class="yt" src="https://www.youtube-nocookie.com/embed/{v.id}?autoplay=1" referrerpolicy="strict-origin-when-cross-origin" title={v.titel || m.name} allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
          {:else}<button class="vcard" onclick={() => (play = v.id)}><img referrerpolicy="no-referrer" src={thumb(v)} alt="" loading="lazy" /><span class="pl">▶</span><span class="vt">{v.titel || "Video ansehen"}</span></button>{/if}
        {/each}
      </div>
      <p class="small muted">Videos laden erst beim Klick (YouTube ohne Cookies).</p>
    {/if}
    {#if rel.length}
      <h3>Verträglichkeit</h3>
      <ul class="rel">
        {#each rel as x}<li><span class="badge {ART[x.art]?.[1] || 'plain'}">{ART[x.art]?.[0] || x.art}</span> {x.others.map(o => pack.name(o)).join(", ")}: <span class="muted">{x.text}</span></li>{/each}
      </ul>
    {/if}
    {#if autos.length}
      <h3>Automatische Feinabstimmung (Teil-Überschneidungen)</h3>
      <p class="small muted">Wenn du diese Mods/Packs kombinierst, werden beide geladen. Du kannst festlegen, welcher Mod den doppelten Effekt übernimmt, oder beide anlassen:</p>
      <ul class="rel">
        {#each autos as a (a.id)}
          <li>
            <div>
              <span class="badge {a.active ? 'ok' : 'info'}">{a.active ? "Aktiv im Pack" : "Automatisch"}</span>
              mit {a.others.map(o => pack.name(o)).join(" / ")}: <span class="muted">{a.text}</span>
            </div>
            {#if a.active}
              {@const r = AUTO_RULES.find(x => x.id === a.id)}
              <select class="field sm" style="margin-top:0.35rem; max-width:26rem;" aria-label="Wer übernimmt den Effekt?" value={a.mode} onchange={e => pack.setAutoChoice(a.id, e.currentTarget.value as AutoMode)}>
                <option value="std">Empfohlen (automatisch)</option>
                {#if a.hasAlt && r?.alt}<option value="alt">Umgekehrt: {pack.name(r.alt.slug)} gibt ab</option>{/if}
                {#if a.canOff}<option value="off">Beide anlassen</option>{/if}
              </select>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
    {#if det.txt}<details class="long"><summary>Ausführliche Beschreibung (Projektseite, Englisch)</summary><p>{det.txt}</p></details>{/if}
  {/if}
</Modal>

<style>
  .top { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 1.2rem; }
  .hero { display: block; width: 100%; padding: 0; border: 0; border-radius: 12px; overflow: hidden; cursor: zoom-in; background: var(--bg-2); aspect-ratio: 16/9; }
  .hero img { width: 100%; height: 100%; object-fit: cover; }
  .cmpbox { position: relative; width: 100%; aspect-ratio: 16/9; border-radius: 12px; overflow: hidden; background: var(--bg-2); user-select: none; }
  .cmpimg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
  .cmpline { position: absolute; top: 0; bottom: 0; width: 2px; background: #fff; box-shadow: 0 0 6px rgb(0 0 0 / .6); pointer-events: none; transform: translateX(-1px); }
  .cmphandle { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 2rem; height: 2rem; border-radius: 50%; background: var(--accent); color: var(--accent-fg); display: grid; place-items: center; font-weight: 700; font-size: .85rem; box-shadow: 0 2px 8px rgb(0 0 0 / .45); }
  .cmplbl { position: absolute; bottom: .45rem; padding: .15rem .45rem; border-radius: 6px; background: rgb(0 0 0 / .7); color: #fff; font: 600 .72rem var(--font); pointer-events: none; }
  .cmplbl.l { left: .5rem; } .cmplbl.r { right: .5rem; }
  .cmprange { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: ew-resize; }
  .mbar { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; margin-top: .4rem; }
  .strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: .35rem; margin-top: .35rem; }
  .strip button { padding: 0; border: 2px solid transparent; border-radius: 8px; overflow: hidden; aspect-ratio: 16/10; cursor: zoom-in; background: var(--bg-2); } .strip img { width: 100%; height: 100%; object-fit: cover; }
  .strip button.selA { border-color: var(--accent); } .strip button.selB { border-color: var(--info); }
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
  .snd { list-style: none; padding: 0; margin: .4rem 0; display: grid; gap: .5rem; } .snd li { display: grid; grid-template-columns: minmax(8rem, 14rem) minmax(0, 1fr); gap: .75rem; align-items: center; font-size: .9rem; text-transform: capitalize; } .snd audio { width: 100%; height: 2.2rem; }
  @media (max-width: 540px) { .snd li { grid-template-columns: minmax(0, 1fr); } }
</style>
