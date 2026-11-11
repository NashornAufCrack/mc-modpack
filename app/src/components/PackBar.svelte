<script lang="ts">
  import { pack, PRESETS } from "../lib/pack.svelte";
  import { ui } from "../lib/ui.svelte";
  import { exportMrpack, exportPackwiz, exportPrism, exportSet, manualList, startCheck } from "../lib/export";
  import { AUTO_RULES, type AutoMode } from "../lib/auto-cfg";
  import { headlessTester } from "../lib/headless-test.svelte";

  const r = $derived(pack.resolve());
  const cnt = (t: string) => [...r.mods].filter(s => (pack.BY[s].pt || "m") === t).length;
  const load = $derived(pack.load_());
  const size = $derived([...r.mods, ...r.libs].reduce((a, s) => a + (pack.data.files[s]?.[4] || 0), 0));
  const red = $derived([...r.mods].filter(s => pack.BY[s].ampel === "R" && pack.BY[s].cat !== "S"));
  const probs = $derived(pack.problems());
  const tips = $derived(pack.tips(r));
  const autos = $derived(pack.autos(r));
  const manual = $derived((pack.sel, manualList()));
  const diff = $derived(pack.presetDiff());
  const pname = $derived(PRESETS.find(p => p.id === pack.preset?.id)?.name);
  const open = $derived(pack.data.dec.gruppen.filter(g => g.mods.some(s => pack.BY[s]) && !g.mods.some(s => pack.sel.has(s))).length);
  const srvList = $derived(pack.srvTools(r));
  const inSrv = $derived((pack.cfg, new Set(exportSet(true).all)));
  const srvCount = $derived(srvList.filter(m => inSrv.has(m.slug)).length);
  const isCustom = $derived(!pack.preset || (diff && (diff.plus.length > 0 || diff.minus.length > 0)));
  const selectedMods = $derived([...r.mods]);
  const selectedRps = $derived([...r.mods].filter(s => pack.BY[s]?.pt === "r"));
  const isTested = $derived(!isCustom || headlessTester.isTested(selectedMods, selectedRps));
  let name = $state(pack.cfg._name || "Mein Pack"); let st = $state(""); let busy = $state(false);
  let showDiff = $state(false);
  // Start-Check: läuft bei jeder Änderung der Auswahl/Einstellungen und nochmal direkt vor dem Export
  const check = $derived((pack.sel, pack.cfg, startCheck()));
  let force = $state(false);
  const altName = (id: string) => { const r = AUTO_RULES.find(x => x.id === id); return r?.alt ? pack.name(r.alt.slug) : ""; };
  async function go(kind: "prism" | "mrpack" | "server" | "packwiz") {
    if (probs.length) { st = `Erst die ${probs.length} Konflikte klären. Im fertigen Pack darf nichts doppelt sein.`; return; }
    const c = startCheck();
    if (!c.ok && !force) { force = true; setTimeout(() => (force = false), 8000); st = `Start-Check: ${c.errors.length} Problem(e) gefunden (siehe Kasten oben). Nochmal klicken, um trotzdem zu exportieren.`; return; }
    force = false;
    busy = true; pack.cfg = { ...pack.cfg, _name: name }; pack.save();
    try { kind === "prism" ? await exportPrism(name, t => (st = t)) : kind === "packwiz" ? await exportPackwiz(name, t => (st = t)) : await exportMrpack(name, kind === "server", t => (st = t)); }
    catch (e) { st = "Fehler beim Export: " + e; } busy = false;
  }
  function share() { const u = pack.shareUrl(); navigator.clipboard?.writeText(u).then(() => ui.say("Link kopiert"), () => ui.say(u)); }
  let armed = $state(false);
  function reset() { if (!armed) { armed = true; setTimeout(() => (armed = false), 4000); return; } pack.resetAll(); armed = false; ui.say("Alles zurückgesetzt"); }
</script>

<aside class="bar" id="pack" tabindex="-1" aria-label="Dein Pack">
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
    <div><b>{cnt("m")}</b><span>Mods</span></div><div><b>{cnt("r")}</b><span>Packs</span></div><div><b>{cnt("s")}</b><span>Shader</span></div>{#if cnt("d")}<div><b>{cnt("d")}</b><span>Datapacks</span></div>{/if}<div><b>{r.libs.size}</b><span>Bibliotheken</span></div>
  </div>
  {#if r.libs.size}<details class="libs"><summary>{r.libs.size} Bibliotheken kommen automatisch mit</summary><p>Hilfs-Mods, die andere Mods zum Laufen brauchen. Du musst nichts tun.</p><ul>{#each [...r.libs].sort() as l}<li>{pack.BY[l]?.name || pack.data.files[l]?.[7] || l}</li>{/each}</ul></details>{/if}
  <div class="meter"><span>Leistungsbedarf</span><div class="track"><i class={load.t} style="width:{Math.min(100, (load.c / 45) * 100)}%"></i></div><b class={load.t}>{load.l}</b></div>
  <p class="small muted">{(size / 1048576).toFixed(0)} MB · {pack.ramGB(r)} GB Arbeitsspeicher · MC 26.3 Fabric</p>
  <p class="state {red.length ? 'bad' : 'ok'}">{red.length ? `${red.length} Mods brauchen einen eigenen Server` : "Läuft auf jedem Vanilla-Server"}</p>
  {#if probs.length}
    <div class="warnbox"><b>{probs.length} {probs.length === 1 ? 'Konflikt' : 'Konflikte'} gefunden</b>
      <span class="small">Lösungen und Konsequenzen werden direkt im Start-Check unten angeboten.</span>
    </div>
  {:else}<p class="state ok">Keine Konflikte, keine Doppelungen</p>{/if}
  {#if check.ok}
    <div class="start-check-box ok">
      <div class="sc-head">
        <span class="sc-icon">🛡️</span>
        <div class="sc-title-col">
          <b class="sc-title">Start-Sicherheit: Bestanden</b>
          <div class="small sc-subtitle">Dein Pack ist startfähig (Absturz-Check vor dem Export)</div>
        </div>
      </div>
      <ul class="sc-list small">
        <li>✓ {check.checkedFiles} Dateien mit SHA-Prüfsumme verifiziert</li>
        <li>✓ {check.checkedDeps} Abhängigkeiten lückenlos aufgelöst</li>
        <li>✓ Keine inkompatiblen Mod-Kollisionen</li>
        <li>✓ {check.total} Konfigurationen syntaktisch fehlerfrei</li>
      </ul>
    </div>
  {:else}
    <div class="start-check-box bad">
      <div class="sc-head">
        <span class="sc-icon">⚠️</span>
        <div class="sc-title-col">
          <b class="sc-title">Start-Check: {check.issues && check.issues.length ? check.issues.length : check.errors.length} {((check.issues && check.issues.length) || check.errors.length) === 1 ? 'Absturz-Gefahr' : 'Absturz-Gefahren'}</b>
          <div class="small sc-subtitle">Dieses Pack würde beim Starten abstürzen! Wähle eine Lösung:</div>
        </div>
      </div>

      {#if check.issues && check.issues.length}
        <div class="issue-list">
          {#each check.issues as iss (iss.id)}
            <div class="issue-card">
              <div class="issue-header">
                <span class="badge {iss.type === 'break' ? 'bad' : iss.type === 'missing_dep' ? 'warn' : 'bad'}">
                  {iss.type === 'break' ? 'Inkompatibel' : iss.type === 'missing_dep' ? 'Abhängigkeit fehlt' : iss.type === 'mc_incompatible' ? 'Minecraft-Version' : 'Konflikt'}
                </span>
                <b>{iss.title}</b>
              </div>
              <p class="issue-detail">{iss.detail}</p>

              <div class="issue-actions">
                {#if iss.type === "mc_incompatible" && iss.modA}
                  {#if !iss.isLockedA}
                    <div class="solution-choice">
                      <button class="btn sm danger solution-btn" onclick={() => pack.removeWithCascade(iss.modA!)}>
                        „{pack.name(iss.modA)}“ entfernen
                      </button>
                      <div class="consequence">
                        {#if iss.cascadeA && iss.cascadeA.length}
                          Folge: Deaktiviert auch {iss.cascadeA.map(s => pack.name(s)).join(", ")}.
                        {:else}
                          Folge: {pack.name(iss.modA)} wird aus dem Pack genommen.
                        {/if}
                      </div>
                    </div>
                  {:else}
                    <span class="badge warn small">Pflichtmod kann nicht entfernt werden.</span>
                  {/if}

                {:else if iss.type === "missing_dep" && iss.modA && iss.modB}
                  <div class="solution-options">
                    {#if iss.canAddB}
                      <div class="solution-choice">
                        <button class="btn sm primary solution-btn" onclick={() => pack.set(iss.modB!, true)}>
                          + „{pack.name(iss.modB)}“ hinzufügen
                        </button>
                        <div class="consequence">Empfohlen: Installiert die benötigte Voraussetzung.</div>
                      </div>
                    {/if}
                    {#if !iss.isLockedA}
                      <div class="solution-choice">
                        <button class="btn sm danger solution-btn" onclick={() => pack.removeWithCascade(iss.modA!)}>
                          „{pack.name(iss.modA)}“ entfernen
                        </button>
                        <div class="consequence">
                          {#if iss.cascadeA && iss.cascadeA.length}
                            Folge: Deaktiviert auch {iss.cascadeA.map(s => pack.name(s)).join(", ")}.
                          {:else}
                            Folge: {pack.name(iss.modA)} wird nicht geladen.
                          {/if}
                        </div>
                      </div>
                    {/if}
                  </div>

                {:else if iss.modA && iss.modB}
                  <!-- Fall 1: Mod A ist Pflichtmod -->
                  {#if iss.isLockedA && !iss.isLockedB}
                    <div class="locked-note">
                      <span class="badge locked-badge">Pflicht</span>
                      <span class="locked-text"><b>{pack.name(iss.modA)}</b> ist im Pflicht-Leistungspaket unverzichtbar.</span>
                    </div>
                    <div class="solution-choice">
                      <button class="btn sm danger solution-btn" onclick={() => pack.removeWithCascade(iss.modB!)}>
                        „{pack.name(iss.modB)}“ entfernen (Konflikt lösen)
                      </button>
                      <div class="consequence">
                        {#if iss.cascadeB && iss.cascadeB.length}
                          Folge: Deaktiviert zusätzlich {iss.cascadeB.map(s => pack.name(s)).join(", ")}.
                        {:else}
                          Folge: Nur {pack.name(iss.modB)} wird aus dem Pack genommen.
                        {/if}
                      </div>
                    </div>

                  <!-- Fall 2: Mod B ist Pflichtmod -->
                  {:else if iss.isLockedB && !iss.isLockedA}
                    <div class="locked-note">
                      <span class="badge locked-badge">Pflicht</span>
                      <span class="locked-text"><b>{pack.name(iss.modB)}</b> ist im Pflicht-Leistungspaket unverzichtbar.</span>
                    </div>
                    <div class="solution-choice">
                      <button class="btn sm danger solution-btn" onclick={() => pack.removeWithCascade(iss.modA!)}>
                        „{pack.name(iss.modA)}“ entfernen (Konflikt lösen)
                      </button>
                      <div class="consequence">
                        {#if iss.cascadeA && iss.cascadeA.length}
                          Folge: Deaktiviert zusätzlich {iss.cascadeA.map(s => pack.name(s)).join(", ")}.
                        {:else}
                          Folge: Nur {pack.name(iss.modA)} wird aus dem Pack genommen.
                        {/if}
                      </div>
                    </div>

                  <!-- Fall 3: Beide optional - Nutzer wählt selbst! -->
                  {:else if !iss.isLockedA && !iss.isLockedB}
                    <div class="choice-title"><b>Lösung wählen:</b> Welchen Mod möchtest du behalten?</div>
                    <div class="solution-options">
                      <div class="solution-choice">
                        <button class="btn sm solution-btn" onclick={() => pack.removeWithCascade(iss.modB!)}>
                          „{pack.name(iss.modA)}“ behalten
                        </button>
                        <div class="consequence">
                          <b>Entfernt:</b> {pack.name(iss.modB)}
                          {#if iss.cascadeB && iss.cascadeB.length}
                            <br /><span>Zieht ab: {iss.cascadeB.map(s => pack.name(s)).join(", ")}</span>
                          {/if}
                        </div>
                      </div>
                      <div class="solution-choice">
                        <button class="btn sm solution-btn" onclick={() => pack.removeWithCascade(iss.modA!)}>
                          „{pack.name(iss.modB)}“ behalten
                        </button>
                        <div class="consequence">
                          <b>Entfernt:</b> {pack.name(iss.modA)}
                          {#if iss.cascadeA && iss.cascadeA.length}
                            <br /><span>Zieht ab: {iss.cascadeA.map(s => pack.name(s)).join(", ")}</span>
                          {/if}
                        </div>
                      </div>
                    </div>
                  {/if}
                {:else}
                  <div class="err-fallback">{iss.detail}</div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <ul class="errs">{#each check.errors.slice(0, 8) as e}<li>{e}</li>{/each}</ul>
        {#if check.errors.length > 8}<span class="small">… und {check.errors.length - 8} weitere</span>{/if}
      {/if}
    </div>
  {/if}
  {#if autos.length}
    <details class="autobox"><summary><b>{autos.length} {autos.length === 1 ? "Teil-Überschneidung" : "Teil-Überschneidungen"} – du entscheidest</b></summary>
      <p class="small muted">Beide Mods werden geladen. Pro Fall kannst du wählen, welcher den doppelten Effekt übernimmt, oder beide anlassen (kann doppelte Partikel/Anzeigen geben, stürzt aber nicht ab).</p>
      <ul>{#each autos as a (a.id)}
        <li><b>{[a.slug, ...a.partners].map(x => pack.name(x)).join(" + ")}:</b> {a.text}
          <select class="field sm" aria-label="Wer übernimmt den Effekt?" value={a.mode} onchange={e => pack.setAutoChoice(a.id, e.currentTarget.value as AutoMode)}>
            <option value="std">Empfohlen (automatisch)</option>
            {#if a.hasAlt}<option value="alt">Umgekehrt: {altName(a.id)} gibt ab</option>{/if}
            {#if a.canOff}<option value="off">Beide anlassen</option>{/if}
          </select>
        </li>{/each}</ul>
      <p class="small muted">Die Wahl wird beim Export direkt in die Config-Dateien geschrieben.</p>
    </details>
  {/if}
  {#if tips.length}
    <details class="tipbox"><summary><b>{tips.length} {tips.length === 1 ? "Tipp" : "Tipps"} zu deiner Auswahl</b></summary>
      <ul>{#each tips as t}<li><b>{t.mods.map(x => pack.name(x)).join(" + ")}:</b> {t.text}</li>{/each}</ul>
      <p class="small muted">Steht auch in der LIES-MICH.txt im exportierten Pack.</p>
    </details>
  {/if}
  {#if open}<p class="small muted">{open} Entscheidungen noch offen (optional)</p>{/if}
  <div class="tools">
    <button class="btn sm" onclick={() => (ui.tool = "rp")}>Pack-Reihenfolge</button>
  </div>
  <p class="ram"><b>Arbeitsspeicher: {pack.ramGB(r)} GB</b> · Prism stellt ihn automatisch ein. In der Modrinth App musst du ihn nach dem Import selbst setzen (Instanz › Einstellungen › Java), sonst stürzt das Spiel beim Start ab. <a href="#crash" onclick={() => (ui.view = "crash")} style="display:inline-block; margin-top:.25rem; color:inherit; text-decoration:underline">Spiel stürzt ab? Zur Absturz-Hilfe →</a></p>

  {#if isCustom}
    <div class="test-panel">
      <div class="tp-head">
        <span class="tp-icon">🧪</span>
        <div class="tp-title-col">
          <b>Headless-Stresstest (Cloud)</b>
          <span class="badge {isTested ? 'ok' : headlessTester.isBusy ? 'info' : 'warn'}">
            {isTested ? 'Geprüft & Stabil' : headlessTester.isBusy ? 'Test läuft...' : 'Test vor Download empfohlen'}
          </span>
        </div>
      </div>
      <p class="small muted">
        Prüft dein individuelles Modpack auf einem 16 GB Linux-Runner in einer echten Minecraft-Testwelt (Chunk-Rundflug, Mobs für Fresh Animations, 3D-Items).
      </p>

      {#if headlessTester.isBusy}
        <div class="tp-status running">
          <span class="tp-spinner"></span>
          <span class="small">{headlessTester.progress}</span>
        </div>
      {:else if isTested}
        <div class="tp-status ok">
          <span class="small">✓ 100 % fehlerfrei gestartet & getestet!</span>
          {#if headlessTester.runUrl}
            <a class="small link" href={headlessTester.runUrl} target="_blank" rel="noopener">GitHub Run ↗</a>
          {/if}
        </div>
      {:else if headlessTester.state === "failed"}
        <div class="tp-status bad">
          <span class="small">❌ {headlessTester.error}</span>
          {#if headlessTester.runUrl}
            <a class="small link" href={headlessTester.runUrl} target="_blank" rel="noopener">Logs ansehen ↗</a>
          {/if}
        </div>
      {/if}

      <button
        class="btn test-btn {isTested ? 'ghost' : 'primary'}"
        disabled={headlessTester.isBusy || !check.ok}
        onclick={() => headlessTester.runTest(selectedMods, selectedRps)}
      >
        {#if headlessTester.isBusy}
          ⏳ Stresstest läuft...
        {:else if isTested}
          🔄 Stresstest erneut ausführen
        {:else}
          🧪 Modpack online testen
        {/if}
      </button>
    </div>
  {:else}
    <div class="tp-preset-box">
      <span class="small">🛡️ <b>Vorlage vorab geprüft:</b> Standard-Packs werden automatisch im CI-Stresstest validiert.</span>
    </div>
  {/if}

  <label class="lbl">Name<input class="field" bind:value={name} /></label>
  <button class="btn primary big" disabled={busy || !check.ok || (isCustom && !isTested && !force)} onclick={() => go("mrpack")}>Modpack-Datei (.mrpack)</button>
  <p class="hint">Klein und schnell. Importieren in Modrinth App, Prism oder ATLauncher, die Mods lädt der Launcher selbst.</p>
  <button class="btn" disabled={busy || !check.ok || (isCustom && !isTested && !force)} onclick={() => go("prism")}>Komplette Prism-Instanz (.zip)</button>
  <p class="hint">Alle Dateien schon drin und Arbeitsspeicher eingestellt. Größer, der Download dauert etwas.</p>
  <button class="btn sm ghost" disabled={busy || !check.ok || (isCustom && !isTested && !force)} onclick={() => go("server")}>Server-Pack (.mrpack)</button>
  {#if isCustom && !isTested}
    <p class="hint" style="color:var(--warn)">💡 Führe zuerst den Cloud-Stresstest durch, um die 100 %ige Stabilität zu bestätigen.</p>
  {/if}
  <details class="srv">
    <summary>Server-Werkzeuge: {srvCount} von {srvList.length} dabei</summary>
    <p class="small muted">Harmlose sind vorausgewählt. Was du abwählst, bleibt draußen, außer ein anderes Werkzeug braucht es.</p>
    <ul>
      {#each srvList as m (m.slug)}
        {@const on = pack.srvOn(m.slug, r)}
        <li>
          <label><input type="checkbox" checked={on} onchange={e => pack.setSrv(m.slug, e.currentTarget.checked)} /> {m.name}</label>
          {#if m.nichtAuto}<span class="small muted">{m.nichtAuto}</span>{/if}
          {#if !on && inSrv.has(m.slug)}<span class="small muted">Kommt trotzdem mit, weil ein anderes Werkzeug es braucht.</span>{/if}
        </li>
      {/each}
    </ul>
  </details>
  <button class="btn sm ghost" disabled={busy} onclick={() => go("packwiz")}>packwiz-Ordner (.zip)</button>
  <p class="hint">Für Server-Admins: das Pack als Textdateien zum Hochladen; Server und Spieler holen Updates dann automatisch.</p>
  {#if st}<p class="small" role="status">{st}</p>{/if}
  {#if manual.length}<div class="warnbox" style="border-color:var(--warn);background:var(--warn-soft)"><b>Selbst herunterladen ({manual.length})</b>{#each manual as s}<a href={pack.BY[s].cf} target="_blank" rel="noopener">{pack.name(s)} ↗</a>{/each}<span class="small">Diese CurseForge-Autoren erlauben keinen automatischen Download. Datei laden und in den Ordner mods legen.</span></div>{/if}
  <div class="two"><button class="btn sm ghost" onclick={share}>Teilen-Link</button><button class="btn sm ghost" onclick={() => ui.undo()}>↶ Rückgängig</button></div>
  <button class="btn sm ghost danger" onclick={reset}>{armed ? "Wirklich alles löschen? Nochmal klicken" : "Alles zurücksetzen"}</button>
</aside>

<style>
  .bar { position: sticky; top: 4.4rem; max-height: calc(100vh - 5.2rem); overflow: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: .65rem; padding: 1rem; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); margin-top: .4rem; }
  h2 { margin: 0; font-size: 1.1rem; }
  .presetbox { border: 1px solid var(--preset); background: var(--preset-soft); border-radius: 10px; padding: .6rem .7rem; display: flex; flex-direction: column; gap: .35rem; align-items: flex-start; }
  .ph { display: flex; gap: .5rem; align-items: center; }
  .link { background: none; border: 0; padding: 0; color: var(--preset); font: 500 .84rem var(--font); cursor: pointer; }
  .diff { list-style: none; margin: 0; padding: 0; font-size: .8rem; max-height: 9rem; overflow: auto; width: 100%; } .diff .p { color: var(--ok); } .diff .m { color: var(--bad); text-decoration: line-through; }
  .stats { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); text-align: center; }
  .srv { border: 1px solid var(--line-2); border-radius: 10px; padding: .5rem .7rem; font-size: .84rem; }
  .srv summary { cursor: pointer; }
  .srv ul { list-style: none; margin: .4rem 0 0; padding: 0; display: grid; gap: .45rem; max-height: 16rem; overflow: auto; }
  .srv li { display: grid; gap: .1rem; }
  .srv label { display: flex; gap: .45rem; align-items: center; cursor: pointer; }
  .srv input { width: 1rem; height: 1rem; accent-color: var(--accent); }
  .tipbox, .autobox { border: 1px solid var(--line-2); border-radius: 10px; padding: .55rem .7rem; font-size: .84rem; }
  .autobox { border-color: var(--accent); }
  .tipbox summary, .autobox summary { cursor: pointer; } .tipbox ul, .autobox ul { margin: .5rem 0 .3rem; padding-left: 1.1rem; display: grid; gap: .4rem; }
  .autobox select { display: block; margin-top: .3rem; width: 100%; font-size: .8rem; padding: .25rem .4rem; }
  .errs { margin: 0; padding-left: 1.1rem; display: grid; gap: .25rem; font-size: .8rem; }
  .stats b { display: block; font: 600 1.4rem var(--mono); } .stats span { font-size: .72rem; color: var(--muted); }
  .meter { display: grid; grid-template-columns: auto 1fr auto; gap: .5rem; align-items: center; font-size: .82rem; }
  .track { height: .45rem; border-radius: 9px; background: var(--bg-2); overflow: hidden; } .track i { display: block; height: 100%; border-radius: 9px; }
  i.ok { background: var(--ok); } i.warn { background: var(--warn); } i.bad { background: var(--bad); }
  b.ok { color: var(--ok); } b.warn { color: var(--warn); } b.bad { color: var(--bad); }
  .small { font-size: .8rem; margin: 0; }
  .state { margin: 0; padding: .45rem .6rem; border-radius: 8px; font-size: .84rem; font-weight: 500; }
  .state.ok { background: var(--accent-soft); color: var(--ok); } .state.bad { background: var(--bad-soft); color: var(--bad); }
  .warnbox, .checkerr { flex-shrink: 0; border: 1px solid var(--bad); background: var(--bad-soft); border-radius: 10px; padding: .55rem .65rem; display: grid; gap: .35rem; font-size: .84rem; }
  .prob { display: flex; justify-content: space-between; gap: .5rem; align-items: center; }
  .tools, .two { display: flex; gap: .4rem; flex-wrap: wrap; } .two > * { flex: 1; }
  .ram { margin: 0; padding: .5rem .6rem; border-radius: 8px; background: var(--warn-soft); border: 1px solid var(--warn); font-size: .8rem; }
  .hint { margin: -.35rem 0 0; font-size: .76rem; color: var(--muted); }
  .libs { font-size: .8rem; } .libs summary { cursor: pointer; color: var(--muted); } .libs p { margin: .3rem 0; } .libs ul { margin: 0; padding-left: 1.1rem; max-height: 9rem; overflow: auto; columns: 2; column-gap: 1rem; }
  .lbl { display: grid; gap: .25rem; font-size: .8rem; color: var(--muted); }
  .chk { display: flex; gap: .45rem; align-items: center; font-size: .85rem; }
  .big { min-height: 2.8rem; font-size: 1rem; }
  .danger { color: var(--bad); }
  @media (max-width: 1100px) { .bar { position: static; max-height: none; } }

  .start-check-box {
    border-radius: var(--radius);
    padding: .85rem;
    border: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: .65rem;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    flex-shrink: 0 !important;
    min-height: fit-content !important;
    overflow: visible !important;
  }
  .start-check-box.ok { background: var(--accent-soft); border-color: var(--accent); }
  .start-check-box.bad { background: var(--bad-soft); border-color: var(--bad); }
  .sc-head { display: flex; align-items: flex-start; gap: .65rem; flex-shrink: 0; }
  .sc-icon { font-size: 1.35rem; line-height: 1.2; flex-shrink: 0; }
  .sc-title-col { display: flex; flex-direction: column; gap: .2rem; min-width: 0; flex: 1; }
  .sc-title { font-size: .95rem; font-weight: 700; line-height: 1.3; color: var(--fg); word-break: break-word; overflow-wrap: anywhere; }
  .sc-subtitle { font-size: .8rem; line-height: 1.35; color: var(--muted); word-break: break-word; overflow-wrap: anywhere; }
  .sc-list { list-style: none; padding: 0; margin: 0; display: grid; gap: .2rem; color: var(--fg); opacity: .95; font-size: .82rem; }

  .issue-list {
    display: flex;
    flex-direction: column;
    gap: .65rem;
    margin-top: .2rem;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    flex-shrink: 0;
  }
  .issue-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: .75rem;
    display: flex;
    flex-direction: column;
    gap: .5rem;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    overflow-wrap: anywhere;
    word-break: break-word;
    flex-shrink: 0;
  }
  .issue-header {
    display: flex;
    align-items: flex-start;
    gap: .45rem;
    font-size: .84rem;
    line-height: 1.3;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .issue-header b {
    flex: 1;
    min-width: 0;
  }
  .issue-detail {
    margin: 0;
    font-size: .78rem;
    color: var(--muted);
    line-height: 1.35;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .issue-actions {
    display: flex;
    flex-direction: column;
    gap: .45rem;
    margin-top: .15rem;
    width: 100%;
    box-sizing: border-box;
  }
  .solution-options {
    display: flex;
    flex-direction: column;
    gap: .45rem;
    width: 100%;
    box-sizing: border-box;
  }
  .solution-choice {
    display: flex;
    flex-direction: column;
    gap: .3rem;
    padding: .45rem .55rem;
    background: var(--surface-2);
    border: 1px solid var(--line-2);
    border-radius: 7px;
    width: 100%;
    box-sizing: border-box;
  }
  .solution-btn {
    width: 100% !important;
    white-space: normal !important;
    height: auto !important;
    min-height: 2.1rem;
    line-height: 1.3;
    padding: .4rem .55rem;
    text-align: center;
    justify-content: center;
    font-size: .82rem;
    word-break: break-word;
    overflow-wrap: anywhere;
    box-sizing: border-box;
  }
  .full-w {
    width: 100% !important;
    box-sizing: border-box;
  }
  .consequence {
    font-size: .73rem;
    line-height: 1.3;
    color: var(--muted);
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .locked-note {
    display: flex;
    align-items: flex-start;
    gap: .4rem;
    padding: .35rem .5rem;
    background: var(--surface-2);
    border: 1px solid var(--line-2);
    border-radius: 6px;
    font-size: .76rem;
    line-height: 1.3;
    overflow-wrap: anywhere;
    word-break: break-word;
    box-sizing: border-box;
  }
  .locked-badge {
    background: var(--accent);
    color: var(--accent-fg, #fff);
    font-size: .68rem;
    padding: .1rem .35rem;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .locked-text {
    flex: 1;
    min-width: 0;
  }
  .choice-title {
    margin: 0;
    font-size: .78rem;
    color: var(--fg);
    line-height: 1.3;
  }
  .err-fallback {
    font-size: .78rem;
    color: var(--bad);
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .test-panel {
    border: 1px solid var(--accent);
    background: var(--surface-2);
    border-radius: 10px;
    padding: .75rem .85rem;
    display: flex;
    flex-direction: column;
    gap: .55rem;
    box-sizing: border-box;
  }
  .tp-head {
    display: flex;
    gap: .5rem;
    align-items: center;
  }
  .tp-icon {
    font-size: 1.25rem;
  }
  .tp-title-col {
    display: flex;
    align-items: center;
    gap: .5rem;
    flex-wrap: wrap;
    flex: 1;
  }
  .tp-status {
    padding: .45rem .65rem;
    border-radius: 6px;
    font-size: .8rem;
    display: flex;
    align-items: center;
    gap: .5rem;
  }
  .tp-status.running {
    background: var(--surface);
    border: 1px solid var(--line);
    color: var(--accent);
  }
  .tp-status.ok {
    background: var(--ok-soft, rgba(46, 122, 106, 0.15));
    border: 1px solid var(--ok);
    color: var(--ok);
  }
  .tp-status.bad {
    background: var(--bad-soft, rgba(200, 60, 60, 0.15));
    border: 1px solid var(--bad);
    color: var(--bad);
  }
  .tp-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--accent);
    border-top-color: transparent;
    border-radius: 50%;
    animation: tp-spin .8s linear infinite;
    flex-shrink: 0;
  }
  @keyframes tp-spin {
    to { transform: rotate(360deg); }
  }
  .tp-preset-box {
    border: 1px solid var(--line-2);
    border-radius: 8px;
    padding: .5rem .7rem;
    background: var(--surface-2);
    color: var(--ok);
  }
  .test-btn {
    width: 100%;
    justify-content: center;
    font-weight: 600;
  }
</style>
