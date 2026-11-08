// Umfassende Testreihe für den Mod-Katalog: Abläufe, Exporte (entpackt + validiert), Barrierefreiheit, Leistung, Handy.
// Aufruf: node qa/e2e.js <ausgabeordner>   (Website muss unter BASE laufen, z. B. „python3 -m http.server 8765“ im Repo-Ordner)
// Umgebung: BASE (Standard http://localhost:8765/neu/), REPO (Standard: Ordner über qa/). Exit-Code 1 bei Fehlern.
const { chromium, devices } = require('playwright');
const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2] || '.';
const BASE = process.env.BASE || 'http://localhost:8765/neu/';
const REPO = process.env.REPO || path.resolve(__dirname, '..');
const DATA = JSON.parse(fs.readFileSync(path.join(REPO, 'data/app-data.json'), 'utf8'));
const BY = Object.fromEntries(DATA.mods.map(m => [m.slug, m]));
const ALLOWED = ['cdn.modrinth.com', 'github.com', 'raw.githubusercontent.com', 'gitlab.com'];
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const R = { fails: [], warns: [], info: {}, axe: {}, perf: {} };
const fail = (t, d) => R.fails.push(d ? `${t}: ${typeof d === 'string' ? d : JSON.stringify(d).slice(0, 400)}` : t);
const warn = (t, d) => R.warns.push(d ? `${t}: ${typeof d === 'string' ? d : JSON.stringify(d).slice(0, 400)}` : t);
const isLocal = u => u.startsWith(new URL(BASE).origin) || u.startsWith('data:') || u.startsWith('blob:') || u === 'about:blank';

async function newPage(browser, opts = {}) {
  const ctx = await browser.newContext({ acceptDownloads: true, ...opts });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin }).catch(() => {});
  // Externe Anfragen: im Testnetz nicht erreichbar → schnell mit Platzhalter beantworten (Bilder/Jars), damit nichts hängt
  await ctx.route(u => !isLocal(u.toString()), r => {
    const u = r.request().url();
    if (/\.(jar|zip)(\?|$)/i.test(u)) return r.fulfill({ status: 200, body: Buffer.from('PK-test-' + u), contentType: 'application/java-archive' });
    return r.fulfill({ status: 404, body: '' });
  });
  const p = await ctx.newPage();
  p._errs = [];
  p.on('pageerror', e => p._errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) p._errs.push('console: ' + m.text()); });
  return { ctx, p };
}
const esc = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cardOf = (p, name) => p.locator('.card').filter({ has: p.locator('h3', { hasText: new RegExp('^\\s*' + esc(name) + '\\s*$') }) }).first();
async function ready(p) { await p.goto(BASE); await p.waitForSelector('.pp', { timeout: 20000 }); await p.waitForTimeout(300); }
async function stats(p) { return p.evaluate(() => { const g = [...document.querySelectorAll('.stats > div')].map(d => d.querySelector('b')?.textContent?.trim()); return { mods: +g[0], packs: +g[1], shader: +g[2], libs: +g[3], conflictsText: document.querySelector('.warnbox b')?.textContent || '', okText: [...document.querySelectorAll('.state.ok')].map(x => x.textContent).join('|') }; }); }
async function axe(p, label) {
  await p.addScriptTag({ content: AXE });
  const res = await p.evaluate(async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }, resultTypes: ['violations'] }); return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, ex: v.nodes.slice(0, 3).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n').slice(1, 2).join(' ')) })); });
  R.axe[label] = res;
}

// ---------- Export prüfen ----------
async function validateMrpack(buf, label, { server = false, allow = [] } = {}) {
  const z = await JSZip.loadAsync(buf);
  const idx = JSON.parse(await z.file('modrinth.index.json').async('string'));
  const info = { files: idx.files.length, overrides: Object.keys(z.files).filter(f => f.startsWith('overrides/') && !z.files[f].dir) };
  if (idx.formatVersion !== 1 || idx.game !== 'minecraft') fail(label + ' Kopf', idx);
  if (idx.dependencies?.minecraft !== '26.3' || !idx.dependencies['fabric-loader']) fail(label + ' dependencies', idx.dependencies);
  const paths = new Set(); const slugsByPath = {};
  for (const f of idx.files) {
    if (paths.has(f.path)) fail(label + ' doppelter Pfad', f.path); paths.add(f.path);
    if (!/^(mods|resourcepacks|shaderpacks|datapacks|global_packs\/required_data|config\/paxi\/datapacks)\//.test(f.path)) warn(label + ' ungewöhnlicher Pfad', f.path);
    if (!/^[0-9a-f]{40}$/.test(f.hashes?.sha1 || '')) fail(label + ' sha1', f.path);
    if (!/^[0-9a-f]{128}$/.test(f.hashes?.sha512 || '')) fail(label + ' sha512', f.path + ' ' + (f.hashes?.sha512 || '').length);
    if (!(f.fileSize > 0)) fail(label + ' fileSize', f.path);
    for (const d of f.downloads || []) { const h = new URL(d).hostname; if (!ALLOWED.includes(h)) fail(label + ' Host nicht erlaubt', d); }
    if (!f.downloads?.length) fail(label + ' ohne Download', f.path);
    if (!f.env || !['required', 'optional', 'unsupported'].includes(f.env.client) || !['required', 'optional', 'unsupported'].includes(f.env.server)) fail(label + ' env', f);
    if (server && /^(resourcepacks|shaderpacks)\//.test(f.path)) fail(label + ' Client-Inhalt im Server-Pack', f.path);
    // Zuordnung Pfad → Slug
    const slug = Object.keys(DATA.files).find(s => DATA.files[s][2] === f.hashes.sha1);
    if (!slug) warn(label + ' Datei nicht im Katalog', f.path); else slugsByPath[f.path] = slug;
  }
  const slugs = new Set(Object.values(slugsByPath));
  // Abhängigkeiten vollständig?
  for (const s of slugs) for (const d of DATA.files[s][5]) if (!slugs.has(d) && DATA.files[d] && !(server && BY[d] && BY[d].ampel === 'G')) fail(label + ' fehlende Abhängigkeit', `${s} → ${d}`);
  // Gruppen: nie zwei aus derselben Gruppe
  for (const g of DATA.dec.gruppen) { const inn = g.mods.filter(s => slugs.has(s)); if (inn.length > 1) fail(label + ' Gruppe doppelt', `${g.id}: ${inn.join(', ')}`); }
  // Harte Konflikte
  for (const b of DATA.dec.beziehungen || []) if ((b.art === 'K' || b.art === 'D') && b.mods.length === 2 && b.mods.every(s => slugs.has(s))) fail(label + ' Konfliktpaar', `${b.mods.join(' + ')} (${b.art})`);
  // Server-Pack: keine reinen Client-Mods
  if (server) for (const s of slugs) { const m = BY[s]; if (m && m.ampel === 'G' && (m.pt || 'm') === 'm') warn(label + ' Client-Mod im Server-Pack', s); if (m && m.nichtAuto && !allow.includes(s)) fail(label + ' Werkzeug nur auf Wunsch, trotzdem im Server-Pack', s); }
  // options.txt: Resource-Pack-Reihenfolge passt zu den Dateien
  const opt = z.file('overrides/options.txt') ? await z.file('overrides/options.txt').async('string') : null;
  if (!server) {
    if (!opt) fail(label + ' options.txt fehlt');
    else {
      const line = opt.split('\n').find(l => l.startsWith('resourcePacks:'));
      const list = line ? JSON.parse(line.slice('resourcePacks:'.length)) : [];
      const rpFiles = idx.files.filter(f => f.path.startsWith('resourcepacks/')).map(f => 'file/' + f.path.slice('resourcepacks/'.length));
      for (const r of rpFiles) if (!list.includes(r)) fail(label + ' RP fehlt in options.txt', r);
      for (const r of list) if (r !== 'vanilla' && !rpFiles.includes(r)) fail(label + ' options.txt nennt fehlende Datei', r);
      info.rpOrder = list.length - 1;
      const maxFps = (opt.match(/maxFps:(\d+)/) || [])[1]; info.maxFps = maxFps; info.renderDistance = (opt.match(/renderDistance:(\d+)/) || [])[1];
    }
    const iris = z.file('overrides/config/iris.properties'); if (iris) info.iris = (await iris.async('string')).trim().replace(/\n/g, ' | ');
  }
  info.datapacks = idx.files.filter(f => /datapack|global_packs|paxi/.test(f.path)).map(f => f.path);
  info.slugs = slugs.size;
  R.info[label] = info;
  return { idx, slugs, z };
}
async function download(p, buttonText) {
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.getByRole('button', { name: buttonText, exact: true }).click()]);
  const fp = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(fp); return { buf: fs.readFileSync(fp), name: dl.suggestedFilename() };
}

(async () => {
  const browser = await chromium.launch();
  try {
    // ---------- 1. Laden, Leistung ----------
    {
      const { ctx, p } = await newPage(browser, { viewport: { width: 1440, height: 1000 } });
      const t0 = Date.now();
      await p.goto(BASE);
      await p.waitForSelector('.pp', { timeout: 20000 });
      R.perf.readyMs = Date.now() - t0;
      R.perf.metrics = await p.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const res = performance.getEntriesByType('resource').filter(r => r.name.includes('localhost')).map(r => ({ n: r.name.split('/').slice(-2).join('/'), kb: Math.round((r.transferSize || r.encodedBodySize) / 1024), ms: Math.round(r.duration) }));
        return { domContentLoaded: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), domNodes: document.getElementsByTagName('*').length, cards: document.querySelectorAll('.card').length, imgs: document.images.length, imgsLazy: [...document.images].filter(i => i.loading === 'lazy').length, imgsNoSize: [...document.images].filter(i => !i.getAttribute('width') && !i.getAttribute('height') && getComputedStyle(i).aspectRatio === 'auto' && !i.closest('[class*=im],[class*=thumb],.ph,.pill')).length, res };
      });
      // Klick-Reaktion (INP-Näherung): eine Kachel an/aus
      const hit = p.locator('.card .hit').first();
      const lat = [];
      for (let i = 0; i < 4; i++) { const t = await p.evaluate(() => performance.now()); await hit.click(); const t2 = await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(performance.now()))))); lat.push(Math.round(t2 - t)); }
      R.perf.clickToPaintMs = lat;
      // Suche tippen (Reaktion)
      const ts = Date.now(); await p.fill('input[type=search]', 'sodium'); await p.waitForTimeout(50); await p.evaluate(() => new Promise(r => requestAnimationFrame(() => r())));
      R.perf.searchMs = Date.now() - ts;
      R.info.searchSodium = await p.locator('.card h3').allTextContents();
      await p.fill('input[type=search]', 'xyzunbekannt'); await p.waitForTimeout(200);
      if (!(await p.locator('.empty').count())) fail('Leere Suche zeigt keinen Hinweis');
      await p.fill('input[type=search]', '');
      // Tabs zählen
      const tabs = {};
      for (const t of ['Mods', 'Shader', 'Resource Packs', 'Datapacks']) { await p.getByRole('tab', { name: new RegExp('^' + t) }).click(); await p.waitForTimeout(250); tabs[t] = await p.locator('.card').count(); if (!tabs[t]) fail('Tab ohne Kacheln', t); }
      R.info.tabs = tabs;
      await p.getByRole('tab', { name: /^Mods/ }).click();
      await axe(p, 'Startseite');
      if (p._errs.length) fail('Fehler beim Laden', p._errs);
      await ctx.close();
    }

    // ---------- 2. Vorlagen + Export je Vorlage ----------
    for (const preset of ['Nur Performance', 'Vanilla Visual', 'Vanilla Plus']) {
      const { ctx, p } = await newPage(browser, { viewport: { width: 1440, height: 1000 } });
      await ready(p);
      await p.locator('.preset', { hasText: preset }).click(); await p.waitForTimeout(400);
      const st = await stats(p); R.info['Vorlage ' + preset] = st;
      if (st.conflictsText) fail(`Vorlage ${preset} hat Konflikte`, st.conflictsText);
      const m = await download(p, 'Modpack-Datei (.mrpack)');
      await validateMrpack(m.buf, 'mrpack ' + preset);
      if (preset === 'Vanilla Plus') {
        const s = await download(p, 'Server-Pack (.mrpack)'); const sv0 = await validateMrpack(s.buf, 'server ' + preset, { server: true });
        if (!sv0.slugs.has('carpet')) fail('Carpet fehlt im Server-Pack (harmlose Werkzeuge sind vorausgewählt)');
        // Server-Werkzeuge einzeln wählbar: Mob Filter ab, TT20 an
        await p.locator('details.srv summary').click();
        await p.locator('details.srv label', { hasText: 'Mob Filter' }).locator('input').uncheck();
        await p.locator('details.srv label', { hasText: 'TT20' }).locator('input').check();
        const sv1 = await validateMrpack((await download(p, 'Server-Pack (.mrpack)')).buf, 'server Auswahl', { server: true, allow: ['tt20'] });
        if (sv1.slugs.has('mobfilter')) fail('Abgewähltes Werkzeug trotzdem im Server-Pack', 'mobfilter');
        if (!sv1.slugs.has('tt20')) fail('Gewähltes Werkzeug fehlt im Server-Pack', 'tt20');
        R.info.serverAuswahl = await p.locator('details.srv summary').textContent();
        // Prism: externe Jars werden durch Platzhalter ersetzt
        const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 180000 }), p.getByRole('button', { name: 'Komplette Prism-Instanz (.zip)' }).click()]);
        const fp = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(fp);
        const z = await JSZip.loadAsync(fs.readFileSync(fp));
        const names = Object.keys(z.files);
        const cfg = await z.file('instance.cfg').async('string'); const mmc = JSON.parse(await z.file('mmc-pack.json').async('string'));
        const mods = names.filter(n => n.startsWith('.minecraft/mods/') && !z.files[n].dir).length;
        const mr = R.info['mrpack ' + preset];
        R.info['prism ' + preset] = { maxMem: (cfg.match(/MaxMemAlloc=(\d+)/) || [])[1], comps: mmc.components.map(c => c.uid + '@' + (c.version || '')), mods, rp: names.filter(n => n.startsWith('.minecraft/resourcepacks/') && !z.files[n].dir).length, sp: names.filter(n => n.startsWith('.minecraft/shaderpacks/') && !z.files[n].dir).length, dp: names.filter(n => /datapacks|global_packs|paxi/.test(n) && !z.files[n].dir).length, options: !!z.file('.minecraft/options.txt') };
        if (!/^\d+$/.test(R.info['prism ' + preset].maxMem || '')) fail('Prism ohne RAM');
      }
      if (p._errs.length) fail('Fehler bei Vorlage ' + preset, p._errs);
      await ctx.close();
    }

    // ---------- 3. Assistent komplett + Konflikt + Rückgängig + Teilen + Neu laden ----------
    {
      const { ctx, p } = await newPage(browser, { viewport: { width: 1440, height: 1000 } });
      await ready(p);
      await p.getByRole('button', { name: /Assistent starten/ }).click();
      await p.waitForSelector('dialog[open]');
      await axe(p, 'Assistent');
      const pick = async txt => { await p.locator('dialog[open] .opt', { hasText: txt }).first().click(); };
      const next = async () => { await p.locator('dialog[open] .btn.primary').click(); await p.waitForTimeout(120); };
      await pick('eigener Server'); await next();
      await pick('NVIDIA'); await next();
      await pick('Oberklasse'); await next();
      await pick('32 GB'); await next();
      await pick('G-Sync / FreeSync vorhanden'); await next();
      await pick('Flüssig'); await next();
      await pick('Ja, weite Fernsicht'); await next();
      await pick('Ja, Shader'); await next();
      await pick('Ja, mit Punchy'); await next();
      await pick('Vanilla+ mit Komfort'); await next();
      R.info.wizardPreview = await p.locator('dialog[open] .sum').innerText().catch(() => '');
      await p.locator('dialog[open] .btn.primary', { hasText: 'Übernehmen' }).click(); await p.waitForTimeout(500);
      const st = await stats(p); R.info.wizard = st;
      if (st.conflictsText) fail('Assistent erzeugt Konflikte', st.conflictsText);
      const w = await download(p, 'Modpack-Datei (.mrpack)'); const { slugs } = await validateMrpack(w.buf, 'mrpack Assistent');
      for (const must of ['sodium', 'iris', 'voxy', 'photon-shader', 'punchy-fpa']) if (!slugs.has(must)) warn('Assistent: erwartet aber fehlt', must);
      // Konflikt auslösen: erstes Paar mit „Nur eins“/Konflikt außerhalb der Gruppen (z. B. FWA gegen Animated Doors)
      const inG = new Set(DATA.dec.gruppen.flatMap(g => g.mods)); const locked = s => (BY[s].cat === 'P' && BY[s].rolle === 'K') || BY[s].pflicht;
      const pair = (DATA.dec.beziehungen || []).find(b => (b.art === 'K' || b.art === 'D') && b.mods.length === 2 && b.mods.every(s => BY[s] && DATA.files[s] && !inG.has(s) && !locked(s) && (BY[s].pt || 'm') === 'm'));
      R.info.conflictPair = pair && pair.mods;
      const clickCard = async name => { await p.fill('input[type=search]', name); await p.waitForTimeout(300); const c = cardOf(p, name); if (!(await c.count())) return false; if (!(await c.evaluate(e => e.classList.contains('on')))) await c.locator('.hit').click(); await p.waitForTimeout(300); if (await p.locator('dialog[open]').count()) { await p.locator('dialog[open] .btn.primary').click(); await p.waitForTimeout(300); } return true; };
      const nm = s => BY[s].name;
      // zweiten Partner vorher abwählen, falls der Assistent ihn gewählt hat
      if (pair) await p.evaluate(x => { const v = JSON.parse(localStorage.getItem('mk-v3')); v.s = v.s.filter(s => s !== x); localStorage.setItem('mk-v3', JSON.stringify(v)); }, pair.mods[1]);
      if (pair) { await p.reload(); await p.waitForSelector('.pp'); await p.waitForTimeout(300); }
      if (pair && await clickCard(nm(pair.mods[0]))) {
        await p.fill('input[type=search]', nm(pair.mods[1])); await p.waitForTimeout(300);
        await cardOf(p, nm(pair.mods[1])).locator('.hit').click(); await p.waitForTimeout(300);
        const dlgOpen = await p.locator('dialog[open]').count();
        if (!dlgOpen) fail('Kein Konflikt-Dialog', pair.mods.join(' + '));
        else { R.info.conflictDialog = (await p.locator('dialog[open]').innerText()).slice(0, 300); await p.locator('dialog[open] .btn.primary').click(); await p.waitForTimeout(300); }
        const st2 = await stats(p); if (st2.conflictsText) fail('Nach Konfliktlösung trotzdem Konflikte', st2.conflictsText);
        await p.getByRole('button', { name: '↶ Rückgängig' }).click(); await p.waitForTimeout(300);
        R.info.afterUndo = await stats(p);
      } else warn('Konfliktpaar nicht testbar', R.info.conflictPair);
      await p.fill('input[type=search]', '');
      // Teilen-Link
      await p.getByRole('button', { name: 'Teilen-Link' }).click(); await p.waitForTimeout(300);
      const share = await p.evaluate(() => navigator.clipboard.readText().catch(() => ''));
      R.info.shareUrl = share.slice(0, 80) + '… (' + share.length + ' Zeichen)';
      const before = await stats(p);
      // Neu laden: localStorage
      await p.reload(); await p.waitForSelector('.pp'); await p.waitForTimeout(300);
      const afterReload = await stats(p); if (afterReload.mods !== before.mods) fail('Auswahl nach Neuladen anders', { before, afterReload });
      // Teilen-Link in frischem Kontext
      if (share) { const { ctx: c2, p: p2 } = await newPage(browser, { viewport: { width: 1440, height: 1000 } }); await p2.goto(share); await p2.waitForSelector('.pp'); await p2.waitForTimeout(300); const s2 = await stats(p2); if (s2.mods !== before.mods || s2.packs !== before.packs || s2.shader !== before.shader) fail('Teilen-Link stellt Auswahl nicht wieder her', { before, s2 }); R.info.shareRestore = s2; await c2.close(); }
      else fail('Teilen-Link leer');
      // Detail öffnen/schließen
      await p.locator('.card .more').first().click(); await p.waitForSelector('dialog[open]');
      await axe(p, 'Detail');
      const scrollLocked = await p.evaluate(() => getComputedStyle(document.documentElement).overflow);
      if (scrollLocked !== 'hidden') warn('Hintergrund scrollt bei offenem Detail', scrollLocked);
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      if (await p.locator('dialog[open]').count()) fail('Escape schließt Detail nicht');
      // Zurücksetzen (zweimal klicken)
      await p.getByRole('button', { name: 'Alles zurücksetzen' }).click(); await p.getByRole('button', { name: /Wirklich alles löschen/ }).click(); await p.waitForTimeout(300);
      R.info.afterReset = await stats(p);
      if (p._errs.length) fail('Fehler im Assistent-Ablauf', p._errs);
      await ctx.close();
    }

    // ---------- 3b. Assistent bei schwacher Grafik: Warnung + leichte Vorlage; Voxy-Hinweise bei Shadern ----------
    {
      const { ctx, p } = await newPage(browser, { viewport: { width: 1280, height: 900 } });
      await ready(p);
      await p.getByRole('button', { name: /Assistent starten/ }).click();
      await p.waitForSelector('dialog[open]');
      const pick = async txt => { await p.locator('dialog[open] .opt', { hasText: txt }).first().click(); };
      const next = async () => { await p.locator('dialog[open] .btn.primary').click(); await p.waitForTimeout(120); };
      await pick('Vanilla-Server'); await next();
      await pick('Intel oder Laptop-Grafik'); await next();
      await pick('Einsteiger'); await next();
      await pick('16 GB'); await next();
      await pick('Kein G-Sync'); await next();
      await pick('Flüssig'); await next();
      if (!(await p.locator('dialog[open] .gwarn').count())) fail('Grafik-Warnung fehlt bei der Fernsicht-Frage');
      await pick('Nein'); await next();
      if (!(await p.locator('dialog[open] .gwarn').count())) fail('Grafik-Warnung fehlt bei der Shader-Frage');
      await pick('Nein, lieber'); await next();
      await pick('Nein, wie Vanilla'); await next();
      await pick('Fast wie Vanilla'); await next();
      const light = p.locator('dialog[open] .gwarn button', { hasText: 'Leichte Vorlage' });
      if (!(await light.count())) fail('Vorschau ohne Vorschlag „Leichte Vorlage“');
      else { await light.click(); await p.waitForTimeout(400); const pre = await p.locator('.presetbox b').first().textContent().catch(() => ''); if (pre !== 'Nur Performance') fail('Leichte Vorlage nicht übernommen', pre); }
      // Shader-Kacheln zeigen Voxy-Verträglichkeit; Mellow + Voxy ergibt einen Tipp
      await p.getByRole('tab', { name: /^Shader/ }).click(); await p.waitForTimeout(300);
      const vx = await p.locator('.card .badge', { hasText: /Voxy/ }).count(); R.info.voxyBadges = vx;
      if (vx < 10) fail('Voxy-Hinweise an Shadern fehlen', vx);
      await ctx.close();
    }

    // ---------- 4. Andere Ansichten ----------
    {
      const { ctx, p } = await newPage(browser, { viewport: { width: 1440, height: 1000 } });
      await ready(p);
      for (const v of ['testen', 'updates', 'hilfe']) {
        await p.goto(BASE + '#' + v); await p.waitForTimeout(600);
        const h = await p.locator('main h1, main h2').first().textContent().catch(() => '');
        R.info['Ansicht ' + v] = h;
        if (!h) fail('Ansicht ohne Überschrift', v);
        await axe(p, 'Ansicht ' + v);
      }
      if (p._errs.length) fail('Fehler in Ansichten', p._errs);
      await ctx.close();
    }

    // ---------- 4b. Datapacks, Tipps, doppelte Dateinamen, Zurück-Taste ----------
    {
      const { ctx, p } = await newPage(browser, { viewport: { width: 1440, height: 1000 } });
      await ready(p);
      const pick = ['players-drop-heads', 'photon-shader', 'lambdynamiclights', 'herdspanic', 'talkbubbles'].filter(s => BY[s] && DATA.files[s]);
      await p.evaluate(sel => localStorage.setItem('mk-v3', JSON.stringify({ s: sel, c: {}, w: {}, p: null })), pick);
      await p.reload(); await p.waitForSelector('.pp'); await p.waitForTimeout(400);
      if (!(await p.locator('.tipbox').count())) fail('Tipp-Box fehlt (Photon + LambDynamicLights)');
      const m = await download(p, 'Modpack-Datei (.mrpack)');
      const { idx, slugs, z } = await validateMrpack(m.buf, 'mrpack Datapack+Tipps');
      if (!idx.files.some(f => f.path.startsWith('datapacks/'))) fail('Datapack fehlt im .mrpack');
      if (!slugs.has('globalpacks')) fail('Global Packs fehlt trotz Datapack');
      const lies = await z.file('overrides/LIES-MICH.txt').async('string'); R.info.liesMich = lies.slice(0, 600);
      if (!/NACH DEM ERSTEN START/.test(lies)) fail('LIES-MICH ohne Tipps');
      if (!/Datapacks liegen im Ordner datapacks/.test(lies)) fail('LIES-MICH ohne Datapack-Hinweis');
      const tb = idx.files.map(f => f.path).filter(x => /talkbubbles/i.test(x)); R.info.dupNames = tb;
      if (tb.length < 2) fail('Herds Panic und TalkBubbles nicht beide im Pack', tb);
      const sv = await validateMrpack((await download(p, 'Server-Pack (.mrpack)')).buf, 'server Datapack', { server: true });
      if (!sv.idx.files.some(f => f.path.startsWith('datapacks/'))) fail('Datapack fehlt im Server-Pack');
      if (!sv.slugs.has('globalpacks')) fail('Global Packs fehlt im Server-Pack');
      const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 180000 }), p.getByRole('button', { name: 'Komplette Prism-Instanz (.zip)' }).click()]);
      const fp = path.join(OUT, 'dp-' + dl.suggestedFilename()); await dl.saveAs(fp);
      const pz = await JSZip.loadAsync(fs.readFileSync(fp)); const dpn = Object.keys(pz.files).filter(n => n.startsWith('.minecraft/datapacks/') && !pz.files[n].dir);
      R.info.prismDatapacks = dpn; if (!dpn.length) fail('Datapack fehlt in der Prism-Instanz');
      // Zurück-Taste wechselt die Ansicht
      await p.getByRole('link', { name: 'Updates' }).click(); await p.waitForTimeout(400);
      await p.getByRole('link', { name: 'Hilfe & Glossar' }).click(); await p.waitForTimeout(400);
      await p.goBack(); await p.waitForTimeout(500);
      const h = await p.locator('main h1').first().textContent().catch(() => '');
      if (!/Update/.test(h || '')) fail('Zurück-Taste wechselt die Ansicht nicht', h);
      // Tastatur: Datei-Auswahl auf „Testen“ erreichbar
      await p.getByRole('link', { name: 'Testen' }).click(); await p.waitForTimeout(400);
      const fileFocusable = await p.evaluate(() => { const i = document.querySelector('input[type=file]'); i.focus(); return document.activeElement === i; });
      if (!fileFocusable) fail('Datei-Auswahl nicht per Tastatur erreichbar');
      if (p._errs.length) fail('Fehler im Datapack-Ablauf', p._errs);
      await ctx.close();
    }

    // ---------- 4c. Teilen-Link (neues Format), gesperrte Mods, Entscheidungs-Karte, Rückgängig nach Vorlage, Pack-Reihenfolge ----------
    {
      const { ctx, p } = await newPage(browser, { viewport: { width: 1440, height: 1000 } });
      await ready(p);
      // Rückgängig nach Vorlage: Vorlage-Box verschwindet wieder
      await p.locator('.preset', { hasText: 'Vanilla Plus' }).click(); await p.waitForTimeout(300);
      await p.getByRole('button', { name: '↶ Rückgängig' }).click(); await p.waitForTimeout(300);
      if (await p.locator('.presetbox').count()) fail('Rückgängig nach Vorlage lässt die Vorlage aktiv');
      // Gesperrter Mod (Konflikt mit fest eingebautem): darf nicht in die Auswahl
      const blocked = ['moonrise-opt', 'asyncparticles', 'particle-core'].find(s => BY[s]);
      if (blocked) {
        await p.fill('input[type=search]', BY[blocked].name); await p.waitForTimeout(300);
        const c = cardOf(p, BY[blocked].name);
        if (!(await c.locator('.badge', { hasText: 'nicht wählbar' }).count())) fail('Gesperrter Mod ohne Hinweis', blocked);
        await c.locator('.hit').click(); await p.waitForTimeout(300);
        if (await p.locator('dialog[open] h2', { hasText: BY[blocked].name }).count() === 0) warn('Gesperrter Mod öffnet keine Details', blocked);
        await p.keyboard.press('Escape'); await p.waitForTimeout(200);
        const sel = await p.evaluate(() => JSON.parse(localStorage.getItem('mk-v3') || '{}').s || []);
        if (sel.includes(blocked)) fail('Gesperrter Mod wurde ausgewählt', blocked);
        await p.fill('input[type=search]', '');
      }
      // Entscheidungs-Karte mit Konflikt außerhalb der Gruppe → Dialog statt stiller Konflikt
      await p.locator('.preset', { hasText: 'Vanilla Visual' }).click(); await p.waitForTimeout(300);
      const nea = p.locator('.dec .pick', { hasText: 'Not Enough Animations' }).first();
      if (await nea.count()) {
        await nea.scrollIntoViewIfNeeded(); await nea.click(); await p.waitForTimeout(300);
        if (!(await p.locator('dialog[open]').count())) { const st = await stats(p); if (st.conflictsText) fail('Entscheidungs-Karte erzeugt stillen Konflikt', st.conflictsText); }
        else { await p.locator('dialog[open] .btn.primary').click(); await p.waitForTimeout(300); const st = await stats(p); if (st.conflictsText) fail('Nach Dialog trotzdem Konflikte', st.conflictsText); }
      } else warn('Not Enough Animations nicht als Entscheidung gefunden');
      // Teilen-Link: neues Format #p=, in frischem Kontext gleiche Auswahl
      await p.getByRole('button', { name: 'Teilen-Link' }).click(); await p.waitForTimeout(300);
      const share = await p.evaluate(() => navigator.clipboard.readText().catch(() => ''));
      if (!/#p=/.test(share)) fail('Teilen-Link hat nicht das neue Format', share.slice(-40));
      const mine = await p.evaluate(() => JSON.parse(localStorage.getItem('mk-v3') || '{}').s || []);
      const { ctx: c2, p: p2 } = await newPage(browser, { viewport: { width: 1440, height: 1000 } });
      await p2.goto(BASE); await p2.waitForSelector('.pp');
      await p2.evaluate(() => localStorage.setItem('mk-v3', JSON.stringify({ s: [], c: { _name: 'Eigenes Pack' }, w: {}, p: null })));
      await p2.goto('about:blank'); await p2.goto(share); await p2.waitForSelector('.pp'); await p2.waitForTimeout(400);
      const got = await p2.evaluate(() => JSON.parse(localStorage.getItem('mk-v3') || '{}'));
      const miss = mine.filter(s => !got.s.includes(s)); if (miss.length) fail('Teilen-Link stellt nicht alles wieder her', miss.slice(0, 5));
      if (got.c?._name !== 'Eigenes Pack') fail('Teilen-Link überschreibt eigene Einstellungen', got.c);
      if (await p2.evaluate(() => location.hash) !== '#bauen') fail('Teilen-Link bleibt in der Adresse', await p2.evaluate(() => location.hash));
      await p2.reload(); await p2.waitForSelector('.pp'); await p2.waitForTimeout(300);
      const after = await p2.evaluate(() => JSON.parse(localStorage.getItem('mk-v3') || '{}').s || []);
      if (after.length !== got.s.length) fail('Nach Neuladen andere Auswahl als geteilt', { vorher: got.s.length, nachher: after.length });
      await c2.close();
      // Pack-Reihenfolge: nach Umsortieren landet ein neues Add-on über seinem Basis-Pack
      if (BY['fresh-animations'] && BY['fresh-food'] && BY['just-expressions']) {
        await p.evaluate(() => localStorage.setItem('mk-v3', JSON.stringify({ s: ['fresh-animations', 'fresh-food'], c: { _rpord: ['fresh-food', 'fresh-animations'] }, w: {}, p: null })));
        await p.reload(); await p.waitForSelector('.pp'); await p.waitForTimeout(300);
        await p.evaluate(() => { const v = JSON.parse(localStorage.getItem('mk-v3')); v.s.push('just-expressions'); localStorage.setItem('mk-v3', JSON.stringify(v)); });
        await p.reload(); await p.waitForSelector('.pp'); await p.waitForTimeout(300);
        await p.getByRole('button', { name: 'Pack-Reihenfolge' }).click(); await p.waitForSelector('dialog[open] .rpo');
        const order = await p.locator('dialog[open] .rpo .nm').allTextContents(); R.info.rpOrder = order;
        const iJE = order.indexOf(BY['just-expressions'].name), iFA = order.indexOf(BY['fresh-animations'].name);
        if (iJE < 0 || iFA < 0 || iJE > iFA) fail('Add-on liegt unter seinem Basis-Pack', order);
        await p.keyboard.press('Escape');
      }
      if (p._errs.length) fail('Fehler im Teilen/Sperren-Ablauf', p._errs);
      await ctx.close();
    }

    // ---------- 5. Handy ----------
    {
      const { ctx, p } = await newPage(browser, { ...devices['iPhone 13'] });
      await ready(p);
      const ov = {};
      for (const v of ['bauen', 'testen', 'updates', 'hilfe']) { await p.goto(BASE + '#' + v); await p.waitForTimeout(500); ov[v] = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (ov[v] > 1) fail('Handy: waagrechtes Scrollen', `${v}: ${ov[v]}px`); }
      await p.goto(BASE + '#bauen'); await p.waitForTimeout(300);
      await p.getByRole('button', { name: /Assistent starten/ }).click(); await p.waitForSelector('dialog[open]');
      const fit = await p.evaluate(() => { const d = document.querySelector('dialog[open]').getBoundingClientRect(); return { w: Math.round(d.width), vw: innerWidth, h: Math.round(d.height), vh: innerHeight }; });
      if (fit.w > fit.vw) fail('Handy: Dialog breiter als Bildschirm', fit);
      R.info.mobileDialog = fit;
      await p.screenshot({ path: path.join(OUT, 'mobil-assistent.png') });
      await p.keyboard.press('Escape');
      if (p._errs.length) fail('Fehler auf dem Handy', p._errs);
      await ctx.close();
    }
  } catch (e) { fail('Testabbruch', e.stack || String(e)); }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'e2e-report.json'), JSON.stringify(R, null, 1));
  console.log('FEHLER:', R.fails.length, 'WARNUNGEN:', R.warns.length);
  for (const f of R.fails) console.log('  ✗', f.slice(0, 300));
  for (const w of R.warns) console.log('  !', w.slice(0, 300));
  process.exitCode = R.fails.length ? 1 : 0;
})();
