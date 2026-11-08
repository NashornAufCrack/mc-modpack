// Abhängigkeiten reparieren: Projekt-IDs → Slugs übersetzen und fehlende Abhängigkeiten (26.3) samt Datei holen.
// Ergebnis: data/deps-fix.json { ids: {projektId: slug}, files: {slug: fileEntry}, fehlt: [..] }
import fs from "node:fs";
const A = "https://api.modrinth.com/v2", MC = "26.3";
const UA = { "User-Agent": "NashornAufCrack/mc-modpack fixdeps (github.com/NashornAufCrack/mc-modpack)" };
const get = async u => { const r = await fetch(A + u, { headers: UA }); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const files = JSON.parse(fs.readFileSync("data/files.json", "utf8"));
const out = { ids: {}, files: {}, fehlt: [], log: [] };
const LOADERS = { mod: ["fabric"], resourcepack: ["minecraft"], shader: ["iris", "optifine"], datapack: ["datapack"] };
const T = { mod: "m", resourcepack: "r", shader: "s", datapack: "d" };
// Runde für Runde, weil neue Abhängigkeiten selbst wieder Abhängigkeiten haben können
for (let round = 0; round < 4; round++) {
  const missing = [...new Set(Object.values({ ...files, ...out.files }).flatMap(f => f[5]).filter(d => !files[d] && !out.files[d] && !out.ids[d] && !out.fehlt.includes(d)))];
  if (!missing.length) break;
  out.log.push(`Runde ${round + 1}: ${missing.length} fehlend`);
  let projects = [];
  for (let i = 0; i < missing.length; i += 80) { try { projects.push(...await get(`/projects?ids=${encodeURIComponent(JSON.stringify(missing.slice(i, i + 80)))}`)); } catch (e) { out.log.push(String(e)); } await sleep(200); }
  for (const d of missing) {
    const p = projects.find(x => x.id === d || x.slug === d);
    if (!p) { out.fehlt.push(d); continue; }
    if (p.id === d && p.slug !== d) out.ids[d] = p.slug;
    if (files[p.slug] || out.files[p.slug]) continue;
    try {
      const loaders = LOADERS[p.project_type] || ["fabric"];
      const vs = await get(`/project/${p.slug}/version?game_versions=${encodeURIComponent(JSON.stringify([MC]))}&loaders=${encodeURIComponent(JSON.stringify(loaders))}`);
      const v = vs.find(x => x.version_type === "release") || vs[0];
      if (!v) { out.fehlt.push(p.slug + " (keine 26.3-Datei)"); continue; }
      const f = v.files.find(x => x.primary) || v.files[0];
      const deps = v.dependencies.filter(x => x.dependency_type === "required" && x.project_id).map(x => x.project_id);
      out.files[p.slug] = [f.url, f.filename, f.hashes.sha1, f.hashes.sha512, f.size, deps, v.version_number, p.title, T[p.project_type] || "m"];
      out.log.push(`+ ${p.slug} ${v.version_number}`);
    } catch (e) { out.log.push(p.slug + " " + e); }
    await sleep(150);
  }
}
// IDs in allen Abhängigkeitslisten durch Slugs ersetzen (auch in neu geholten Dateien)
const map = d => out.ids[d] || d;
for (const f of Object.values(out.files)) f[5] = [...new Set(f[5].map(map))];
fs.writeFileSync("data/deps-fix.json", JSON.stringify(out, null, 1));
console.log(out.log.join("\n")); console.log("IDs:", Object.keys(out.ids).length, "neue Dateien:", Object.keys(out.files).length, "fehlt:", out.fehlt);
