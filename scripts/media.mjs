// Medien-Pipeline: Bilder + Videos für jeden Katalog-Eintrag.
// Stufe A: Modrinth (Galerie, Bilder und YouTube-Links aus der Beschreibung) – ohne Kontingent
// Stufe B: CurseForge (Galerie + Beschreibungs-HTML für Bilder/GIFs/YouTube-Links) – Key: CURSEFORGE_API_KEY
// Stufe C: YouTube-Suche mit Bewertung – Key: YOUTUBE_API_KEY, max. MAX_SEARCH Suchen pro Lauf
import fs from "node:fs";
import { writeMediaApp } from "./media-app.mjs";
const UA = "NashornAufCrack/mc-modpack media-pipeline (github.com/NashornAufCrack/mc-modpack)";
const MAX_SEARCH = Number(process.env.MAX_SEARCH || 90);
const mods = JSON.parse(fs.readFileSync("data/mods.json", "utf8"));
const files = fs.existsSync("data/files.json") ? JSON.parse(fs.readFileSync("data/files.json", "utf8")) : {};
const OUT = "data/media.json";
const media = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const log = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ytIds = s => [...new Set([...String(s || "").matchAll(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/g)].map(m => m[1]))];
const normImg = u => String(u || "").trim().replace(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/(raw|blob)\//i, "https://raw.githubusercontent.com/$1/");

// Eigene Modrinth-Projekt-ID je Slug ermitteln, um fremde Mod-Icons/Werbebanner aus READMEs auszufiltern
const ownPid = {};
for (const m of mods) {
  const f = files[m.slug];
  const m1 = f && String(f[0] || "").match(/cdn\.modrinth\.com\/data\/([A-Za-z0-9]+)\//);
  if (m1) ownPid[m.slug] = m1[1];
}

const BAD_IMG_RE = /shields\.io|badge|discord|ko-?fi|patreon|bisect|nodecraft|shockbyte|sparked_banner|apexhosting|kinetichosting|bh-illusive|tr7zw\.github\.io\/uikit|yourkit\.com|yklogo|flaticon\.com|planetminecraft\.com\/images\/layout\/favicon|ewanhowell\.com\/assets\/images\/icons|paypal|curseforge\.com\/.*\/icons|\/icon\.|Fuzss\/modresources\/main\/pages\/commons\/|\/strip\.png|cdn\.serilum\.com\/description\/header|mods\.twelveiterations\.com\/img\/.*-header|DoomedArtemis\/ResourcePacksManager\/assets\/.*_title|Vi-Tul\/Recolourful-Containers-description\/.*(buttons|label\.png)|LopyMine\/Profile\/.*\/Template|quiqueck\/BCLib\/.*\/bclib_banner|macaws.*banner|stardustlabs|fabric-api|requires-fabric/i;
function badImgUrl(u, slug = "") {
  const n = normImg(u);
  if (BAD_IMG_RE.test(n)) return true;
  if (/^https:\/\/cdn\.modrinth\.com\/data\/[A-Za-z0-9]+\/[^/]+\.(png|webp|jpe?g)(\?|$)/i.test(n)) return true;
  const mr = n.match(/^https:\/\/cdn\.modrinth\.com\/data\/([A-Za-z0-9]+)\/images\//i);
  if (mr && slug && ownPid[slug] && ownPid[slug] !== mr[1]) return true;
  const fm = n.match(/Fuzss\/modresources\/main\/pages\/data\/([^/]+)\/banner\.png/i);
  if (fm && slug && fm[1].toLowerCase() !== slug.toLowerCase().replace(/[^a-z0-9]/g, "")) return true;
  return false;
}
const imgUrls = (s, slug = "") => [...new Set([...String(s || "").matchAll(/https:\/\/[^\s"')<>]+\.(?:png|jpe?g|gif|webp)(?:\?[^\s"')<>]*)?/gi)].map(m => normImg(m[0])))]
  .filter(u => !badImgUrl(u, slug));
const cleanSearchName = s => String(s || "").split("|")[0].replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ").replace(/\s+/g, " ").trim() || String(s || "").replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();
const normTitle = s => String(s || "").replace(/([a-z])([A-Z0-9])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/\+/g, " plus ").replace(/[^a-z0-9]+/g, " ").trim();
const norm = s => normTitle(String(s || "").replace(/\(.*?\)|\[.*?\]/g, " "));
const allModNorms = new Map(mods.map(m => [m.slug, norm(m.name)]).filter(([, n]) => n.length >= 3));
function hasNameInTitle(m, rawTitle) {
  const t = " " + normTitle(rawTitle) + " ";
  const tNoAnd = t.replace(/ and /g, " ").replace(/\s+/g, " ");
  const cands = [norm(m.name), norm(String(m.name || "").split("|")[0])];
  const sn = normTitle(m.slug);
  if (sn.length >= 5 && sn !== "sound") cands.push(sn);
  for (const cand of [...new Set(cands)]) {
    if (cand.length < 3) continue;
    const candNoAnd = cand.replace(/\band\b/g, " ").replace(/\s+/g, " ").trim();
    if (!t.includes(" " + cand + " ") && !tNoAnd.includes(" " + candNoAnd + " ")) continue;
    if (m.slug === "peek" && t.includes(" sneak peek ")) continue;
    if (m.slug === "icons" && !/icons (resource|texture) pack/.test(t)) continue;
    if (m.slug === "low-fire-pack" && t.includes(" low on fire ")) continue;
    if (m.slug === "sound" && !t.includes(" sounds mod ")) continue;
    if (m.slug === "crawl" && (t.includes(" dungeon crawl ") || t.includes(" without any mod "))) continue;
    if (m.slug === "ping" && (t.includes(" low ping ") || t.includes(" control your ping ") || !t.includes(" minecraft "))) continue;
    if (m.slug === "mob-heads" && t.includes(" just mob heads ")) continue;
    if (t.includes(" better than " + cand + " ") || t.includes(" alternative to " + cand + " ") || t.includes(" forget " + cand + " ")) continue;
    let longer = false;
    for (const [os, on] of allModNorms) if (os !== m.slug && on.length > cand.length && on.includes(cand) && t.includes(" " + on + " ")) { longer = true; break; }
    if (longer) continue;
    return true;
  }
  return false;
}
const PT = { m: "mod", r: "resource pack", s: "shader", d: "datapack" };
const mrGet = async p => { const r = await fetch("https://api.modrinth.com/v2" + p, { headers: { "User-Agent": UA } }); if (!r.ok) throw new Error(p + " " + r.status); return r.json(); };
const addExtra = (e, urls) => {
  const clean = urls.map(normImg);
  e.extra = [...new Set([...(e.extra || []), ...clean])].slice(0, 12);
  e.hq = [...new Set([...(e.hq || []), ...clean])].slice(0, 16);
  e.bilder = [...new Set([...(e.bilder || []), ...clean])].slice(0, 16);
};

// ---------- Stufe A: Modrinth ----------
const slugs = mods.filter(m => !m.cf).map(m => m.slug);
for (let i = 0; i < slugs.length; i += 80) {
  const ids = slugs.slice(i, i + 80);
  const r = await fetch("https://api.modrinth.com/v2/projects?ids=" + encodeURIComponent(JSON.stringify(ids)), { headers: { "User-Agent": UA } });
  if (!r.ok) { log.push("Modrinth " + r.status); continue; }
  for (const p of await r.json()) {
    ownPid[p.slug] = p.id || ownPid[p.slug];
    const e = (media[p.slug] ||= {});
    if (e.extra?.length) e.extra = e.extra.filter(u => !badImgUrl(u, p.slug));
    const gal = (p.gallery || []).sort((a, b) => (b.featured - a.featured) || (a.ordering - b.ordering));
    const body = imgUrls(p.body, p.slug).filter(u => !gal.some(g => g.url === u || g.raw_url === u));
    e.bilder = [...new Set([...gal.map(g => g.url), ...body, ...(e.extra || [])])].slice(0, 16);
    e.hq = [...new Set([...gal.map(g => g.raw_url || g.url), ...body, ...(e.extra || [])])].slice(0, 16);
    e.icon = p.icon_url || null;
    const desc = ytIds(p.body).map(id => ({ id, quelle: "beschreibung", punkte: 10 }));
    e.videos = [...desc, ...(e.videos || []).filter(v => v.quelle !== "beschreibung" && !desc.some(d => d.id === v.id))];
    e.links = { source: p.source_url || null, wiki: p.wiki_url || null };
  }
  await sleep(300);
}

// ---------- Stufe B: CurseForge (Screenshots + Beschreibungs-HTML + eingebettete Videos) ----------
const CF = process.env.CURSEFORGE_API_KEY;
if (CF) {
  const t = await fetch("https://api.curseforge.com/v1/games/432", { headers: { "x-api-key": CF, Accept: "application/json" } });
  log.push("CurseForge-Key: " + (t.ok ? "funktioniert" : "Fehler " + t.status));
  if (t.ok) for (const m of mods.filter(m => m.cf)) {
    const slug = String(m.cf).split("/").filter(Boolean).pop();
    const r = await fetch(`https://api.curseforge.com/v1/mods/search?gameId=432&slug=${encodeURIComponent(slug)}`, { headers: { "x-api-key": CF, Accept: "application/json" } });
    if (!r.ok) continue;
    const d = (await r.json()).data?.[0]; if (!d) continue;
    let bodyImgs = [], bodyYt = [];
    try {
      const dr = await fetch(`https://api.curseforge.com/v1/mods/${d.id}/description`, { headers: { "x-api-key": CF, Accept: "application/json" } });
      if (dr.ok) {
        const descHtml = (await dr.json()).data || "";
        bodyImgs = imgUrls(descHtml, m.slug);
        bodyYt = ytIds(descHtml).map(id => ({ id, quelle: "beschreibung", punkte: 10, status: "auto" }));
      }
    } catch {}
    const e = (media[m.slug] ||= {});
    const ssThumb = (d.screenshots || []).map(s => s.thumbnailUrl || s.url).filter(Boolean);
    const ssFull = (d.screenshots || []).map(s => s.url || s.thumbnailUrl).filter(Boolean);
    e.bilder = [...new Set([...ssThumb, ...bodyImgs, ...(e.bilder || [])])].slice(0, 16);
    e.hq = [...new Set([...ssFull, ...bodyImgs, ...(e.hq || e.bilder || [])])].slice(0, 16);
    e.icon = e.icon || d.logo?.url || null;
    if (bodyYt.length) {
      e.videos = [...bodyYt, ...(e.videos || []).filter(v => !bodyYt.some(b => b.id === v.id))];
    }
    if (d.links?.sourceUrl) e.links = { ...(e.links || {}), source: d.links.sourceUrl };
  }
} else log.push("CurseForge-Key: fehlt");

// ---------- Stufe B2: CurseForge-Screenshots & Beschreibung auch für Modrinth-Einträge ohne gute Bilder ----------
if (CF) {
  const nn = x => String(x || "").toLowerCase().replace(/\[.*?\]|\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");
  let nb = 0, hit = 0;
  for (const m of mods.filter(m => !m.cf)) {
    const e = media[m.slug] || {}; if ((e.breite || 0) >= 1280 || (e.cfSuche && e.cfSuche >= "2026-11-08" && (e.bilder || []).length > 0)) continue; if (nb >= 300) break; nb++;
    try { const r = await fetch(`https://api.curseforge.com/v1/mods/search?gameId=432&searchFilter=${encodeURIComponent(cleanSearchName(m.name))}&pageSize=10&sortField=2&sortOrder=desc`, { headers: { "x-api-key": CF, Accept: "application/json" } });
      const ee = (media[m.slug] ||= {}); ee.cfSuche = new Date().toISOString().slice(0, 10); if (!r.ok) continue;
      const d = (await r.json()).data.find(c => nn(c.name) === nn(m.name) || c.slug === m.slug); if (!d) continue;
      let foundUrls = (d.screenshots || []).map(x => x.url).filter(Boolean);
      if (!foundUrls.length) {
        const dr = await fetch(`https://api.curseforge.com/v1/mods/${d.id}/description`, { headers: { "x-api-key": CF, Accept: "application/json" } });
        if (dr.ok) foundUrls = imgUrls((await dr.json()).data || "", m.slug);
      }
      if (!foundUrls.length) continue;
      hit++; addExtra(ee, foundUrls);
    } catch {}
    await sleep(120);
  }
  log.push(`CurseForge-Bildersuche für Modrinth-Einträge: ${nb}, mit Bildern: ${hit}`);
}

// ---------- Stufe C: YouTube ----------
const YT = process.env.YOUTUBE_API_KEY;
function score(m, v) {
  const rawT = v.snippet.title || "", t = normTitle(rawT), d = String(v.snippet.description || "").toLowerCase();
  let p = 0, why = [];
  const slugRe = new RegExp(`modrinth\\.com\\/(mod|resourcepack|shader|datapack|project)\\/${m.slug.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9_-])`);
  const cfSlug = m.cf ? String(m.cf).split("/").filter(Boolean).pop().toLowerCase() : "";
  const cfRe = cfSlug ? new RegExp(`curseforge\\.com\\/minecraft\\/[^/]+\\/${cfSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9_-])`) : null;
  if (slugRe.test(d) || (cfRe && cfRe.test(d))) { p += 2; why.push("Projekt-Link in der Videobeschreibung"); }
  if (hasNameInTitle(m, rawT)) { p += 4; why.push("Name im Titel"); }
  if (/\b(mod|resource ?pack|texture ?pack|shader|shaders|datapack|data pack|showcase|review|spotlight|tutorial)\b/.test(t)) { p += 1; why.push("Typ im Titel"); }
  if (/\b(26\.\d|1\.21)\b/.test(rawT)) { p += 1; why.push("aktuelle Version"); }
  if (/\b(mcpe|bedrock|pocket edition|mcaddon|addonminecraftpe|pe 1|vintage story|hytale|terraria|roblox|sims|gta|fortnite|ark survival|helldivers|deep rock galactic|valorant|overwatch)\b/.test(t)) { p -= 6; why.push("anderes Spiel / Bedrock"); }
  if (!/\bminecraft\b/.test(t) && !/\bminecraft\b/.test(d) && norm(m.name).split(" ").length <= 1) { p -= 4; why.push("kein Minecraft-Bezug bei Kurzname"); }
  if (/\b(top ?\d+|\d+\+? ?(best|minecraft|mods|resource|texture|shader|datapack)|best (minecraft )?(mods|resource|texture|shader)|every minecraft|mods explained|packs compared|mods compared|tier ?list|modpack|let'?s play|let s play|episode ?\d+|smp)\b/.test(t) || /\bmods\b.*\bmods\b/.test(t)) { p -= 4; why.push("Sammelvideo"); }
  const dur = v.contentDetails?.duration || ""; const min = (+(dur.match(/(\d+)H/)?.[1] || 0)) * 60 + (+(dur.match(/(\d+)M/)?.[1] || 0));
  if (min > 25) { p -= 2; why.push("sehr lang"); }
  return { p, why, min };
}
if (YT) {
  const test = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=id&id=dQw4w9WgXcQ&key=${YT}`);
  log.push("YouTube-Key: " + (test.ok ? "funktioniert" : "Fehler " + test.status + " " + (await test.text()).slice(0, 200)));
  if (test.ok) {
    const todo = mods.filter(m => { const e = media[m.slug] || {}; return !e.gesucht && !(e.videos || []).some(v => v.punkte >= 5); })
      .sort((a, b) => (b.rolle === "K") - (a.rolle === "K") || (b.downloadsK || 0) - (a.downloadsK || 0));
    let n = 0;
    for (const m of todo) {
      if (n >= MAX_SEARCH) break;
      const q = `${cleanSearchName(m.name)} minecraft ${PT[m.pt || "m"]}`;
      const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${encodeURIComponent(q)}&key=${YT}`);
      n++;
      if (!r.ok) { log.push(`Suche gestoppt bei ${m.slug}: ${r.status}`); break; }
      const ids = (await r.json()).items.map(i => i.id.videoId).filter(Boolean);
      const e = (media[m.slug] ||= {}); e.gesucht = new Date().toISOString().slice(0, 10);
      if (!ids.length) continue;
      const vr = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${ids.join(",")}&key=${YT}`);
      if (!vr.ok) continue;
      const found = (await vr.json()).items.map(v => { const s = score(m, v); return { id: v.id, titel: v.snippet.title, kanal: v.snippet.channelTitle, minuten: s.min, punkte: s.p, warum: s.why, quelle: "youtube-suche" }; })
        .filter(v => v.punkte >= 2).sort((a, b) => b.punkte - a.punkte).slice(0, 4);
      e.videos = [...(e.videos || []).filter(v => v.quelle !== "youtube-suche" && !found.some(f => f.id === v.id)), ...found];
      await sleep(150);
    }
    log.push(`YouTube-Suchen in diesem Lauf: ${n}, noch offen: ${Math.max(0, todo.length - n)}`);
  }
} else log.push("YouTube-Key: fehlt");

// ---------- Stufe D: yt-dlp-Suche (kein API-Kontingent) für alles, was noch kein Video hat ----------
import { execFileSync } from "node:child_process";
const MAX_DLP = Number(process.env.MAX_DLP || 600);
const has = m => { const e = media[m.slug] || {}; return (e.bilder || []).length || (e.videos || []).length; };
const todoD = mods.filter(m => { const e = media[m.slug] || {}; const ok = (e.videos || []).some(v => v.status === "auto" || v.status === "ok"); return !ok && (!e.dlp || (!e.dlp2 && (e.breite || 0) < 1280)); })
  .sort((a, b) => Number(!!has(a)) - Number(!!has(b)) || Number(a.cat === "P") - Number(b.cat === "P") || (b.downloadsK || 0) - (a.downloadsK || 0));
let nd = 0, okD = 0;
for (const m of todoD) {
  if (nd >= MAX_DLP) break; nd++;
  const cname = cleanSearchName(m.name);
  const zweite = !!(media[m.slug] || {}).dlp; const q = zweite ? `${cname} ${m.pt === "r" ? "texture pack" : m.pt === "s" ? "shaders" : "mod"} showcase` : `${cname} minecraft ${PT[m.pt || "m"]}`;
  let j; try { j = JSON.parse(execFileSync("yt-dlp", ["--flat-playlist", "-J", "--no-warnings", `ytsearch8:${q}`], { encoding: "utf8", timeout: 60000, maxBuffer: 1 << 24 })); }
  catch (e) { log.push(`yt-dlp Fehler bei ${m.slug}: ${String(e.stderr || e).slice(0, 160)}`); if (nd > 3 && !okD) break; continue; }
  const e = (media[m.slug] ||= {}); e[zweite ? "dlp2" : "dlp"] = new Date().toISOString().slice(0, 10);
  const found = (j.entries || []).filter(v => v.id && v.duration).map(v => { const sv = { snippet: { title: v.title || "", description: v.description || "", channelTitle: v.channel || v.uploader || "" }, contentDetails: { duration: `PT${Math.floor(v.duration / 60)}M` } };
    const s = score(m, sv); return { id: v.id, titel: v.title, kanal: sv.snippet.channelTitle, minuten: s.min, punkte: s.p, warum: s.why, quelle: "yt-dlp" }; })
    .filter(v => v.punkte >= 3).sort((a, b) => b.punkte - a.punkte).slice(0, 3);
  if (found.length) okD++;
  e.videos = [...(e.videos || []).filter(v => !found.some(f => f.id === v.id)), ...found];
  await sleep(400);
}
log.push(`yt-dlp-Suchen: ${nd}, mit Treffer: ${okD}, noch offen: ${Math.max(0, todoD.length - nd)}`);

// ---------- Stufe F: Bilder/GIFs aus dem GitHub-README (für Einträge ohne gute Bilder) ----------
{
  const need = mods.filter(m => (media[m.slug]?.breite || 0) < 1280 && !media[m.slug]?.readme);
  const src = {};
  const mrNeed = need.filter(m => !m.cf);
  for (let i = 0; i < mrNeed.length; i += 80) { try { for (const p of await mrGet(`/projects?ids=${encodeURIComponent(JSON.stringify(mrNeed.slice(i, i + 80).map(m => m.slug)))}`)) src[p.slug] = p.source_url; } catch {} await sleep(200); }
  for (const m of need.filter(x => x.cf)) if (media[m.slug]?.links?.source) src[m.slug] = media[m.slug].links.source;
  let nr = 0, hr = 0;
  for (const m of need) {
    const u = src[m.slug]; const g = u && String(u).match(/github\.com\/([^/]+)\/([^/#?]+)/i);
    const e = (media[m.slug] ||= {}); if (!g) { e.readme = new Date().toISOString().slice(0, 10); continue; } nr++;
    const repo = g[1] + "/" + g[2].replace(/\.git$/, "");
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}/readme`, { headers: { Accept: "application/vnd.github.raw", "User-Agent": "mc-modpack media", ...(process.env.GITHUB_TOKEN ? { Authorization: "Bearer " + process.env.GITHUB_TOKEN } : {}) } });
      if (r.status === 404) e.readme = new Date().toISOString().slice(0, 10);
      if (!r.ok) continue; e.readme = new Date().toISOString().slice(0, 10); const md = await r.text();
      const raw = [...md.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g), ...md.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(x => x[1]);
      const imgs = [...new Set(raw.map(x => x.startsWith("http") ? x : `https://raw.githubusercontent.com/${repo}/HEAD/${x.replace(/^\.?\//, "")}`)
        .map(normImg)
        .filter(x => /\.(png|jpe?g|gif|webp)(\?|$)/i.test(x) || /user-attachments|githubusercontent\.com\/.*\/assets\//.test(x))
        .filter(x => !badImgUrl(x, m.slug) && !/logo|icon|banner|modrinth\.com\/.*\/(badge|compact)/i.test(x)))].slice(0, 8);
      if (imgs.length) { hr++; addExtra(e, imgs); }
    } catch {}
    await sleep(120);
  }
  log.push(`GitHub-README: ${nr} Repos geprüft, ${hr} mit Bildern`);
}

// ---------- Stufe E: Auflösung messen (nur Dateikopf laden), beste Bilder zuerst, Winzlinge raus ----------
function dims(b) {
  const u = new Uint8Array(b), dv = new DataView(b);
  if (u[0] === 0x89 && u[1] === 0x50) return [dv.getUint32(16), dv.getUint32(20)];
  if (u[0] === 0x47 && u[1] === 0x49) return [dv.getUint16(6, true), dv.getUint16(8, true)];
  if (u[0] === 0x52 && u[8] === 0x57) { const t = String.fromCharCode(u[12], u[13], u[14], u[15]);
    if (t === "VP8X") return [1 + (u[24] | u[25] << 8 | u[26] << 16), 1 + (u[27] | u[28] << 8 | u[29] << 16)];
    if (t === "VP8L") { const b0 = u[21], b1 = u[22], b2 = u[23], b3 = u[24]; return [1 + (((b1 & 0x3f) << 8) | b0), 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6))]; }
    if (t === "VP8 ") return [dv.getUint16(26, true) & 0x3fff, dv.getUint16(28, true) & 0x3fff]; }
  if (u[0] === 0xff && u[1] === 0xd8) { let i = 2; while (i < u.length - 9) { if (u[i] !== 0xff) { i++; continue; } const m = u[i + 1]; if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [dv.getUint16(i + 7), dv.getUint16(i + 5)]; i += 2 + dv.getUint16(i + 2); } }
  return null;
}
const DIMS = fs.existsSync("data/media-dims.json") ? JSON.parse(fs.readFileSync("data/media-dims.json", "utf8")) : {}; let measured = 0;
const isStripOrTiny = u => {
  const d = DIMS[u] || DIMS[u.replace(/_350\.webp$/, ".png")];
  if (!d || !d[0] || !d[1]) return false;
  const [w, h] = d;
  // Winzige Badges/Icons (≤160 px quadratisch, < 200×100) und Banner-Streifen raus; echte kleine Vorher/Nachher-Bilder (256×256) bleiben
  return w < 200 || h < 100 || (w === h && w <= 160) || w / h > 6;
};
for (const m of mods) {
  const e = media[m.slug]; if (!e) continue;
  const list = [...new Set([...(e.hq || []), ...(e.bilder || [])])];
  for (const url of list.slice(0, 16)) {
    if (DIMS[url] || measured > 2500) continue;
    try { const r = await fetch(url, { headers: { Range: "bytes=0-131071", "User-Agent": "mc-modpack media" } }); if (!r.ok) { DIMS[url] = [0, 0]; continue; } DIMS[url] = dims(await r.arrayBuffer()) || [0, 0]; measured++; } catch { DIMS[url] = [0, 0]; }
  }
  if (e.bilder?.length) e.bilder = e.bilder.filter(u => !badImgUrl(u, m.slug) && !isStripOrTiny(u));
  if (e.hq?.length) e.hq = e.hq.filter(u => !badImgUrl(u, m.slug) && !isStripOrTiny(u));
  if (e.extra?.length) e.extra = e.extra.filter(u => !badImgUrl(u, m.slug) && !isStripOrTiny(u));
  const px = u => (DIMS[u] ? DIMS[u][0] : 0);
  if (e.hq?.length) { const best = Math.max(...e.hq.map(px)); e.hq = e.hq.filter(u => px(u) === 0 || px(u) >= Math.min(960, best)).sort((a, b) => px(b) - px(a)); }
  e.breite = Math.max(0, ...(e.hq || e.bilder || []).map(px));
}
fs.writeFileSync("data/media-dims.json", JSON.stringify(DIMS));
log.push(`Auflösung gemessen: ${measured} Bilder`);

// ---------- Ausgabe ----------
for (const e of Object.values(media)) {
  if (!Array.isArray(e.videos)) continue;
  const seen = new Set();
  e.videos = e.videos.filter(v => v?.id && !seen.has(v.id) && seen.add(v.id));
  for (const v of e.videos) {
    if (v.quelle === "beschreibung") v.status = v.status || "auto";
    else if (v.status !== "ok" && v.status !== "nein") v.status = (v.punkte >= 5 && (v.warum || []).includes("Name im Titel")) ? "auto" : "review";
  }
}
// Visuelle Prüfung (Prüfbögen): data/video-review.json { "slug:videoId": "ok" | "nein" }
const REV = fs.existsSync("data/video-review.json") ? JSON.parse(fs.readFileSync("data/video-review.json", "utf8")) : {};
for (const [s, e] of Object.entries(media)) for (const v of e.videos || []) if (REV[s + ":" + v.id]) v.status = REV[s + ":" + v.id];
fs.writeFileSync(OUT, JSON.stringify(media));
writeMediaApp(media);
const all = mods.map(m => media[m.slug] || {});
const hd = all.filter(e => (e.breite || 0) >= 1280 || (e.videos || []).some(v => v.status === "auto" || v.status === "ok")).length;
const stat = { stand: new Date().toISOString(), eintraege: mods.length, mitBildern: all.filter(e => (e.bilder || []).length).length, hdOderVideo: hd,
  mitVideoSicher: all.filter(e => (e.videos || []).some(v => v.status === "auto" || v.status === "ok")).length,
  mitVideoReview: all.filter(e => (e.videos || []).some(v => v.status === "review")).length, log };
fs.writeFileSync("data/media-stand.json", JSON.stringify(stat, null, 1));
console.log(JSON.stringify(stat, null, 1));
