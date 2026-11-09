// Update-Check (täglich + Sonntags-Bericht): neue 26.3-Versionen für ALLES (Mods, Resource Packs, Shader, Datapacks) suchen,
// automatisch übernehmen (data/files.json + data/app-data.json), und festhalten, was keine neue Version hat.
// Schreibt data/updates.json (für die Website) und UPDATES.md (Update-Datei).
import fs from "node:fs";
import { writeRss } from "./rss.mjs";
const A = "https://api.modrinth.com/v2";
const MC = "26.3";
const UA = { "User-Agent": "NashornAufCrack/mc-modpack update-check (github.com/NashornAufCrack/mc-modpack)" };
const files = JSON.parse(fs.readFileSync("data/files.json", "utf8"));
const app = JSON.parse(fs.readFileSync("data/app-data.json", "utf8"));
const mods = JSON.parse(fs.readFileSync("data/mods.json", "utf8"));
const NAME = Object.fromEntries(mods.map(m => [m.slug, m.name]));
const prev = fs.existsSync("data/updates.json") ? JSON.parse(fs.readFileSync("data/updates.json", "utf8")) : {};
const post = async (url, body) => { const r = await fetch(url, { method: "POST", headers: { ...UA, "Content-Type": "application/json" }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(url + " " + r.status); return r.json(); };
const get = async url => { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(url + " " + r.status); return r.json(); };
const LOADERS = { m: ["fabric"], r: ["minecraft"], s: ["iris", "optifine"], d: ["datapack"] };
const isMR = s => String(files[s][0]).startsWith("https://cdn.modrinth.com/");
const today = new Date().toISOString().slice(0, 10);
// Vom Nutzer festgelegte Versionen: nie automatisch ändern, nur melden
const PIN = new Set(["sodium", "iris", "voxy", "photon-shader"]);
const isPre = v => /alpha|beta|pre|rc|snapshot/i.test(String(v));
const verfuegbar = [];

const updates = [], stand = prev.stand || {};
// Art der aktuell verwendeten Datei (release/beta/alpha), damit Beta-only-Projekte weiter automatisch laufen
const curType = {}; const allMR = Object.keys(files).filter(s => isMR(s) && files[s][2]);
for (let i = 0; i < allMR.length; i += 300) { try { const r = await post(`${A}/version_files`, { hashes: allMR.slice(i, i + 300).map(s => files[s][2]), algorithm: "sha1" }); for (const s of allMR.slice(i, i + 300)) { const v = r[files[s][2]]; if (v) { curType[s] = v.version_type; stand[s] = { ...(stand[s] || {}), version: files[s][6], seit: stand[s]?.version === files[s][6] && stand[s]?.seit ? stand[s].seit : v.date_published.slice(0, 10) }; } } } catch {} }
for (const [t, loaders] of Object.entries(LOADERS)) {
  const slugs = Object.keys(files).filter(s => (files[s][8] || "m") === t && isMR(s) && files[s][2]);
  for (let i = 0; i < slugs.length; i += 300) {
    const part = slugs.slice(i, i + 300);
    const upd = await post(`${A}/version_files/update`, { hashes: part.map(s => files[s][2]), algorithm: "sha1", loaders, game_versions: [MC] });
    for (const s of part) {
      const v = upd[files[s][2]];
      if (v && v.files?.length && v.version_number !== files[s][6] && (PIN.has(s) || (v.version_type !== "release" && (curType[s] || (isPre(files[s][6]) ? "beta" : "release")) === "release"))) {
        verfuegbar.push({ slug: s, name: NAME[s] || s, typ: t, aktuell: files[s][6], neu: v.version_number, art: v.version_type, grund: PIN.has(s) ? "festgelegte Version" : "nur als " + v.version_type, changelog: v.changelog ? v.changelog.trim() : null });
        if (!stand[s] || stand[s].version !== files[s][6]) stand[s] = { version: files[s][6], seit: stand[s]?.seit || null };
      } else if (v && v.files?.length && v.version_number !== files[s][6]) {
        const f = v.files.find(x => x.primary) || v.files[0];
        const deps = v.dependencies.filter(d => d.dependency_type === "required" && d.project_id).map(d => d.project_id);
        updates.push({ slug: s, name: NAME[s] || files[s][7] || s, typ: t, von: files[s][6], auf: v.version_number, art: v.version_type, datum: v.date_published.slice(0, 10), deps, alt: files[s], altStand: stand[s], changelog: v.changelog ? v.changelog.trim() : null });
        files[s] = [f.url, f.filename, f.hashes.sha1, f.hashes.sha512, f.size, files[s][5], v.version_number, files[s][7], t];
        stand[s] = { version: v.version_number, seit: v.date_published.slice(0, 10) };
      } else if (!stand[s] || stand[s].version !== files[s][6]) stand[s] = { version: files[s][6], seit: stand[s]?.seit || null };
    }
  }
}
// Abhängigkeiten neuer Versionen: Projekt-IDs → Slugs, fehlende Bibliotheken für 26.3 nachladen (auch deren Abhängigkeiten).
// Gibt es eine neue Pflicht-Abhängigkeit für 26.3 nicht, wird das Update zurückgehalten, sonst startet das Pack nicht.
const IGNORE = new Set(["qsl", "quilted-fabric-api", "connector", "modefite-item-definition-backport"]); // für Fabric 26.3 bedeutungslos
const PT = { mod: "m", resourcepack: "r", shader: "s", datapack: "d" };
const LD = { mod: ["fabric"], resourcepack: ["minecraft"], shader: ["iris", "optifine"], datapack: ["datapack"] };
const idInfo = {}, neuLib = [];
async function projects(ids) { // unbekannte IDs (Abfrage gescheitert) zählen als nicht prüfbar → Update wird zurückgehalten
  const need = [...new Set(ids)].filter(x => !(x in idInfo));
  for (let i = 0; i < need.length; i += 80) try { for (const p of await get(`${A}/projects?ids=${encodeURIComponent(JSON.stringify(need.slice(i, i + 80)))}`)) idInfo[p.id] = { slug: p.slug, type: p.project_type, title: p.title }; } catch {}
  return { ps: ids.map(x => idInfo[x]).filter(Boolean), offen: ids.filter(x => !idInfo[x]) };
}
async function lib(p) { // true = vorhanden oder vollständig nachgeladen; halb aufgelöste Bibliotheken werden wieder entfernt
  if (files[p.slug] || IGNORE.has(p.slug)) return true;
  try {
    const vs = await get(`${A}/project/${p.slug}/version?game_versions=${encodeURIComponent(JSON.stringify([MC]))}&loaders=${encodeURIComponent(JSON.stringify(LD[p.type] || ["fabric"]))}`);
    const v = vs.find(x => x.version_type === "release") || vs[0]; if (!v) return false;
    const f = v.files.find(x => x.primary) || v.files[0];
    files[p.slug] = [f.url, f.filename, f.hashes.sha1, f.hashes.sha512, f.size, [], v.version_number, p.title || p.slug, PT[p.type] || "m"]; neuLib.push(p.slug);
    const { ps: sub, offen } = await projects(v.dependencies.filter(d => d.dependency_type === "required" && d.project_id).map(d => d.project_id));
    files[p.slug][5] = sub.map(x => x.slug).filter(x => !IGNORE.has(x));
    let ok = !offen.length; for (const q of sub) if (ok && !(await lib(q))) ok = false;
    if (!ok) { delete files[p.slug]; neuLib.splice(neuLib.indexOf(p.slug), 1); }
    return ok;
  } catch { if (files[p.slug] && neuLib.includes(p.slug)) { delete files[p.slug]; neuLib.splice(neuLib.indexOf(p.slug), 1); } return false; }
}
for (const u of [...updates]) {
  const { ps, offen } = await projects(u.deps); const fehlt = offen.map(x => "unbekannt (" + x + ")");
  for (const p of ps) if (!(await lib(p))) fehlt.push(p.title || p.slug);
  if (fehlt.length) {
    files[u.slug] = u.alt; stand[u.slug] = u.altStand || { version: u.von, seit: null }; updates.splice(updates.indexOf(u), 1);
    verfuegbar.push({ slug: u.slug, name: u.name, typ: u.typ, aktuell: u.von, neu: u.auf, art: u.art, grund: "Abhängigkeit fehlt für " + MC + ": " + fehlt.join(", ") });
  } else { const d = ps.map(p => p.slug).filter(x => !IGNORE.has(x) && files[x]); if (d.length) files[u.slug][5] = [...new Set([...files[u.slug][5], ...d])]; }
  delete u.deps; delete u.alt; delete u.altStand;
}

// Veröffentlichungsdatum der aktuellen Datei für alles ohne Datum nachtragen (zeigt, wie lange es keine neue Version gab)
const noDate = Object.keys(stand).filter(s => files[s] && !stand[s].seit && isMR(s));
for (let i = 0; i < noDate.length; i += 300) {
  try { const r = await post(`${A}/version_files`, { hashes: noDate.slice(i, i + 300).map(s => files[s][2]), algorithm: "sha1" });
    for (const s of noDate.slice(i, i + 300)) { const v = r[files[s][2]]; if (v) stand[s].seit = v.date_published.slice(0, 10); } } catch {}
}
for (const s of Object.keys(stand)) if (!files[s]) delete stand[s];

// Nächste Minecraft-Version: wie viele empfohlene Inhalte sind schon bereit?
let next = null;
try {
  const rel = (await get(`${A}/tag/game_version`)).filter(t => t.version_type === "release").map(t => t.version);
  const idx = rel.indexOf(MC);
  if (idx > 0) {
    const nv = rel[idx - 1]; const kern = mods.filter(m => m.rolle === "K" && files[m.slug] && isMR(m.slug)).map(m => m.slug); const missing = [];
    for (let i = 0; i < kern.length; i += 80) for (const p of await get(`${A}/projects?ids=${encodeURIComponent(JSON.stringify(kern.slice(i, i + 80)))}`)) if (!p.game_versions.includes(nv)) missing.push(p.slug);
    next = { version: nv, total: kern.length, ready: kern.length - missing.length, missing };
  }
} catch {}

// Ergebnis: Updates werden sofort wirksam (Website liest app-data.json)
app.files = { ...app.files, ...Object.fromEntries([...updates.map(u => u.slug), ...neuLib].map(x => [x, files[x]])) };
fs.writeFileSync("data/files.json", JSON.stringify(files));
// Katalog-Quelle mitziehen, damit ein lokaler Build die Updates nicht zurückdreht
if (fs.existsSync("quelle/files.json")) fs.writeFileSync("quelle/files.json", JSON.stringify(files));
fs.writeFileSync("data/app-data.json", JSON.stringify(app));
const heute = [...((prev.verlauf || []).find(x => x.datum === today)?.updates || []).filter(u => !updates.some(n => n.slug === u.slug)), ...updates];
const verlauf = [...(prev.verlauf || []).filter(x => x.datum !== today), ...(heute.length ? [{ datum: today, updates: heute }] : [])].slice(-60);
const alt = Object.entries(stand).filter(([, v]) => v.seit).sort((a, b) => a[1].seit.localeCompare(b[1].seit));
const woche = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
const ohneNeue = alt.filter(([s, v]) => v.seit < woche && NAME[s]).map(([s, v]) => ({ slug: s, name: NAME[s] || s, version: v.version, seit: v.seit }));
const UPD = { checked: new Date().toISOString(), mc: MC, updates, verlauf, ohneNeue, verfuegbar, stand, next };
fs.writeFileSync("data/updates.json", JSON.stringify(UPD, null, 0));
writeRss(UPD); // RSS-Feed data/updates.xml

const T = { m: "Mod", r: "Resource Pack", s: "Shader", d: "Datapack" };
const md = [`# Update-Stand (${MC})`, "", `Zuletzt geprüft: ${today}`, "",
  `## Neue Versionen in den letzten 7 Tagen (automatisch übernommen)`, "",
  ...(verlauf.filter(x => x.datum >= woche).flatMap(x => x.updates.map(u => `- ${x.datum}: **${u.name}** (${T[u.typ]}) ${u.von} → ${u.auf}${u.art !== "release" ? " (" + u.art + ")" : ""}`)) || []),
  verlauf.some(x => x.datum >= woche) ? "" : "- keine", "",
  `## Verfügbar, aber nicht automatisch übernommen (${verfuegbar.length})`, "", ...verfuegbar.map(v => `- ${v.name}: ${v.aktuell} → ${v.neu} (${v.grund})`), verfuegbar.length ? "" : "- keine", "",
  `## Ohne neue Version seit über einer Woche (${ohneNeue.length})`, "", "Sortiert nach Alter der aktuellen Datei.", "",
  ...ohneNeue.map(o => `- ${o.name}: ${o.version} (seit ${o.seit})`), "",
  ...(next ? [`## Nächste Minecraft-Version ${next.version}`, "", `${next.ready} von ${next.total} empfohlenen Inhalten sind bereit.`, "", ...next.missing.map(s => `- fehlt noch: ${NAME[s] || s}`)] : [])];
fs.writeFileSync("UPDATES.md", md.join("\n") + "\n");
if (neuLib.length) console.log("Neue Bibliotheken: " + neuLib.join(", "));
console.log(`${updates.length} Updates übernommen, ${ohneNeue.length} ohne neue Version seit >7 Tagen, nächste Version: ${next ? next.version + " " + next.ready + "/" + next.total : "keine"}`);
