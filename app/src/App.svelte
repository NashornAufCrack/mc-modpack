<script lang="ts">
  import { onMount } from "svelte";
  import { loadData, loadSounds } from "./lib/data";
  import { pack } from "./lib/pack.svelte";
  import { ui } from "./lib/ui.svelte";
  import Builder from "./components/Builder.svelte";
  import Detail from "./components/Detail.svelte";
  import Lightbox from "./components/Lightbox.svelte";
  import Wizard from "./components/Wizard.svelte";
  import Conflict from "./components/Conflict.svelte";
  import Tools from "./components/Tools.svelte";
  import TestView from "./components/TestView.svelte";
  import Help from "./components/Help.svelte";
  import UpdatesView from "./components/Updates.svelte";

  let err = $state("");
  onMount(async () => {
    try { const t = localStorage.getItem("mk-theme"); if (t === "light" || t === "dark") ui.setTheme(t); } catch {}
    try { const { data, media } = await loadData(); pack.init(data, media); loadSounds().then(x => (pack.sounds = x)); } catch (e) { err = String(e); }
    if (pack.imported !== null) sharedMsg(pack.imported);
    route();
  });
  /** Hash-Navigation: Zurück/Vor im Browser und geteilte #pack-Links funktionieren auch ohne Neuladen */
  function route() {
    const v = location.hash.slice(1);
    if (v === "testen" || v === "hilfe" || v === "updates" || v === "bauen") ui.view = v;
    else if ((v.startsWith("p=") || v.startsWith("pack-")) && pack.ready) { const n = pack.importShared(); ui.view = "bauen"; if (n !== null) sharedMsg(n); }
    else if (!v) ui.view = "bauen";
  }
  const sharedMsg = (n: number) => ui.say(`Geteiltes Pack geladen${n ? ` (${n} Einträge gibt es nicht mehr)` : ""}. Deine vorige Auswahl holst du mit Rückgängig zurück.`, true);
  const NAV = [["bauen", "Pack bauen", ""], ["testen", "Testen", ""], ["updates", "Updates", ""], ["hilfe", "Hilfe", " & Glossar"]] as const;
  /** Logo: Seite neu laden und ganz oben starten (Auswahl bleibt, sie liegt im Browser-Speicher) */
  function reloadTop(e: MouseEvent) {
    e.preventDefault();
    try { history.scrollRestoration = "manual"; } catch {}
    window.scrollTo(0, 0);
    try { history.replaceState(null, "", location.pathname + location.search + "#bauen"); } catch {}
    location.reload();
  }
  /** Höhe der Kopfleiste als CSS-Variable, damit die festklebenden Tabs direkt darunter sitzen (Handy: zwei Zeilen) */
  let topEl: HTMLElement | null = $state(null);
  $effect(() => {
    if (!topEl) return;
    const set = () => document.documentElement.style.setProperty("--top-h", topEl!.offsetHeight + "px");
    set(); const ro = new ResizeObserver(set); ro.observe(topEl);
    return () => ro.disconnect();
  });
</script>

<svelte:window onhashchange={route} />

<div class="shell">
  <header class="top" bind:this={topEl}>
    <a class="brand" href="#bauen" title="Neu laden und nach oben" onclick={reloadTop}>
      <span class="logo" aria-hidden="true"></span><span><b>Mod-Katalog</b> <span class="muted">26.3</span></span>
    </a>
    <nav aria-label="Bereiche">
      {#each NAV as [k, l, x]}
        <a href="#{k}" aria-current={ui.view === k ? "page" : undefined} onclick={() => (ui.view = k)}>{l}{#if x}<span class="long">{x}</span>{/if}</a>
      {/each}
    </nav>
    <button class="btn ghost sm" onclick={() => ui.setTheme(ui.theme === "dark" ? "light" : "dark")} aria-label="Hell/Dunkel umschalten">{ui.theme === "dark" ? "☀" : "☾"}</button>
  </header>

  <main>
    {#if err}<p class="card-surface" style="padding:1rem">Daten konnten nicht geladen werden: {err}</p>
    {:else if !pack.ready}<div class="loading"><span class="spin"></span> Katalog wird geladen …</div>
    {:else if ui.view === "bauen"}<Builder />
    {:else if ui.view === "testen"}<TestView />
    {:else if ui.view === "updates"}<UpdatesView />
    {:else}<Help />{/if}
  </main>
</div>

{#if pack.ready}
  <Detail /><Lightbox /><Wizard /><Conflict /><Tools />
  {#if ui.toast}
    <div class="toast" role="status">{ui.toast.text}{#if ui.toast.undo}<button class="btn sm" onclick={() => { ui.undo(); }}>Rückgängig</button>{/if}</div>
  {/if}
{/if}

<style>
  .shell { max-width: 1480px; margin: 0 auto; padding: 0 clamp(12px, 2.5vw, 28px) 4rem; }
  .top { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 1.25rem; padding: .7rem 0; background: color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
  .brand { display: flex; align-items: center; gap: .6rem; color: var(--fg); text-decoration: none; font-size: 1.02rem; }
  .logo { width: 26px; height: 26px; border-radius: 6px; background:
    linear-gradient(var(--accent) 0 0) 0 0/50% 50% no-repeat, linear-gradient(color-mix(in srgb, var(--accent) 60%, #6b4a2b) 0 0) 100% 100%/50% 50% no-repeat, color-mix(in srgb, var(--accent) 35%, #3b2a1a); image-rendering: pixelated; }
  nav { display: flex; gap: .25rem; flex: 1; overflow-x: auto; }
  nav a { padding: .45rem .8rem; border-radius: 8px; color: var(--muted); text-decoration: none; font-weight: 500; white-space: nowrap; }
  nav a:hover { color: var(--fg); background: var(--surface-2); }
  nav a[aria-current="page"] { color: var(--fg); background: var(--surface); box-shadow: inset 0 0 0 1px var(--line); }
  .loading { display: flex; gap: .7rem; align-items: center; padding: 4rem 0; color: var(--muted); justify-content: center; }
  .spin { width: 18px; height: 18px; border: 2px solid var(--line-2); border-top-color: var(--accent); border-radius: 50%; animation: s 1s linear infinite; }
  @keyframes s { to { transform: rotate(1turn); } }
  .toast { position: fixed; left: 50%; bottom: 1.25rem; transform: translateX(-50%); z-index: 60; display: flex; gap: .8rem; align-items: center; padding: .6rem .6rem .6rem 1rem; border-radius: 12px; background: var(--fg); color: var(--bg); box-shadow: var(--shadow); font-weight: 500; max-width: calc(100vw - 2rem); }
  /* Handy: Navigation in eigener Zeile, alle vier Bereiche sichtbar */
  @media (max-width: 640px) { .top { flex-wrap: wrap; row-gap: .4rem; } nav { order: 3; flex-basis: 100%; justify-content: space-between; } nav a { padding: .4rem .55rem; } .long { display: none; } .brand { flex: 1; } }
  @media (max-width: 1100px) { .toast { bottom: 4.6rem; } }
  .toast :global(.btn) { background: transparent; color: inherit; border-color: color-mix(in srgb, var(--bg) 40%, transparent); }
</style>
