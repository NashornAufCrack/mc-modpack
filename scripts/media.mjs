// Medien-Pipeline: Bilder + Videos für jeden Katalog-Eintrag.
// Stufe A: Modrinth (Galerie, Bilder und YouTube-Links aus der Beschreibung) – ohne Kontingent
// Stufe B: CurseForge (nur Einträge mit CurseForge-Link) – Key: CURSEFORGE_API_KEY
// Stufe C: YouTube-Suche mit Bewertung – Key: YOUTUBE_API_KEY, max. MAX_SEARCH Suchen pro Lauf
import fs from "node:fs";
const UA = "NashornAufCrack/mc-modpack media-pipeline (github.com/NashornAufCrack/mc-modpack)";
const MAX_SEARCH = Number(process.env.MAX_SEARCH || 90);
const mods = JSON.parse(fs.readFileSync("data/mods.json", "utf8"));
const OUT = "data/media.json";
const media = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
const log = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ytIds = s => [...new Set([...String(s || "").matchAll(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/g)].map(m => m[1]))];
const imgUrls = s => [...new Set([...String(s || "").matchAll(/https:\/\/[^\s"')<>]+\.(?:png|jpe?g|gif|webp)(?:\?[^\s"')<>]*)?/gi)].map(m => m[0]))]
  .filter(u => !/shields\.io|badge|discord|ko-?fi|patreon|bisect|curseforge\.com\/.*\/icons|\/icon\./i.test(u));
const norm = s => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\(.*?\)|\[.*?\]/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const PT = { m: "mod", r: "resource pack", s: "shader", d: "datapack" };

// ---------- Stufe A: Modrinth ----------
const slugs = mods.filter(m => !m.cf).map(m => m.slug);
for (let i = 0; i < slugs.length; i += 80) {
  const ids = slugs.slice(i, i + 80);
  const r = await fetch("https://api.modrinth.com/v2/projects?ids=" + encodeURIComponent(JSON.stringify(ids)), { headers: { "User-Agent": UA } });
  if (!r.ok) { log.push("Modrinth " + r.status); continue; }
  for (const p of await r.json()) {
    const e = (media[p.slug] ||= {});
    e.bilder = [...new Set([...(p.gallery || []).sort((a, b) => (b.featured - a.featured) || (a.ordering - b.ordering)).map(g => g.url), ...imgUrls(p.body)])].slice(0, 16);
    e.icon = p.icon_url || null;
    const desc = ytIds(p.body).map(id => ({ id, quelle: "beschreibung", punkte: 10 }));
    e.videos = [...desc, ...(e.videos || []).filter(v => v.quelle !== "beschreibung" && !desc.some(d => d.id === v.id))];
    e.links = { source: p.source_url || null, wiki: p.wiki_url || null };
  }
  await sleep(300);
}

// ---------- Stufe B: CurseForge ----------
const CF = process.env.CURSEFORGE_API_KEY;
if (CF) {
  const t = await fetch("https://api.curseforge.com/v1/games/432", { headers: { "x-api-key": CF, Accept: "application/json" } });
  log.push("CurseForge-Key: " + (t.ok ? "funktioniert" : "Fehler " + t.status));
  if (t.ok) for (const m of mods.filter(m => m.cf)) {
    const slug = String(m.cf).split("/").filter(Boolean).pop();
    const r = await fetch(`https://api.curseforge.com/v1/mods/search?gameId=432&slug=${encodeURIComponent(slug)}`, { headers: { "x-api-key": CF, Accept: "application/json" } });
    if (!r.ok) continue; const d = (await r.json()).data?.[0]; if (!d) continue;
    const e = (media[m.slug] ||= {}); e.bilder = [...new Set([...(e.bilder || []), ...(d.screenshots || []).map(s => s.url)])].slice(0, 16); e.icon = e.icon || d.logo?.url || null;
  }
} else log.push("CurseForge-Key: fehlt");

// ---------- Stufe C: YouTube ----------
const YT = process.env.YOUTUBE_API_KEY;
function score(m, v) {
  const t = norm(v.snippet.title), d = String(v.snippet.description || "").toLowerCase(), n = norm(m.name);
  let p = 0, why = [];
  if (d.includes("modrinth.com/") && d.includes(m.slug.toLowerCase())) { p += 5; why.push("Modrinth-Link in der Videobeschreibung"); }
  if (n && (" " + t + " ").includes(" " + n + " ")) { p += 3; why.push("Name im Titel"); }
  if (/(mod|resource ?pack|texture ?pack|shader|datapack|data pack)/.test(t)) { p += 1; why.push("Typ im Titel"); }
  if (/\b(26\.\d|1\.21)/.test(v.snippet.title)) { p += 1; why.push("aktuelle Version"); }
  if (/top ?\d+|best mods|mods? (you|for)|modpack|\bmods\b.*\bmods\b/.test(t)) { p -= 3; why.push("Sammelvideo"); }
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
      const q = `${m.name} minecraft ${PT[m.pt || "m"]}`;
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
      e.videos = [...(e.videos || []).filter(v => v.quelle !== "youtube-suche"), ...found];
      await sleep(150);
    }
    log.push(`YouTube-Suchen in diesem Lauf: ${n}, noch offen: ${Math.max(0, todo.length - n)}`);
  }
} else log.push("YouTube-Key: fehlt");

// ---------- Ausgabe ----------
for (const e of Object.values(media)) for (const v of e.videos || []) v.status = v.status || (v.punkte >= 5 ? "auto" : "review");
fs.writeFileSync(OUT, JSON.stringify(media));
const all = mods.map(m => media[m.slug] || {});
const stat = { stand: new Date().toISOString(), eintraege: mods.length, mitBildern: all.filter(e => (e.bilder || []).length).length,
  mitVideoSicher: all.filter(e => (e.videos || []).some(v => v.status === "auto" || v.status === "ok")).length,
  mitVideoReview: all.filter(e => (e.videos || []).some(v => v.status === "review")).length, log };
fs.writeFileSync("data/media-stand.json", JSON.stringify(stat, null, 1));
console.log(JSON.stringify(stat, null, 1));
