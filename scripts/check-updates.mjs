// Update-Check (täglich + Sonntags-Bericht): neue 26.3-Versionen für ALLES (Mods, Resource Packs, Shader, Datapacks) suchen,
// automatisch übernehmen (data/files.json + data/app-data.json), und festhalten, was keine neue Version hat.
// Schreibt data/updates.json (für die Website) und UPDATES.md (Update-Datei).
import fs from "node:fs";
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

const updates = [], stand = prev.stand || {};
for (const [t, loaders] of Object.entries(LOADERS)) {
  const slugs = Object.keys(files).filter(s => (files[s][8] || "m") === t && isMR(s) && files[s][2]);
  for (let i = 0; i < slugs.length; i += 300) {
    const part = slugs.slice(i, i + 300);
    const upd = await post(`${A}/version_files/update`, { hashes: part.map(s => files[s][2]), algorithm: "sha1", loaders, game_versions: [MC] });
    for (const s of part) {
      const v = upd[files[s][2]];
      if (v && v.files?.length && v.version_number !== files[s][6]) {
        const f = v.files.find(x => x.primary) || v.files[0];
        const deps = v.dependencies.filter(d => d.dependency_type === "required" && d.project_id).map(d => d.project_id);
        updates.push({ slug: s, name: NAME[s] || files[s][7] || s, typ: t, von: files[s][6], auf: v.version_number, art: v.version_type, datum: v.date_published.slice(0, 10), deps });
        files[s] = [f.url, f.filename, f.hashes.sha1, f.hashes.sha512, f.size, files[s][5], v.version_number, files[s][7], t];
        stand[s] = { version: v.version_number, seit: v.date_published.slice(0, 10) };
      } else if (!stand[s] || stand[s].version !== files[s][6]) stand[s] = { version: files[s][6], seit: stand[s]?.seit || null };
    }
  }
}
// Projekt-IDs neuer Abhängigkeiten in Slugs übersetzen (nur bekannte), sonst alte Liste behalten
const idSlug = {}; const ids = [...new Set(updates.flatMap(u => u.deps))];
for (let i = 0; i < ids.length; i += 80) try { for (const p of await get(`${A}/projects?ids=${encodeURIComponent(JSON.stringify(ids.slice(i, i + 80)))}`)) idSlug[p.id] = p.slug; } catch {}
for (const u of updates) { const d = u.deps.map(x => idSlug[x]).filter(x => x && files[x]); if (d.length) files[u.slug][5] = [...new Set([...files[u.slug][5], ...d])]; delete u.deps; }

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
app.files = { ...app.files, ...Object.fromEntries(updates.map(u => [u.slug, files[u.slug]])) };
fs.writeFileSync("data/files.json", JSON.stringify(files));
fs.writeFileSync("data/app-data.json", JSON.stringify(app));
const verlauf = [...(prev.verlauf || []).filter(x => x.datum !== today), ...(updates.length ? [{ datum: today, updates }] : [])].slice(-60);
const alt = Object.entries(stand).filter(([, v]) => v.seit).sort((a, b) => a[1].seit.localeCompare(b[1].seit));
const woche = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
const ohneNeue = alt.filter(([, v]) => v.seit < woche).map(([s, v]) => ({ slug: s, name: NAME[s] || s, version: v.version, seit: v.seit }));
fs.writeFileSync("data/updates.json", JSON.stringify({ checked: new Date().toISOString(), mc: MC, updates, verlauf, ohneNeue, stand, next }, null, 0));

const T = { m: "Mod", r: "Resource Pack", s: "Shader", d: "Datapack" };
const md = [`# Update-Stand (${MC})`, "", `Zuletzt geprüft: ${today}`, "",
  `## Neue Versionen in den letzten 7 Tagen (automatisch übernommen)`, "",
  ...(verlauf.filter(x => x.datum >= woche).flatMap(x => x.updates.map(u => `- ${x.datum}: **${u.name}** (${T[u.typ]}) ${u.von} → ${u.auf}${u.art !== "release" ? " (" + u.art + ")" : ""}`)) || []),
  verlauf.some(x => x.datum >= woche) ? "" : "- keine", "",
  `## Ohne neue Version seit über einer Woche (${ohneNeue.length})`, "", "Sortiert nach Alter der aktuellen Datei.", "",
  ...ohneNeue.map(o => `- ${o.name}: ${o.version} (seit ${o.seit})`), "",
  ...(next ? [`## Nächste Minecraft-Version ${next.version}`, "", `${next.ready} von ${next.total} empfohlenen Inhalten sind bereit.`, "", ...next.missing.map(s => `- fehlt noch: ${NAME[s] || s}`)] : [])];
fs.writeFileSync("UPDATES.md", md.join("\n") + "\n");
console.log(`${updates.length} Updates übernommen, ${ohneNeue.length} ohne neue Version seit >7 Tagen, nächste Version: ${next ? next.version + " " + next.ready + "/" + next.total : "keine"}`);
