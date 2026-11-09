<script lang="ts">
  import { SOUNDBASE } from "../lib/data";
  import type { Mod } from "../lib/data";
  import { pack } from "../lib/pack.svelte";
  import { ui } from "../lib/ui.svelte";
  import { onDestroy } from "svelte";
  let { m, compact = false }: { m: Mod; compact?: boolean } = $props();
  const on = $derived(pack.sel.has(m.slug));
  const lk = $derived(pack.LOCKED.has(m.slug));
  const bl = $derived(pack.BLOCKED.get(m.slug));
  const imgs = $derived(pack.img(m.slug).slice(0, 3));
  const ico = $derived(imgs.length ? "" : pack.icon(m.slug));
  const fromPreset = $derived(!!pack.preset && pack.preset.base.includes(m.slug));
  const vids = $derived(pack.videos(m.slug).length);
  const snd = $derived(pack.proben(m.slug));
  let audio: HTMLAudioElement | null = null; let playing = $state(false);
  onDestroy(() => audio?.pause()); // Hörprobe stoppt, wenn die Kachel verschwindet (Tab, Filter, Suche)
  function toggle() { if (!audio) { audio = new Audio(SOUNDBASE + snd[0].datei); audio.onended = () => (playing = false); } if (playing) { audio.pause(); playing = false; } else { audio.currentTime = 0; playing = true; audio.play().catch(() => (playing = false)); } }
  function toggleFilter(k: string) { const n = new Set(ui.filters); n.has(k) ? n.delete(k) : n.add(k); ui.filters = n; }
</script>

<article class="card" class:on class:lk class:bl class:compact>
  <button class="hit" aria-pressed={on} aria-label="{m.name}: {lk ? 'immer dabei, Details zeigen' : bl ? 'nicht wählbar, Details zeigen' : on ? 'im Pack, klicken zum Entfernen' : 'klicken zum Hinzufügen'}" onclick={() => (lk || bl ? (ui.detail = m.slug) : ui.pick(m.slug))}></button>
  {#if !compact}
    <div class="thumbs">
      {#each imgs as u, i}<button class="zoom" onclick={() => (ui.lightbox = { slug: m.slug, i })} aria-label="Bild {i + 1} von {m.name} vergrößern"><img referrerpolicy="no-referrer" src={u} alt="" loading="lazy" decoding="async" onerror={(e) => (e.currentTarget as HTMLElement).parentElement?.remove()} /></button>{:else}{#if snd.length}<span class="ph sndph" aria-hidden="true">♪</span>{:else if ico}<span class="ph icoph" aria-hidden="true"><img referrerpolicy="no-referrer" src={ico} alt="" width="52" height="52" loading="lazy" decoding="async" onerror={(e) => (e.currentTarget as HTMLElement).remove()} /></span>{:else}<span class="ph">{m.name.slice(0, 1)}</span>{/if}{/each}
      {#if snd.length}<button class="play" onclick={toggle} aria-label="{playing ? 'Hörprobe stoppen' : 'Hörprobe abspielen'}: {m.name}">{playing ? "■" : "▶"} Hörprobe</button>{/if}
      {#if vids}<button class="vid-btn" onclick={(e) => { e.stopPropagation(); ui.lightbox = { slug: m.slug, i: 0, video: pack.videos(m.slug)[0].id }; }} aria-label="Video zu {m.name} ansehen">▶ Video ansehen</button>{/if}
    </div>
  {/if}
  <div class="body">
    <h3>{m.name}</h3>
    <p>{m.notiz}</p>
    <div class="meta">
      {#if lk}<span class="badge ok">immer dabei</span>{:else if bl}<span class="badge bad" title="Verträgt sich nicht mit {bl.map(y => pack.name(y)).join(', ')} aus dem Leistungspaket">nicht wählbar</span>{:else if m.rolle === "K"}<button class="tag-btn rec-tag" onclick={(e) => { e.stopPropagation(); toggleFilter('rec'); }} title="Nach empfohlenen Mods filtern">★ empfohlen</button>{/if}
      {#if fromPreset}<span class="badge preset" title="Kommt aus der gewählten Vorlage">Vorlage</span>{:else if on && pack.preset && !lk}<span class="badge info" title="Von dir hinzugefügt">+ von dir</span>{/if}
      {#if m.pt === "s" && m.voxy}<span class="badge {m.voxy.s === 'ja' ? 'ok' : m.voxy.s === 'nein' ? 'bad' : 'plain'}" title={m.voxy.t}>{m.voxy.s === "ja" ? "mit Voxy" : m.voxy.s === "nein" ? "ohne Voxy" : "Voxy unklar"}</span>{/if}
      {#if vids}<button class="tag-btn vid-tag" onclick={(e) => { e.stopPropagation(); ui.lightbox = { slug: m.slug, i: 0, video: pack.videos(m.slug)[0].id }; }} title="Video direkt abspielen">▶ Video</button>{/if}
      {#if snd.length}<button class="tag-btn snd-tag" onclick={(e) => { e.stopPropagation(); toggle(); }} title="Hörprobe abspielen">♪ Hörprobe</button>{/if}
      {#if m.ampel !== "R" && m.cat !== "S" && (m.pt || "m") === "m"}<button class="tag-btn van-tag" onclick={(e) => { e.stopPropagation(); toggleFilter('van'); }} title="Läuft auf Vanilla-Servern">Vanilla</button>{/if}
      {#if (m as any).neu}<span class="badge info">neu</span>{/if}
      {#if m.cf}<span class="badge plain" title="Datei liegt gespiegelt im Projekt und wird automatisch mitgeladen">CurseForge</span>{/if}
      {#if m.cf && !pack.data.files[m.slug]}<span class="badge warn">nur manuell</span>{/if}
      {#if m.ampel === "R"}<span class="badge bad">Server nötig</span>{/if}
      {#if pack.cost(m.slug) >= 5}<span class="badge warn">kostet FPS</span>{/if}
    </div>
  </div>
  <span class="check" aria-hidden="true">{on ? "✓" : bl ? "–" : "+"}</span>
  <button class="more" onclick={() => (ui.detail = m.slug)}>Details</button>
</article>

<style>
  .card { position: relative; display: flex; flex-direction: column; min-width: 0; border-radius: var(--radius); border: 1px solid var(--line); background: var(--surface); overflow: hidden; transition: border-color .15s, box-shadow .15s, transform .15s; }
  .card:hover { border-color: var(--line-2); transform: translateY(-1px); box-shadow: var(--shadow); }
  .card.on { border-color: var(--accent); box-shadow: inset 0 0 0 1.5px var(--accent); }
  .card.lk { cursor: default; } .card.bl { opacity: .72; } .bl .hit { cursor: help; }
  .thumbs { position: relative; display: flex; gap: 2px; height: 8.5rem; background: var(--bg-2); }
  .hit { position: absolute; inset: 0; z-index: 1; border: 0; background: none; cursor: pointer; border-radius: inherit; }
  .lk .hit { cursor: default; }
  .zoom { position: relative; z-index: 2; flex: 1 1 0; min-width: 0; height: 100%; padding: 0; border: 0; background: none; cursor: zoom-in; }
  .zoom img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .more, .check { z-index: 2; } .check { pointer-events: none; }
  .ph { margin: auto; font: 700 2.4rem var(--mono); color: var(--line-2); }
  .icoph { display: grid; place-items: center; width: 3.6rem; height: 3.6rem; border-radius: 12px; background: var(--surface); border: 1px solid var(--line); overflow: hidden; box-shadow: 0 2px 8px rgb(0 0 0 / .18); }
  .icoph img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .vid-btn { position: absolute; left: .5rem; bottom: .5rem; z-index: 2; padding: .2rem .55rem; border-radius: 6px; background: rgb(0 0 0 / .75); color: #fff; font: 600 .72rem var(--font); border: 1px solid rgb(255 255 255 / .3); cursor: pointer; transition: background .15s, transform .1s; display: flex; align-items: center; gap: .3rem; }
  .vid-btn:hover { background: var(--accent); color: #042; border-color: var(--accent); transform: scale(1.04); }
  .body { padding: .75rem .85rem 2.6rem; display: flex; flex-direction: column; gap: .3rem; }
  h3 { margin: 0; font-size: .98rem; font-weight: 650; line-height: 1.25; padding-right: 1.8rem; overflow-wrap: anywhere; }
  .compact h3 { padding-right: 2.2rem; }
  p { margin: 0; font-size: .84rem; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .meta { display: flex; flex-wrap: wrap; gap: .3rem; margin-top: .25rem; z-index: 2; position: relative; }
  .tag-btn { border: 1px solid var(--line-2); background: var(--bg-2); color: var(--fg); border-radius: 6px; padding: .1rem .45rem; font: 500 .75rem var(--font); cursor: pointer; transition: border-color .15s, background .15s; }
  .tag-btn:hover { border-color: var(--accent); background: var(--surface); color: var(--accent); }
  .rec-tag { background: var(--accent-soft); border-color: var(--accent); color: var(--fg); font-weight: 600; }
  .vid-tag { background: rgb(255 0 0 / .12); border-color: rgb(255 0 0 / .35); color: var(--fg); font-weight: 600; }
  .vid-tag:hover { background: rgb(255 0 0 / .2); border-color: #f33; color: #f55; }
  .snd-tag { background: var(--info-soft); border-color: var(--info); color: var(--fg); font-weight: 600; }
  .van-tag { background: var(--surface-2); border-color: var(--line-2); color: var(--muted); }
  .check { position: absolute; top: .55rem; right: .55rem; width: 1.8rem; height: 1.8rem; display: grid; place-items: center; border-radius: 50%; background: var(--surface); border: 1px solid var(--line-2); font-weight: 700; color: var(--muted); }
  .compact .check { top: .65rem; }
  .on .check { background: var(--accent); border-color: var(--accent); color: var(--accent-fg); }
  .more { position: absolute; right: .55rem; bottom: .55rem; border: 1px solid var(--line); background: var(--surface-2); color: var(--fg); border-radius: 8px; padding: .2rem .65rem; font: 500 .8rem var(--font); cursor: pointer; }
  .more:hover { border-color: var(--accent); color: var(--accent); }
  .play { position: absolute; right: .5rem; bottom: .5rem; z-index: 2; border: 0; border-radius: 99px; padding: .3rem .65rem; font: 600 .78rem var(--font); background: rgb(0 0 0 / .72); color: #fff; cursor: pointer; }
  .play:hover { background: var(--accent); color: #062; }
  .sndph { font-size: 2.2rem; color: var(--accent); }
</style>