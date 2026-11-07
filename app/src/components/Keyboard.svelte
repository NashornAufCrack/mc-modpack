<script lang="ts">
  import Modal from "./Modal.svelte";
  import { pack } from "../lib/pack.svelte";
  import { ui } from "../lib/ui.svelte";
  import { ROWS, NAV, MOUSE, label, codeToKey, mouseToKey, bindings, keyMap, state as keyState, conflicts, setKey, resetKey, suggestFree, sameMods, type Binding } from "../lib/keys";

  let open = $state(false);
  $effect(() => { open = ui.keys; });
  let sel = $state<string | null>(null);
  let held = $state<string[]>([]);        // gehaltene Modifier (Alt, Strg, Shift, F3)
  let capture = $state<Binding | null>(null);
  let filter = $state<"alle" | "konflikte" | "frei">("alle");
  let modFilter = $state("");
  let q = $state("");
  const list = $derived(bindings());
  const by = $derived(keyMap(list));
  const conf = $derived(conflicts(list));
  const confKeys = $derived(new Set(conf.map(c => c.key)));
  const mods = $derived([...new Set(list.map(b => b.mod))].sort((a, b) => (a === "vanilla" ? -1 : b === "vanilla" ? 1 : pack.name(a).localeCompare(pack.name(b)))));
  const MOD: Record<string, string> = { "left.shift": "shift", "right.shift": "shift", "left.control": "control", "right.control": "control", "left.alt": "alt", "right.alt": "alt", f3: "f3" };
  const heldN = $derived([...new Set(held.map(h => MOD[h] || h))]);
  const vis = (bs: Binding[] | undefined) => (bs || []).filter(b => !modFilter || b.mod === modFilter);
  const rel = (k: string) => vis(by[k]).filter(b => sameMods(b.mods.map(m => MOD[m] || m), heldN));
  const hasCombo = (k: string) => !heldN.length && vis(by[k]).some(b => b.mods.length);
  function st(k: string) { const bs = vis(by[k]); const s = keyState(bs.map(b => ({ ...b, mods: b.mods.map(m => MOD[m] || m) })), heldN); if (filter === "konflikte" && s !== "konflikt") return "dim"; if (filter === "frei" && s !== "frei") return "dim"; return s; }
  const actionName = (b: Binding) => b.id.replace(/^(key|keybind|keybinding)\./, "").replace(/^(debug)\./, "F3 + ").replace(/[._]/g, " ");
  const keyText = (b: Binding) => [...b.mods.map(m => label(m === "f3" ? "f3" : m)), label(b.key)].join(" + ");
  const isMod = $derived(!!sel && !!MOD[sel]);
  const comboList = $derived(heldN.length ? list.filter(b => b.key && sameMods(b.mods.map(m => MOD[m] || m), heldN) && (!modFilter || b.mod === modFilter)) : []);
  const selList = $derived(sel ? (heldN.length && !isMod ? rel(sel) : vis(by[sel])) : []);
  const unbound = $derived(list.filter(b => !b.key && (!modFilter || b.mod === modFilter)));
  const tableRows = $derived(list.filter(b => (!modFilter || b.mod === modFilter) && (!q || (actionName(b) + " " + pack.name(b.mod)).toLowerCase().includes(q.toLowerCase()))));

  function onKeydown(e: KeyboardEvent) {
    if (!ui.keys) return;
    const t = e.target as HTMLElement; if (t.closest("input, select, textarea")) return;
    const k = codeToKey(e.code); if (!k) return;
    if (e.code === "ControlLeft" && e.getModifierState?.("AltGraph")) return; // AltGr-Geisterstrg
    e.preventDefault();
    if (capture) { setKey(capture.id, k); ui.say(`${actionName(capture)} → ${label(k)}`); capture = null; sel = k; return; }
    if (MOD[k] && !held.includes(k)) held = [...held, k];
    sel = k;
  }
  function onKeyup(e: KeyboardEvent) { const k = codeToKey(e.code); if (k && held.includes(k)) held = held.filter(h => h !== k); }
  function onPad(e: MouseEvent) { e.preventDefault(); const k = mouseToKey(e.button); if (!k) return; if (capture) { setKey(capture.id, k); capture = null; } sel = k; }
  function onWheel(e: WheelEvent) { e.preventDefault(); sel = e.deltaY < 0 ? "mouse.wheel.up" : "mouse.wheel.down"; }
  function blockNav(e: MouseEvent) { if (e.button === 3 || e.button === 4) e.preventDefault(); }
  function toggleHeld(k: string) { held = held.includes(k) ? held.filter(h => h !== k) : [...held, k]; }
  function fixAll() { for (const c of conf) { const keep = c.items.find(b => b.mod === "vanilla") || c.items[0]; for (const b of c.items) if (b !== keep) { const k = suggestFree(b); if (k) setKey(b.id, k); } } ui.say("Doppelbelegungen auf freie Tasten verteilt (Vanilla-Tasten bleiben)"); }
  const LEG = [["frei", "frei"], ["einfach", "belegt"], ["mehrfach", "mehrfach, verschiedene Situationen"], ["konflikt", "Konflikt"], ["kombi", "nur als Kombination"]];
</script>

<svelte:window onkeydown={onKeydown} onkeyup={onKeyup} onmouseup={blockNav} />
<Modal bind:open title="Tastenbelegung" width="1320px" onclose={() => { ui.keys = false; held = []; capture = null; }}>
  {#snippet head()}
    {#if conf.length}<button class="btn sm" onclick={fixAll}>{conf.length} Konflikte lösen</button>{:else}<span class="badge ok">keine Konflikte</span>{/if}
  {/snippet}
  <p class="intro muted">Drück eine Taste auf deiner Tastatur oder klick sie an: Rechts siehst du, was damit im Spiel passiert. Halte <span class="kbd">Alt</span>, <span class="kbd">Strg</span>, <span class="kbd">Shift</span> oder <span class="kbd">F3</span>, um alle Kombinationen damit zu sehen. {#if capture}<b class="cap">Drück jetzt die neue Taste für „{actionName(capture)}“ … <button class="btn sm" onclick={() => (capture = null)}>Abbrechen</button></b>{/if}</p>
  <div class="bar">
    <div class="seg" role="group" aria-label="Anzeigen">{#each [["alle", "Alle"], ["konflikte", "Nur Konflikte"], ["frei", "Freie Tasten"]] as [k, l]}<button class="chip" aria-pressed={filter === k} onclick={() => (filter = k as any)}>{l}</button>{/each}</div>
    <select class="field sm" bind:value={modFilter} aria-label="Nur eine Mod"><option value="">Alle Mods ({mods.length})</option>{#each mods as m}<option value={m}>{m === "vanilla" ? "Minecraft" : pack.name(m)}</option>{/each}</select>
    <div class="seg">{#each [["left.control", "Strg"], ["left.shift", "Shift"], ["left.alt", "Alt"], ["f3", "F3"]] as [k, l]}<button class="chip" aria-pressed={held.includes(k)} onclick={() => toggleHeld(k)}>{l} halten</button>{/each}</div>
  </div>
  <div class="layout">
    <div class="boards">
      <div class="kb" class:heldmode={held.length}>
        {#each ROWS as row}
          <div class="row">{#each row as [k, wd]}{#if k}<button class="key {st(k)}" class:cur={sel === k} class:held={held.includes(k)} style="--w:{wd}" onclick={() => (sel = k)} aria-label="{label(k)}: {st(k)}">{label(k)}{#if rel(k).length > 1 && st(k) !== "dim"}<i>{rel(k).length}</i>{/if}{#if hasCombo(k)}<b class="cm" title="Auch als Kombination belegt"></b>{/if}</button>{:else}<span class="gap" style="--w:{wd}"></span>{/if}{/each}</div>
        {/each}
      </div>
      <div class="sub">
        <div class="nav">{#each NAV as row}<div class="row">{#each row as [k, wd]}{#if k}<button class="key {st(k)}" class:cur={sel === k} style="--w:{wd}" onclick={() => (sel = k)}>{label(k)}{#if rel(k).length > 1}<i>{rel(k).length}</i>{/if}</button>{:else}<span class="gap" style="--w:{wd}"></span>{/if}{/each}</div>{/each}</div>
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="mouse" onmousedown={onPad} oncontextmenu={(e) => e.preventDefault()} onwheel={onWheel} title="Hier klicken oder scrollen, um Maustasten zu testen">
          <div class="mtop">
            {#each [["mouse.left", "L"], ["mouse.middle", "●"], ["mouse.right", "R"]] as [k, l]}<button class="mb {st(k)}" class:cur={sel === k} onclick={() => (sel = k)}>{l}{#if vis(by[k]).length > 1}<i>{vis(by[k]).length}</i>{/if}</button>{/each}
          </div>
          <div class="mside">{#each [["mouse.5", "Vor"], ["mouse.4", "Zurück"]] as [k, l]}<button class="mb side {st(k)}" class:cur={sel === k} onclick={() => (sel = k)}>{l}</button>{/each}</div>
          <div class="wheel"><span class:cur={sel === "mouse.wheel.up"}>Rad ↑</span><span class:cur={sel === "mouse.wheel.down"}>Rad ↓</span></div>
          <p class="muted">Hier klicken oder scrollen</p>
        </div>
      </div>
      <div class="legend">{#each LEG as [c, l]}<span><i class="sw {c}"></i>{l}</span>{/each}<span><i class="sw"><b class="cm" style="position:relative;display:inline-block"></b></i>auch als Kombination (Taste halten zum Anzeigen)</span></div>
    </div>
    <aside class="panel">
      {#if sel}
        <h3>{#if heldN.length && !isMod}{heldN.map(h => label(h === "alt" ? "left.alt" : h === "control" ? "left.control" : h === "shift" ? "left.shift" : h)).join(" + ")} + {/if}{label(sel)}</h3>
        {#if sel.startsWith("mouse.wheel")}<p class="muted small">Das Mausrad wechselt im Spiel die Hotbar-Plätze. Mods können es nicht als normale Taste belegen.</p>{/if}
        {#each selList as b (b.id)}
          {@const bad = confKeys.has(sel) && conf.some(c => c.key === sel && c.items.includes(b))}
          <div class="bind" class:bad>
            <div><b>{actionName(b)}</b><small>{b.mod === "vanilla" ? "Minecraft" : pack.name(b.mod)} · {b.ctx === "menu" ? "in Menüs/Inventar" : "im Spiel"} · {keyText(b)}</small></div>
            <div class="acts"><button class="btn sm" onclick={() => (capture = b)}>Ändern</button>{#if (pack.cfg._keys || {})[b.id] !== undefined}<button class="btn sm ghost" onclick={() => resetKey(b.id)} title="Standard: {label(b.def)}">↺</button>{/if}</div>
          </div>
        {:else}<p class="muted">Nicht belegt.</p>{/each}
      {:else}<p class="muted">Taste drücken oder anklicken.</p>{/if}
      {#if heldN.length}
        <h3>Alle Kombinationen mit {heldN.map(h => label(h === "alt" ? "left.alt" : h === "control" ? "left.control" : h === "shift" ? "left.shift" : h)).join(" + ")} <span class="muted">{comboList.length}</span></h3>
        {#each comboList as b (b.id)}<button class="cb" onclick={() => (sel = b.key)}><span class="kbd">{label(b.key)}</span> {actionName(b)} <small class="muted">{b.mod === "vanilla" ? "Minecraft" : pack.name(b.mod)}</small></button>{:else}<p class="muted small">Keine Kombinationen.</p>{/each}
      {/if}
      {#if conf.length}
        <h3>Konflikte</h3>
        {#each conf as c}<button class="cf" onclick={() => (sel = c.key)}><b>{[...c.mods, label(c.key)].join(" + ")}</b> {c.items.map(i => (i.mod === "vanilla" ? "Minecraft" : pack.name(i.mod))).join(" · ")}</button>{/each}
      {/if}
    </aside>
  </div>
  <details class="all"><summary>Alle {list.length} Belegungen als Liste {#if unbound.length}<span class="muted">({unbound.length} nicht belegt)</span>{/if}</summary>
    <input class="field sm" type="search" placeholder="Aktion oder Mod suchen …" bind:value={q} />
    <table><thead><tr><th>Aktion</th><th>Mod</th><th>Taste</th><th></th></tr></thead><tbody>
      {#each tableRows as b (b.id)}<tr class:bad={confKeys.has(b.key)}><td>{actionName(b)}</td><td>{b.mod === "vanilla" ? "Minecraft" : pack.name(b.mod)}</td><td>{b.key ? keyText(b) : "–"}</td><td><button class="btn sm" onclick={() => (capture = b)}>Ändern</button></td></tr>{/each}
    </tbody></table>
  </details>
</Modal>

<style>
  .intro { margin: 0 0 .7rem; font-size: .9rem; } .cap { color: var(--info); display: inline-flex; gap: .5rem; align-items: center; }
  .bar { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin-bottom: .8rem; } .seg { display: flex; gap: .3rem; flex-wrap: wrap; }
  .field.sm { width: auto; min-height: 2rem; padding: .2rem .5rem; font-size: .85rem; }
  .layout { display: grid; grid-template-columns: minmax(0, 1fr) 20rem; gap: 1rem; align-items: start; }
  .boards { min-width: 0; overflow-x: auto; }
  .kb, .nav { display: grid; gap: 4px; --u: clamp(1.9rem, 3.1vw, 2.75rem); }
  .row { display: flex; gap: 4px; }
  .key, .gap { width: calc(var(--u) * var(--w) + 4px * (var(--w) - 1)); height: var(--u); flex: none; }
  .key { position: relative; border-radius: 7px; border: 1px solid var(--line-2); border-bottom-width: 3px; background: var(--surface-2); color: var(--muted); font: 600 .7rem var(--font); cursor: pointer; padding: 0 2px; overflow: hidden; }
  .key i, .mb i { position: absolute; top: 1px; right: 3px; font: 700 .6rem var(--mono); font-style: normal; }
  .einfach { background: var(--accent-soft); color: var(--ok); border-color: color-mix(in srgb, var(--ok) 55%, transparent); }
  .mehrfach { background: repeating-linear-gradient(135deg, var(--accent-soft) 0 6px, var(--info-soft) 6px 12px); color: var(--fg); border-color: var(--info); }
  .konflikt { background: var(--bad-soft); color: var(--bad); border-color: var(--bad); font-weight: 800; }
  .kombi { background: linear-gradient(135deg, transparent 72%, var(--warn) 72%) , var(--surface-2); color: var(--fg); }
  .dim { opacity: .3; }
  .cm { position: absolute; left: 2px; bottom: 2px; width: 0; height: 0; border-left: 7px solid var(--warn); border-top: 7px solid transparent; }
  .cb { display: flex; gap: .4rem; align-items: center; width: 100%; text-align: left; border: 1px solid var(--line); background: var(--surface); color: var(--fg); border-radius: 8px; padding: .3rem .45rem; margin-bottom: .25rem; font: .82rem var(--font); cursor: pointer; text-transform: capitalize; }
  .cur { outline: 2px solid var(--fg); outline-offset: 1px; } .held { box-shadow: inset 0 -3px 0 var(--warn); }
  .sub { display: flex; gap: 1.5rem; margin-top: .8rem; align-items: flex-start; flex-wrap: wrap; }
  .mouse { width: 11rem; padding: .7rem; border: 1px solid var(--line); border-radius: 46% 46% 40% 40% / 30% 30% 55% 55%; background: var(--surface-2); text-align: center; user-select: none; }
  .mtop { display: grid; grid-template-columns: 1fr .55fr 1fr; gap: 4px; }
  .mb { position: relative; height: 3.6rem; border-radius: 10px; border: 1px solid var(--line-2); background: var(--surface); color: var(--muted); font: 600 .75rem var(--font); cursor: pointer; }
  .mside { display: grid; gap: 4px; width: 4.2rem; margin: .4rem 0 0; } .mb.side { height: 1.7rem; font-size: .66rem; }
  .wheel { display: flex; justify-content: center; gap: .4rem; font-size: .7rem; margin: .4rem 0; } .wheel span { padding: .1rem .35rem; border-radius: 5px; border: 1px solid var(--line); }
  .mouse p { font-size: .68rem; margin: .3rem 0 0; }
  .legend { display: flex; flex-wrap: wrap; gap: .4rem 1rem; margin-top: .8rem; font-size: .8rem; color: var(--muted); }
  .legend span { display: flex; gap: .35rem; align-items: center; } .legend .sw { display: inline-block; width: 1rem; height: 1rem; border-radius: 4px; border: 1px solid var(--line-2); }
  .legend .sw.frei { background: var(--surface-2); }
  .panel { border: 1px solid var(--line); border-radius: 12px; padding: .8rem; background: var(--surface-2); position: sticky; top: 0; max-height: 70vh; overflow: auto; }
  h3 { margin: 0 0 .5rem; font-size: 1.05rem; } .panel h3:not(:first-child) { margin-top: 1rem; }
  .bind { display: flex; justify-content: space-between; gap: .5rem; align-items: center; padding: .45rem .5rem; border-radius: 8px; border: 1px solid var(--line); background: var(--surface); margin-bottom: .35rem; }
  .bind.bad { border-color: var(--bad); background: var(--bad-soft); }
  .bind b { display: block; font-size: .86rem; font-weight: 600; text-transform: capitalize; } .bind small { color: var(--muted); font-size: .74rem; }
  .acts { display: flex; gap: .2rem; flex: none; }
  .cf { display: block; width: 100%; text-align: left; border: 1px solid var(--bad); background: var(--bad-soft); color: var(--fg); border-radius: 8px; padding: .35rem .5rem; margin-bottom: .3rem; font: .8rem var(--font); cursor: pointer; }
  .small { font-size: .8rem; }
  .all { margin-top: 1.2rem; } .all summary { cursor: pointer; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: .84rem; margin-top: .5rem; } th, td { text-align: left; padding: .35rem .4rem; border-bottom: 1px solid var(--line); } td:first-child { text-transform: capitalize; } tr.bad td { color: var(--bad); }
  @media (max-width: 1000px) { .layout { grid-template-columns: minmax(0, 1fr); } .panel { position: static; max-height: none; } }
</style>
