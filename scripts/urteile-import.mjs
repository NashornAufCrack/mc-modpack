// Übernimmt die Urteile der Prüfseite (Artifact „Videoprüfung Mod-Katalog“, Datenbank-Sammlung „urteile“) in die Website-Daten.
//
// Aufruf: node scripts/urteile-import.mjs <ordner>
//   <ordner> = Export der Sammlung, z. B. ArtifactData list (collection "urteile", out_dir <ordner>)
//              → <ordner>/urteile/<slug>:<videoId>.json mit { urteil: "ok" | "nein", am, wer }
//
// - schreibt data/video-review.json und den Status in data/media.json, danach data/media-app.json (Website)
// - ein auf der Prüfseite zurückgenommenes Urteil (Dokument gelöscht) macht das Video wieder offen
// - data/pruefseite-urteile.json merkt sich den zuletzt übernommenen Stand der Prüfseite; pruefseite.py
//   lässt diese Videos auf der Seite, damit man ein Urteil später noch ändern kann
import fs from "node:fs";
import path from "node:path";
import { writeMediaApp } from "./media-app.mjs";

const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) { console.error("Ordner mit dem Export der Sammlung „urteile“ fehlt."); process.exit(1); }

const walk = d => fs.readdirSync(d, { withFileTypes: true })
  .flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".json") ? [path.join(d, e.name)] : []));
const KEY = /^[a-z0-9._-]+:[A-Za-z0-9_-]{11}$/;
const neu = {}, kaputt = [];
for (const f of walk(dir)) {
  const k = path.basename(f, ".json");
  let v; try { v = JSON.parse(fs.readFileSync(f, "utf8")); } catch { kaputt.push(k); continue; }
  if (KEY.test(k) && (v?.urteil === "ok" || v?.urteil === "nein")) neu[k] = v.urteil; else kaputt.push(k);
}

const read = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : d);
const rev = read("data/video-review.json", {});
const alt = read("data/pruefseite-urteile.json", {});
const media = read("data/media.json", {});
const video = k => { const i = k.indexOf(":"); return (media[k.slice(0, i)]?.videos || []).find(v => v.id === k.slice(i + 1)); };

const st = { neu: 0, geaendert: 0, gleich: 0, zurueck: 0, unbekannt: [] };
// zurückgenommen: kam von der Prüfseite, ist dort nicht mehr entschieden und wurde nicht anderweitig geändert
for (const [k, u] of Object.entries(alt)) {
  if (k in neu || rev[k] !== u) continue;
  delete rev[k]; st.zurueck++;
  const v = video(k); if (v && (v.status === "ok" || v.status === "nein")) v.status = "review";
}
for (const [k, u] of Object.entries(neu)) {
  if (rev[k] === u) st.gleich++; else if (k in rev) st.geaendert++; else st.neu++;
  rev[k] = u;
  const v = video(k); if (v) v.status = u; else st.unbekannt.push(k);
}

const zeilen = o => "{\n" + Object.entries(o).map(([k, v]) => JSON.stringify(k) + ": " + JSON.stringify(v)).join(",\n") + "\n}";
const sortiert = Object.fromEntries(Object.entries(neu).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync("data/video-review.json", zeilen(rev));
fs.writeFileSync("data/pruefseite-urteile.json", zeilen(sortiert));
fs.writeFileSync("data/media.json", JSON.stringify(media));
const n = writeMediaApp(media);

const ok = Object.values(neu).filter(u => u === "ok").length;
console.log(`Prüfseite: ${Object.keys(neu).length} Urteile (${ok} passt, ${Object.keys(neu).length - ok} raus) – ` +
  `${st.neu} neu, ${st.geaendert} geändert, ${st.gleich} unverändert, ${st.zurueck} zurückgenommen.`);
if (st.unbekannt.length) console.log(`Nicht mehr im Katalog (Urteil trotzdem gemerkt): ${st.unbekannt.join(", ")}`);
if (kaputt.length) console.log(`Übersprungen (kein gültiges Urteil): ${kaputt.join(", ")}`);
console.log("media-app.json:", n, "Einträge");
