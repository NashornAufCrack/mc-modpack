// Kandidaten finden: beliebte 26.3-Fabric-Inhalte auf Modrinth und CurseForge, die noch nicht im Katalog sind.
// Schreibt data/cf.json (CurseForge-Metadaten inkl. Dateien) und data/candidates.json.
import fs from "node:fs";
const UA = "NashornAufCrack/mc-modpack discover (github.com/NashornAufCrack/mc-modpack)";
const CF = process.env.CURSEFORGE_API_KEY;
const mods = JSON.parse(fs.readFileSync("data/mods.json", "utf8"));
const have = new Set(mods.map(m => m.slug));
const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const haveNames = new Set(mods.map(m => norm(m.name)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = { modrinth: [], curseforge: [] };

// ---- Modrinth: Top nach Downloads je Typ ----
for (const [pt, n] of [["mod", 600], ["resourcepack", 200], ["shader", 60], ["datapack", 100]]) {
  for (let off = 0; off < n; off += 100) {
    const facets = [["versions:26.3"], ["project_type:" + pt]]; if (pt === "mod") facets.push(["categories:fabric"]);
    const r = await fetch(`https://api.modrinth.com/v2/search?index=downloads&limit=100&offset=${off}&facets=${encodeURIComponent(JSON.stringify(facets))}`, { headers: { "User-Agent": UA } });
    if (!r.ok) break; const hits = (await r.json()).hits; if (!hits.length) break;
    for (const h of hits) if (!have.has(h.slug)) out.modrinth.push({ slug: h.slug, name: h.title, pt, desc: h.description, dl: h.downloads, follows: h.follows, cats: h.categories, client: h.client_side, server: h.server_side, icon: h.icon_url, gallery: h.gallery?.slice(0, 4) || [], updated: h.date_modified });
    await sleep(250);
  }
}

// ---- CurseForge ----
const H = { "x-api-key": CF, Accept: "application/json", "Content-Type": "application/json" };
async function cf(path, body) { const r = await fetch("https://api.curseforge.com" + path, body ? { method: "POST", headers: H, body: JSON.stringify(body) } : { headers: H }); if (!r.ok) throw new Error(path + " " + r.status); return r.json(); }
if (CF) {
  const found = new Map();
  // classId 6 = Mods, modLoaderType 4 = Fabric, sortField 2 = Popularität
  for (let i = 0; i < 1000; i += 50) {
    let d; try { d = await cf(`/v1/mods/search?gameId=432&classId=6&gameVersion=26.3&modLoaderType=4&sortField=2&sortOrder=desc&pageSize=50&index=${i}`); } catch (e) { console.log(String(e)); break; }
    if (!d.data.length) break; d.data.forEach(m => found.set(m.id, m)); await sleep(200);
  }
  for (const q of ["Studious Keybinds", "Cinematic Interactions", "Studious"]) {
    try { const d = await cf(`/v1/mods/search?gameId=432&classId=6&searchFilter=${encodeURIComponent(q)}&pageSize=20`); d.data.forEach(m => found.set(m.id, m)); } catch {}
  }
  // passende Datei für 26.3 + Fabric
  const pick = m => (m.latestFilesIndexes || []).find(f => f.gameVersion === "26.3" && (f.modLoader === 4 || f.modLoader == null));
  const ids = [...found.values()].map(m => pick(m)?.fileId).filter(Boolean);
  const files = new Map();
  for (let i = 0; i < ids.length; i += 50) { try { const d = await cf("/v1/mods/files", { fileIds: ids.slice(i, i + 50) }); d.data.forEach(f => files.set(f.id, f)); } catch (e) { console.log(String(e)); } await sleep(200); }
  for (const m of found.values()) {
    const fi = pick(m); const f = fi && files.get(fi.fileId);
    out.curseforge.push({ id: m.id, slug: m.slug, name: m.name, desc: m.summary, dl: m.downloadCount, url: m.links?.websiteUrl, icon: m.logo?.url || null,
      bilder: (m.screenshots || []).map(s => s.url), verteilen: m.allowModDistribution !== false, aufModrinth: haveNames.has(norm(m.name)),
      datei: f ? { id: f.id, name: f.fileName, url: f.downloadUrl, size: f.fileLength, sha1: (f.hashes || []).find(h => h.algo === 1)?.value || null, deps: (f.dependencies || []).filter(d => d.relationType === 3).map(d => d.modId), versionen: f.gameVersions } : null });
  }
} else console.log("CurseForge-Key fehlt");
fs.writeFileSync("data/candidates.json", JSON.stringify(out));
console.log(`Modrinth-Kandidaten: ${out.modrinth.length}, CurseForge gefunden: ${out.curseforge.length}, davon mit 26.3-Fabric-Datei: ${out.curseforge.filter(c => c.datei).length}, Verteilung erlaubt: ${out.curseforge.filter(c => c.verteilen).length}`);
for (const c of out.curseforge.filter(c => /studious|cinematic/i.test(c.name))) console.log(JSON.stringify({ n: c.name, slug: c.slug, v: c.verteilen, d: c.datei && { name: c.datei.name, url: c.datei.url, vers: c.datei.versionen } }));
