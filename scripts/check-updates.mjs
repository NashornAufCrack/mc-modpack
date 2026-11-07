// Prüft wöchentlich Modrinth: neue Versionen für 26.3 und Bereitschaft für die nächste MC-Version.
import fs from "node:fs";
const A = "https://api.modrinth.com/v2";
const UA = { "User-Agent": "NashornAufCrack/mc-modpack update-check" };
const files = JSON.parse(fs.readFileSync("data/files.json", "utf8"));
const mods = JSON.parse(fs.readFileSync("data/mods.json", "utf8"));
const slugs = Object.keys(files).filter(s => (files[s][8] || "m") === "m");
const post = async (url, body) => (await fetch(url, { method: "POST", headers: { ...UA, "Content-Type": "application/json" }, body: JSON.stringify(body) })).json();
const get = async url => (await fetch(url, { headers: UA })).json();

const upd = await post(`${A}/version_files/update`, { hashes: slugs.map(s => files[s][2]), algorithm: "sha1", loaders: ["fabric"], game_versions: ["26.3"] });
const updates = slugs.flatMap(s => { const v = upd[files[s][2]]; return v && v.version_number !== files[s][6] ? [{ slug: s, from: files[s][6], to: v.version_number, type: v.version_type }] : []; });

const tags = await get(`${A}/tag/game_version`);
const releases = tags.filter(t => t.version_type === "release").map(t => t.version);
const idx = releases.indexOf("26.3");
let next = null;
if (idx > 0) {
  const nv = releases[idx - 1];
  const kern = mods.filter(m => m.rolle === "K").map(m => m.slug);
  const missing = [];
  for (let i = 0; i < kern.length; i += 80) {
    const ps = await get(`${A}/projects?ids=${encodeURIComponent(JSON.stringify(kern.slice(i, i + 80)))}`);
    for (const p of ps) if (!p.game_versions.includes(nv)) missing.push(p.slug);
  }
  next = { version: nv, total: kern.length, ready: kern.length - missing.length, missing };
}
fs.writeFileSync("data/updates.json", JSON.stringify({ checked: new Date().toISOString(), updates, next }, null, 1));
console.log(`${updates.length} Updates, nächste Version: ${next ? next.version + " " + next.ready + "/" + next.total : "keine"}`);
