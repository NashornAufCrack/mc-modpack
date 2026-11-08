<script lang="ts">
  import { onMount } from "svelte";
  import { loadUpdates, type Updates } from "../lib/data";
  import { pack } from "../lib/pack.svelte";
  import { ui } from "../lib/ui.svelte";
  let u = $state<Updates | null>(null); let done = $state(false); let q = $state("");
  onMount(async () => { u = await loadUpdates(); done = true; });
  const T: Record<string, string> = { m: "Mod", r: "Resource Pack", s: "Shader", d: "Datapack" };
  const fmt = (d: string) => new Date(d).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" });
  const week = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const recent = $derived(u ? u.verlauf.filter(v => v.datum >= week).flatMap(v => v.updates.map(x => ({ ...x, tag: v.datum }))).reverse() : []);
  const old = $derived(u ? u.ohneNeue.filter(o => pack.BY[o.slug] && (!q || o.name.toLowerCase().includes(q.toLowerCase()))) : []);
  const days = (d: string) => Math.round((Date.now() - new Date(d).getTime()) / 864e5);
</script>

<section class="wrap">
  <h1>Update-Stand</h1>
  <p class="muted lead">Jeden Tag prüft die Website alle Mods, Shader, Resource Packs und Datapacks auf neue Versionen für Minecraft 26.3 und übernimmt sie automatisch. Dein nächster Download hat also immer die neuesten Dateien.</p>
  {#if !done}<p class="muted">Lade …</p>
  {:else if !u}<p class="muted">Der Update-Stand ist nur auf der Website sichtbar (oder der erste Lauf steht noch aus).</p>
  {:else}
    <div class="stats">
      <div><b>{recent.length}</b><span>neue Versionen in 7 Tagen</span></div>
      <div><b>{old.length}</b><span>seit über einer Woche ohne neue Version</span></div>
      <div><b>{pack.outdated.length}</b><span>veraltete Resource Packs ausgeblendet</span></div>
      <div><b>{fmt(u.checked)}</b><span>zuletzt geprüft</span></div>
    </div>

    <h2>Neu in den letzten 7 Tagen</h2>
    {#if recent.length}
      <ul class="list">{#each recent as x}<li>{#if pack.BY[x.slug]}<button class="lnk" onclick={() => (ui.detail = x.slug)}>{pack.BY[x.slug].name}</button>{:else}<span>{x.name}</span> <span class="badge plain">Bibliothek</span>{/if} <span class="badge plain">{T[x.typ]}</span> <span class="mono muted">{x.von} → {x.auf}</span>{#if x.art !== "release"} <span class="badge warn">{x.art}</span>{/if} <span class="muted small">{fmt(x.tag)}</span></li>{/each}</ul>
    {:else}<p class="muted">Keine neuen Versionen in dieser Woche.</p>{/if}

    {#if u.verfuegbar?.length}
      <h2>Verfügbar, aber bewusst nicht übernommen</h2>
      <p class="muted small">Festgelegte Versionen (Sodium, Iris, Voxy, Photon) und Sprünge von einer stabilen Version auf eine Beta wechseln nie automatisch. Updates, deren neue Pflicht-Abhängigkeit es für 26.3 nicht gibt, werden ebenfalls zurückgehalten.</p>
      <ul class="list">{#each u.verfuegbar as v}<li><b>{pack.BY[v.slug]?.name || v.name}</b> <span class="mono muted">{v.aktuell} → {v.neu}</span> <span class="badge {v.grund.startsWith('fest') ? 'info' : v.grund.startsWith('Abh') ? 'bad' : 'warn'}">{v.grund}</span></li>{/each}</ul>
    {/if}

    {#if u.next}
      <h2>Nächste Minecraft-Version {u.next.version}</h2>
      <div class="meter"><div class="track"><i style="width:{(u.next.ready / u.next.total) * 100}%"></i></div><b>{u.next.ready} / {u.next.total}</b></div>
      <p class="muted small">So viele der empfohlenen Inhalte gibt es schon für {u.next.version}.</p>
    {/if}

    {#if pack.ohneBasis.length}
      <h2>Ausgeblendet: Basis fehlt für 26.3</h2>
      <p class="muted small">Diese Einträge brauchen etwas, das es für 26.3 noch nicht gibt. Sie erscheinen wieder, sobald es eine passende Version gibt.</p>
      <ul class="list">{#each pack.ohneBasis as o}<li><b>{o.name}</b> <span class="muted small">braucht {o.fehlt.join(", ")}</span></li>{/each}</ul>
    {/if}

    {#if pack.outdated.length}
      <h2>Ausgeblendete Resource Packs</h2>
      <p class="muted small">Ihre Datei unterstützt 26.3 laut pack.mcmeta nicht. Sie erscheinen wieder, sobald der Autor aktualisiert.</p>
      <p class="small">{pack.outdated.join(", ")}</p>
    {/if}

    <h2>Ohne neue Version seit über einer Woche</h2>
    <p class="muted small">Das ist normal: Viele Mods sind fertig und brauchen erst zur nächsten Minecraft-Version ein Update.</p>
    <input class="field" type="search" placeholder="Filtern …" bind:value={q} aria-label="Liste filtern" />
    <ul class="list cols">{#each old as o (o.slug)}<li><span>{o.name}</span> <span class="mono muted small">{o.version}</span> <span class="muted small">· seit {days(o.seit)} Tagen</span></li>{/each}</ul>
  {/if}
</section>

<style>
  .wrap { max-width: 980px; padding: 1.75rem 0 4rem; }
  h1 { margin: 0 0 .4rem; font-size: clamp(1.5rem, 2.6vw, 2.1rem); letter-spacing: -.02em; }
  .lead { max-width: 70ch; margin: 0 0 1.2rem; }
  h2 { font-size: .8rem; text-transform: uppercase; letter-spacing: .07em; margin: 1.8rem 0 .6rem; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: .6rem; }
  .stats div { border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); padding: .8rem .9rem; display: grid; gap: .15rem; }
  .stats b { font: 600 1.35rem var(--mono); } .stats span { font-size: .8rem; color: var(--muted); }
  .list { list-style: none; padding: 0; margin: .6rem 0 0; display: grid; gap: .35rem; font-size: .9rem; }
  .cols { display: block; columns: 2 20rem; column-gap: 2rem; } .cols li { break-inside: avoid; margin-bottom: .3rem; }
  .lnk { background: none; border: 0; padding: 0; color: var(--fg); font: 600 .9rem var(--font); cursor: pointer; text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }
  .mono { font-family: var(--mono); font-size: .8rem; } .small { font-size: .8rem; }
  .meter { display: grid; grid-template-columns: 1fr auto; gap: .6rem; align-items: center; max-width: 30rem; }
  .track { height: .5rem; border-radius: 9px; background: var(--bg-2); overflow: hidden; } .track i { display: block; height: 100%; background: var(--accent); }
</style>
