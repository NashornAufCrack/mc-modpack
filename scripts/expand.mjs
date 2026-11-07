// Katalog erweitern: passende Kandidaten (Modrinth + CurseForge) mit Dateien für 26.3 auflösen.
// Ergebnis: data/auto.json { mods: [...], files: {...}, log }  – wird lokal mit dem Katalog zusammengeführt.
// CurseForge-Dateien mit erlaubter Weitergabe werden nach cf/ gespiegelt (Modrinth App + Browser laden nur von Modrinth/GitHub).
import fs from "node:fs";
import crypto from "node:crypto";
const UA = "NashornAufCrack/mc-modpack expand (github.com/NashornAufCrack/mc-modpack)";
const CF = process.env.CURSEFORGE_API_KEY;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cand = JSON.parse(fs.readFileSync("data/candidates.json", "utf8"));
const mods = JSON.parse(fs.readFileSync("data/mods.json", "utf8"));
const files0 = JSON.parse(fs.readFileSync("data/files.json", "utf8"));
const have = new Set(mods.map(m => m.slug));
const WANT_CF = new Set((process.env.WANT_CF || "studious-keybinds,cinematic-interactions").split(","));
const log = []; const out = { mods: [], files: {}, log };
const mr = async p => { const r = await fetch("https://api.modrinth.com/v2" + p, { headers: { "User-Agent": UA } }); if (!r.ok) throw new Error(p + " " + r.status); return r.json(); };

// ---------- Filter + Einordnung ----------
const BAD = new Set(["technology", "magic"]);
const KEEP = ["optimization", "utility", "decoration", "worldgen", "game-mechanics", "storage", "transportation", "management", "social", "food", "mobs", "equipment", "adventure", "cursed", "economy"];
function place(m) {
  const c = new Set(m.cats || []); const clientOnly = m.server === "unsupported" || m.server === "optional";
  if (m.pt === "resourcepack") return ["V", "Resource Packs"];
  if (m.pt === "shader") return ["V", "Shader"];
  if (m.pt === "datapack") return c.has("worldgen") ? ["T", /struct|village|dungeon|tower|ruin/i.test(m.name + m.desc) ? "Strukturen" : "Terrain"] : ["G", "Inhalt"];
  if (c.has("optimization")) return ["P", "Performance"];
  if (c.has("worldgen")) return ["T", /struct|village|dungeon|tower|ruin/i.test(m.name + m.desc) ? "Strukturen" : "Terrain"];
  if (clientOnly && (c.has("decoration") || c.has("cursed"))) return ["V", "Animation & Modelle"];
  if (clientOnly && (c.has("utility") || c.has("management") || c.has("social") || c.has("storage"))) return ["V", "HUD & Bedienung"];
  if (c.has("utility") || c.has("transportation") || c.has("management") || c.has("storage") || c.has("game-mechanics")) return ["G", "Komfort"];
  return ["G", "Inhalt"];
}
const pickMR = cand.modrinth.filter(m => {
  const c = new Set(m.cats || []);
  if (c.has("library") && c.size <= 2) return false;
  if ([...c].some(x => BAD.has(x)) && !c.has("optimization") && !c.has("utility")) return false;
  if (m.pt === "mod" && ![...c].some(x => KEEP.includes(x))) return false;
  const min = m.pt === "mod" ? 1_000_000 : m.pt === "resourcepack" ? 500_000 : m.pt === "shader" ? 300_000 : 300_000;
  return m.dl >= min;
});
log.push(`Modrinth: ${pickMR.length} von ${cand.modrinth.length} Kandidaten passen`);

// ---------- Modrinth: Dateien für 26.3 ----------
const depIds = new Set();
for (const m of pickMR) {
  try {
    const q = m.pt === "mod" ? `&loaders=${encodeURIComponent('["fabric"]')}` : m.pt === "datapack" ? `&loaders=${encodeURIComponent('["datapack"]')}` : "";
    const vs = await mr(`/project/${m.slug}/version?game_versions=${encodeURIComponent('["26.3"]')}${q}`);
    const v = vs.find(x => x.version_type === "release") || vs[0]; if (!v) { log.push("keine 26.3-Datei: " + m.slug); continue; }
    const f = v.files.find(x => x.primary) || v.files[0];
    const deps = v.dependencies.filter(d => d.dependency_type === "required" && d.project_id).map(d => d.project_id); deps.forEach(d => depIds.add(d));
    const [cat, sub] = place(m); const pt = { mod: "m", resourcepack: "r", shader: "s", datapack: "d" }[m.pt];
    out.mods.push({ slug: m.slug, name: m.name, cat, sub, ampel: m.server === "required" ? "R" : m.server === "optional" ? "Y" : "G", rolle: "O", downloadsK: Math.round(m.dl / 1000), notiz: m.desc, quellen: ["AUTO"], mc: "26.3", loader: pt === "m" ? "fabric" : "", einstellungen: null, ueberschneidung: "", pt, gal: m.gallery.length, vn: v.version_number, img: m.gallery, neu: true });
    out.files[m.slug] = [f.url, f.filename, f.hashes.sha1, f.hashes.sha512, f.size, deps, v.version_number, "", pt];
  } catch (e) { log.push(String(e)); }
  await sleep(220);
}
// Abhängigkeiten (Bibliotheken) auflösen
const missing = [...depIds];
const idSlug = {};
for (let i = 0; i < missing.length; i += 80) { try { for (const p of await mr(`/projects?ids=${encodeURIComponent(JSON.stringify(missing.slice(i, i + 80)))}`)) idSlug[p.id] = p; } catch (e) { log.push(String(e)); } }
for (const f of Object.values(out.files)) f[5] = f[5].map(id => idSlug[id]?.slug || id);
for (const p of Object.values(idSlug)) {
  if (have.has(p.slug) || out.files[p.slug] || files0[p.slug]) continue;
  try { const vs = await mr(`/project/${p.slug}/version?game_versions=${encodeURIComponent('["26.3"]')}&loaders=${encodeURIComponent('["fabric"]')}`); const v = vs[0]; if (!v) continue; const f = v.files.find(x => x.primary) || v.files[0];
    out.files[p.slug] = [f.url, f.filename, f.hashes.sha1, f.hashes.sha512, f.size, v.dependencies.filter(d => d.dependency_type === "required" && d.project_id).map(d => d.project_id), v.version_number, p.title, "m"]; } catch {}
  await sleep(200);
}

// ---------- CurseForge: nur was es nicht auf Modrinth gibt ----------
const cfC = cand.curseforge.filter(c => c.datei && c.datei.versionen.includes("26.3") && c.datei.versionen.includes("Fabric"));
const onMR = new Set();
for (let i = 0; i < cfC.length; i += 100) { try { for (const p of await mr(`/projects?ids=${encodeURIComponent(JSON.stringify(cfC.slice(i, i + 100).map(c => c.slug)))}`)) onMR.add(p.slug); } catch {} await sleep(200); }
// Nur gezielt gewünschte CurseForge-Mods (Namensabgleich mit Modrinth ist zu unzuverlässig für Automatik)
const cfPick = cand.curseforge.filter(c => WANT_CF.has(c.slug) && c.datei && !have.has(c.slug));
log.push(`CurseForge: ${cfC.length} mit 26.3-Fabric-Datei, ${cfC.length - onMR.size} nicht auf Modrinth, ausgewählt: ${cfPick.map(c => c.slug).join(", ")}`);
fs.rmSync("cf", { recursive: true, force: true }); fs.mkdirSync("cf", { recursive: true });
for (const c of cfPick) {
  const f = c.datei; let url = f.url, sha1 = f.sha1, sha512 = null, size = f.size;
  if (c.verteilen && f.url) {
    try { const r = await fetch(f.url); if (!r.ok) throw new Error(r.status); const buf = Buffer.from(await r.arrayBuffer());
      const name = f.name.replace(/[^\w.+-]+/g, "_"); fs.writeFileSync("cf/" + name, buf);
      sha1 = crypto.createHash("sha1").update(buf).digest("hex"); sha512 = crypto.createHash("sha512").update(buf).digest("hex"); size = buf.length;
      url = `https://raw.githubusercontent.com/NashornAufCrack/mc-modpack/main/cf/${encodeURIComponent(name)}`;
    } catch (e) { log.push("Spiegeln fehlgeschlagen: " + c.slug + " " + e); url = null; }
  } else url = null;
  const deps = [];
  out.mods.push({ slug: c.slug, name: c.name, cat: "V", sub: "HUD & Bedienung", ampel: "G", rolle: "O", downloadsK: Math.round(c.dl / 1000), notiz: c.desc, quellen: ["CF"], mc: "26.3", loader: "fabric", einstellungen: null, ueberschneidung: "", pt: "m", gal: c.bilder.length, vn: f.name, img: c.bilder.slice(0, 6), cf: c.url, neu: true, cfVerteilen: c.verteilen });
  if (url) out.files[c.slug] = [url, f.name.replace(/[^\w.+-]+/g, "_"), sha1, sha512, size, deps, f.name, "", "m"];
}
fs.writeFileSync("data/auto.json", JSON.stringify(out));
console.log(log.join("\n")); console.log(`Neu: ${out.mods.length} Einträge, ${Object.keys(out.files).length} Dateien`);
