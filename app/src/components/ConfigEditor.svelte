<script lang="ts">
  import { pack } from "../lib/pack.svelte";
  import { SETDEF, BASE } from "../lib/const";
  let { slug }: { slug: string } = $props();
  const def: any = $derived(slug === "_base" ? BASE : (SETDEF as any)[slug]);
  const files = $derived(slug === "_base" ? [] : pack.data.x.cfgs[slug] || []);
  const rpo = $derived(slug === "_base" ? null : pack.data.x.rpo[slug]);
  let q = $state(""); let onlyChanged = $state(false);
  const id = (f: string, k: string) => "@" + f + "|" + k;
  const cur = (f: string, i: any) => { const c = pack.cfg[slug] || {}; const k = id(f, i.k); if (k in c) return c[k]; const a = pack.autoVal(slug, f, i.k); return a ? a.v : i.d; };
  function setG(f: string, i: any, raw: any) { const v = i.t === "bool" ? !!raw : i.t === "num" ? Number(String(raw).replace(",", ".")) : raw; pack.cfg = { ...pack.cfg, [slug]: { ...(pack.cfg[slug] || {}), [id(f, i.k)]: v } }; pack.save(); }
  function resetG(f: string, k: string) { const c = { ...(pack.cfg[slug] || {}) }; delete c[id(f, k)]; pack.cfg = { ...pack.cfg, [slug]: c }; pack.save(); }
  const pretty = (k: string) => k.split(".").pop()!.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^./, c => c.toUpperCase());
  const rpoFlat = $derived.by(() => { const out: [string, any][] = []; if (!rpo) return out; (function walk(o: any, p: string) { for (const [k, v] of Object.entries(o)) { if (v && typeof v === "object") walk(v, p + k + "."); else out.push([p + k, v]); } })(rpo.data, ""); return out; });
  const total = $derived(files.reduce((a, f) => a + f.items.length, 0) + (def?.items.length || 0) + rpoFlat.length);
</script>

{#if def || files.length || rpo}
  <section class="cfg">
    <div class="head">
      <h3>Einstellungen <span class="muted">{total}</span></h3>
      {#if files.length}<input class="field sm" type="search" placeholder="Einstellung suchen …" bind:value={q} /><label class="chk"><input type="checkbox" bind:checked={onlyChanged} /> nur geänderte</label>{/if}
    </div>
    {#if def}
      <div class="group"><h4>{slug === "_base" ? "Minecraft" : "Wichtigste"}</h4>
        {#each def.items as i}
          {@const v = pack.cv(slug, i.k)}
          <div class="row">
            <div class="lbl"><b>{i.l}</b><small>{i.h}</small></div>
            <div class="ctl">
              {#if i.t === "bool"}<input type="checkbox" class="sw" checked={!!v} onchange={(e) => pack.setCv(slug, i.k, e.currentTarget.checked)} />
              {:else if i.t === "sel"}<select class="field sm" value={String(v)} onchange={(e) => pack.setCv(slug, i.k, isNaN(Number(e.currentTarget.value)) ? e.currentTarget.value : Number(e.currentTarget.value))}>{#each i.o as o, n}<option value={String(o)}>{i.ol ? i.ol[n] : o}</option>{/each}</select>
              {:else}<input type="range" min={i.min} max={i.max} step={i.step} value={v} oninput={(e) => pack.setCv(slug, i.k, Number(e.currentTarget.value))} /><output>{Number(v).toFixed(2)}</output>{/if}
              {#if String(v) !== String(i.d)}<button class="btn sm ghost" onclick={() => pack.resetCv(slug, i.k)} title="Standard">↺</button>{/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
    {#each files as f}
      {@const list = f.items.filter(i => (!q || (i.k + " " + (i.h || "")).toLowerCase().includes(q.toLowerCase())) && (!onlyChanged || id(f.file, i.k) in (pack.cfg[slug] || {})))}
      {#if list.length}
        <details class="group" open={!!q || onlyChanged || files.length === 1 && f.items.length < 25}>
          <summary><h4>Datei <code>{f.file}</code> <span class="muted">{f.items.length}</span></h4></summary>
          {#each list as i (i.k)}
            {@const v = cur(f.file, i)}{@const ch = id(f.file, i.k) in (pack.cfg[slug] || {})}{@const a = pack.autoVal(slug, f.file, i.k)}
            <div class="row" class:ch>
              <div class="lbl"><b>{pretty(i.k)}</b><code class="k">{i.k}</code>{#if i.h}<small>{i.h}</small>{/if}{#if a && !ch}<small class="auto">Automatisch angepasst: {a.text}</small>{/if}</div>
              <div class="ctl">
                {#if i.t === "bool"}<input type="checkbox" class="sw" checked={!!v} onchange={(e) => setG(f.file, i, e.currentTarget.checked)} />
                {:else if i.o}<select class="field sm" value={String(v)} onchange={(e) => setG(f.file, i, e.currentTarget.value)}>{#each i.o as o}<option>{o}</option>{/each}</select>
                {:else}<input class="field sm" value={String(v)} inputmode={i.t === "num" ? "decimal" : "text"} onchange={(e) => setG(f.file, i, e.currentTarget.value)} />{/if}
                {#if ch}<button class="btn sm ghost" onclick={() => resetG(f.file, i.k)} title="Standard: {String(i.d)}">↺</button>{/if}
              </div>
            </div>
          {/each}
        </details>
      {/if}
    {/each}
    {#if rpoFlat.length}
      <details class="group"><summary><h4>Pack-Optionen (Respackopts) <span class="muted">{rpoFlat.length}</span></h4></summary>
        {#each rpoFlat as [k, d]}
          {@const v = (pack.cfg[slug] || {})["@rpo|" + k] ?? d}
          <div class="row"><div class="lbl"><b>{k.split(".").map(pretty).join(" › ")}</b></div>
            <div class="ctl">{#if typeof d === "boolean"}<input type="checkbox" class="sw" checked={!!v} onchange={(e) => { pack.cfg = { ...pack.cfg, [slug]: { ...(pack.cfg[slug] || {}), ["@rpo|" + k]: e.currentTarget.checked } }; pack.save(); }} />
            {:else}<input class="field sm" value={String(v)} onchange={(e) => { const x = e.currentTarget.value; pack.cfg = { ...pack.cfg, [slug]: { ...(pack.cfg[slug] || {}), ["@rpo|" + k]: isNaN(Number(x)) ? x : Number(x) } }; pack.save(); }} />{/if}</div></div>
        {/each}
      </details>
    {/if}
    <p class="small muted">Werte stammen aus den echten Config-Dateien dieser Versionen. Geänderte Werte landen beim Export im Pack.</p>
  </section>
{:else if slug !== "_base"}
  <p class="small muted" style="margin-top:1.2rem">Für diesen Eintrag sind noch keine Einstellungen erfasst. Kommt mit dem automatischen Config-Auslesen.</p>
{/if}

<style>
  .cfg { margin-top: 1.4rem; }
  .head { display: flex; gap: .6rem; align-items: center; flex-wrap: wrap; margin-bottom: .4rem; }
  h3 { font-size: .8rem; text-transform: uppercase; letter-spacing: .07em; margin: 0; flex: 1; }
  h4 { display: inline; font-size: .9rem; margin: 0; font-weight: 600; }
  .field.sm { min-height: 2rem; padding: .25rem .55rem; width: auto; max-width: 14rem; font-size: .85rem; }
  .chk { display: flex; gap: .35rem; align-items: center; font-size: .82rem; }
  .group { border: 1px solid var(--line); border-radius: 10px; padding: .55rem .75rem; margin: .5rem 0; background: var(--surface-2); }
  summary { cursor: pointer; padding: .2rem 0; }
  .row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 1rem; align-items: center; padding: .5rem 0; border-top: 1px solid var(--line); }
  .row.ch { background: linear-gradient(90deg, var(--accent-soft), transparent); }
  .lbl { display: flex; flex-direction: column; min-width: 0; } .lbl b { font-weight: 550; font-size: .9rem; }
  .lbl small { color: var(--muted); font-size: .78rem; } .lbl small.auto { color: var(--info); }
  .k { font: .7rem var(--mono); color: var(--muted); overflow-wrap: anywhere; }
  .ctl { display: flex; gap: .3rem; align-items: center; }
  .sw { width: 2.4rem; height: 1.3rem; appearance: none; border-radius: 999px; background: var(--line-2); position: relative; cursor: pointer; transition: background .15s; }
  .sw::after { content: ""; position: absolute; top: 2px; left: 2px; width: calc(1.3rem - 4px); height: calc(1.3rem - 4px); border-radius: 50%; background: #fff; transition: transform .15s; }
  .sw:checked { background: var(--accent); } .sw:checked::after { transform: translateX(1.1rem); }
  output { font: .78rem var(--mono); min-width: 2.6rem; }
  .small { font-size: .8rem; }
</style>
