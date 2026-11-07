<script lang="ts">
  import { pack, PRESETS } from "../lib/pack.svelte";
  import { ui } from "../lib/ui.svelte";
  import { conflicts } from "../lib/keys";
  import { exportMrpack, exportPrism } from "../lib/export";

  const r = $derived(pack.resolve());
  const cnt = (t: string) => [...r.mods].filter(s => (pack.BY[s].pt || "m") === t).length;
  const load = $derived(pack.load_());
  const size = $derived([...r.mods, ...r.libs].reduce((a, s) => a + (pack.data.files[s]?.[4] || 0), 0));
  const red = $derived([...r.mods].filter(s => pack.BY[s].ampel === "R" && pack.BY[s].cat !== "S"));
  const probs = $derived(pack.problems());
  const kc = $derived(conflicts().length);
  const diff = $derived(pack.presetDiff());
  const pname = $derived(PRESETS.find(p => p.id === pack.preset?.id)?.name);
  const open = $derived(pack.data.dec.gruppen.filter(g => g.mods.some(s => pack.BY[s]) && !g.mods.some(s => pack.sel.has(s))).length);
  let name = $state(pack.cfg._name || "Mein Pack"); let withCfg = $state(true); let st = $state(""); let busy = $state(false);
  let showDiff = $state(false);
  async function go(kind: "prism" | "mrpack" | "server") {
    if (probs.length) { st = `Erst die ${probs.length} Konflikte klären. Im fertigen Pack darf nichts doppelt sein.`; return; }
    busy = true; pack.cfg = { ...pack.cfg, _name: name }; pack.save();
    try { kind === "prism" ? await exportPrism(name, withCfg, t => (st = t)) : await exportMrpack(name, kind === "server", withCfg, t => (st = t)); }
    catch (e) { st = "Fehler beim Export: " + e; } busy = false;
  }
  function share() { const u = pack.shareUrl(); navigator.clipboard?.writeText(u).then(() => ui.say("Link kopiert"), () => ui.say(u)); }
  let armed = $state(false);
  function reset() { if (!armed) { armed = true; setTimeout(() => (armed = false), 4000); return; } pack.resetAll(); armed = false; ui.say("Alles zurückgesetzt"); }
</script>

<aside class="bar" aria-label="Dein Pack">
  {#if pack.preset}
    <div class="presetbox">
      <div class="ph"><span class="badge preset">Vorlage</span><b>{pname}</b></div>
      {#if diff && (diff.plus.length || diff.minus.length)}
        <button class="link" onclick={() => (showDiff = !showDiff)}>+{diff.plus.length} von dir · −{diff.minus.length} entfernt {showDiff ? "▴" : "▾"}</button>
        {#if showDiff}<ul class="diff">{#each diff.plus as s}<li class="p">+ {pack.name(s)}</li>{/each}{#each diff.minus as s}<li class="m">− {pack.name(s)}</li>{/each}</ul>{/if}
        <button class="btn sm" onclick={() => pack.applyPreset(pack.preset!.id)}>Zurück auf Vorlage</button>
      {:else}<span class="muted small">unverändert</span>{/if}
    </div>
  {/if}
  <h2>Dein Pack</h2>
  <div class="stats">
    <div><b>{cnt("m")}</b><span>Mods</span></div><div><b>{cnt("r")}</b><span>Packs</span></div><div><b>{cnt("s")}</b><span>Shader</span></div><div><b>{r.libs.size}</b><span>Bibliotheken</span></div>
  </div>
  <div class="meter"><span>Leistungsbedarf</span><div class="track"><i class={load.t} style="width:{Math.min(100, (load.c / 45) * 100)}%"></i></div><b class={load.t}>{load.l}</b></div>
  <p class="small muted">{(size / 1048576).toFixed(0)} MB · {pack.ramGB(r)} GB Arbeitsspeicher · MC 26.3 Fabric</p>
  <p class="state {red.length ? 'bad' : 'ok'}">{red.length ? `${red.length} Mods brauchen einen eigenen Server` : "Läuft auf jedem Vanilla-Server"}</p>
  {#if probs.length}
    <div class="warnbox"><b>{probs.length} Konflikte</b>
      {#each probs as p}<div class="prob"><span>{pack.name(p.a)} + {pack.name(p.b)}</span><button class="btn sm" onclick={() => { pack.set(p.b, false); ui.pick(p.b, true); }}>Klären</button></div>{/each}
    </div>
  {:else}<p class="state ok">Keine Konflikte, keine Doppelungen</p>{/if}
  {#if open}<p class="small muted">{open} Entscheidungen noch offen (optional)</p>{/if}
  <div class="tools">
    <button class="btn sm" onclick={() => (ui.keys = true)}>⌨ Tasten{#if kc}<span class="badge bad">{kc}</span>{/if}</button>
    <button class="btn sm" onclick={() => (ui.tool = "rp")}>Pack-Reihenfolge</button>
    <button class="btn sm" onclick={() => (ui.tool = "base")}>Grundeinstellungen</button>
  </div>
  <label class="lbl">Name<input class="field" bind:value={name} /></label>
  <label class="chk"><input type="checkbox" bind:checked={withCfg} /> Einstellungen und Tasten beilegen</label>
  <button class="btn primary big" disabled={busy} onclick={() => go("prism")}>Für Prism herunterladen</button>
  <div class="two"><button class="btn sm" disabled={busy} onclick={() => go("mrpack")}>.mrpack (Modrinth App)</button><button class="btn sm" disabled={busy} onclick={() => go("server")}>Server-Pack</button></div>
  {#if st}<p class="small" role="status">{st}</p>{/if}
  <div class="two"><button class="btn sm ghost" onclick={share}>Teilen-Link</button><button class="btn sm ghost" onclick={() => pack.undo()}>↶ Rückgängig</button></div>
  <button class="btn sm ghost danger" onclick={reset}>{armed ? "Wirklich alles löschen? Nochmal klicken" : "Alles zurücksetzen"}</button>
</aside>

<style>
  .bar { position: sticky; top: 4.4rem; max-height: calc(100vh - 5.2rem); overflow: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: .65rem; padding: 1rem; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); margin-top: .4rem; }
  h2 { margin: 0; font-size: 1.1rem; }
  .presetbox { border: 1px solid var(--preset); background: var(--preset-soft); border-radius: 10px; padding: .6rem .7rem; display: flex; flex-direction: column; gap: .35rem; align-items: flex-start; }
  .ph { display: flex; gap: .5rem; align-items: center; }
  .link { background: none; border: 0; padding: 0; color: var(--preset); font: 500 .84rem var(--font); cursor: pointer; }
  .diff { list-style: none; margin: 0; padding: 0; font-size: .8rem; max-height: 9rem; overflow: auto; width: 100%; } .diff .p { color: var(--ok); } .diff .m { color: var(--bad); text-decoration: line-through; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); text-align: center; }
  .stats b { display: block; font: 600 1.4rem var(--mono); } .stats span { font-size: .72rem; color: var(--muted); }
  .meter { display: grid; grid-template-columns: auto 1fr auto; gap: .5rem; align-items: center; font-size: .82rem; }
  .track { height: .45rem; border-radius: 9px; background: var(--bg-2); overflow: hidden; } .track i { display: block; height: 100%; border-radius: 9px; }
  i.ok { background: var(--ok); } i.warn { background: var(--warn); } i.bad { background: var(--bad); }
  b.ok { color: var(--ok); } b.warn { color: var(--warn); } b.bad { color: var(--bad); }
  .small { font-size: .8rem; margin: 0; }
  .state { margin: 0; padding: .45rem .6rem; border-radius: 8px; font-size: .84rem; font-weight: 500; }
  .state.ok { background: var(--accent-soft); color: var(--ok); } .state.bad { background: var(--bad-soft); color: var(--bad); }
  .warnbox { border: 1px solid var(--bad); background: var(--bad-soft); border-radius: 10px; padding: .55rem .65rem; display: grid; gap: .35rem; font-size: .84rem; }
  .prob { display: flex; justify-content: space-between; gap: .5rem; align-items: center; }
  .tools, .two { display: flex; gap: .4rem; flex-wrap: wrap; } .two > * { flex: 1; }
  .lbl { display: grid; gap: .25rem; font-size: .8rem; color: var(--muted); }
  .chk { display: flex; gap: .45rem; align-items: center; font-size: .85rem; }
  .big { min-height: 2.8rem; font-size: 1rem; }
  .danger { color: var(--bad); }
  @media (max-width: 1100px) { .bar { position: static; max-height: none; } }
</style>
