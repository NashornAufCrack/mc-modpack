// Schlanke Medien-Datei für die Website: nur Bilder und freigegebene Videos (ohne Prüf-Notizen, Links, Suchspuren).
// Läuft am Ende von media.mjs und kann allein laufen, z. B. nach einer Video-Prüfung (data/video-review.json).
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export function writeMediaApp(media = JSON.parse(fs.readFileSync("data/media.json", "utf8"))) {
  const REV = fs.existsSync("data/video-review.json") ? JSON.parse(fs.readFileSync("data/video-review.json", "utf8")) : {};
  const out = {};
  for (const [s, e] of Object.entries(media)) {
    const o = {};
    if (e.hq?.length) o.hq = e.hq;
    if (e.bilder?.length) o.bilder = e.bilder;
    const v = (Array.isArray(e.videos) ? e.videos : [])
      .map(x => ({ ...x, status: REV[s + ":" + x.id] || x.status }))
      .filter(x => x.status !== "nein" && x.status !== "review").slice(0, 3)
      .map(x => (x.titel ? { id: x.id, titel: x.titel } : { id: x.id }));
    if (v.length) o.videos = v;
    if (Object.keys(o).length) out[s] = o;
  }
  fs.writeFileSync("data/media-app.json", JSON.stringify(out));
  return Object.keys(out).length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log("media-app.json:", writeMediaApp(), "Einträge");
