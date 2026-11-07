<script lang="ts">
  import { onMount } from "svelte";
  import { loadData } from "./lib/data";
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
    try { const { data, media } = await loadData(); pack.init(data, media); } catch (e) { err = String(e); }
    const v = location.hash.slice(1); if (v === "testen" || v === "hilfe" || v === "updates") ui.view = v;
  });
  const NAV = [["bauen", "Pack bauen"], ["testen", "Testen"], ["updates", "Updates"], ["hilfe", "Hilfe & Glossar"]] as const;
</script>

<div class="shell">
  <header class="top">
    <a class="brand" href="#bauen" onclick={() => (ui.view = "bauen")}>
      <span class="logo" aria-hidden="true"></span><span><b>Mod-Katalog</b> <span class="muted">26.3</span></span>
    </a>
    <nav aria-label="Bereiche">
      {#each NAV as [k, l]}
        <a href="#{k}" aria-current={ui.view === k ? "page" : undefined} onclick={() => (ui.view = k)}>{l}</a>
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
    <div class="toast" role="status">{ui.toast.text}{#if ui.toast.undo}<button class="btn sm" onclick={() => { pack.undo(); ui.toast = null; }}>Rückgängig</button>{/if}</div>
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
  .toast :global(.btn) { background: transparent; color: inherit; border-color: color-mix(in srgb, var(--bg) 40%, transparent); }
</style>
