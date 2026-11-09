// Schlanke Medien-Datei für die Website: nur Bilder und freigegebene Videos (ohne Prüf-Notizen, Links, Suchspuren).
// Läuft am Ende von media.mjs und kann allein laufen, z. B. nach einer Video-Prüfung (data/video-review.json).
// b/hd: Vorschaubild liegt selbst gehostet unter media/yt/ (scripts/yt-thumbs.py), sonst lädt die Website es von YouTube.
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const normImg = u => String(u || "").trim().replace(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/(raw|blob)\//i, "https://raw.githubusercontent.com/$1/");
const imgKey = u => {
  const n = normImg(u);
  const mr = n.match(/cdn\.modrinth\.com\/data\/([A-Za-z0-9]+)\/images\/([0-9a-f]{40})/i);
  if (mr) return `mr:${mr[1]}:${mr[2].toLowerCase()}`;
  const cf = n.match(/media\.forgecdn\.net\/attachments\/(?:thumbnails\/)?(\d+\/\d+)\//i);
  if (cf) return `cf:${cf[1]}`;
  return n.split("?")[0].toLowerCase();
};
const toThumb = u => {
  const n = normImg(u);
  const m = n.match(/^(https:\/\/cdn\.modrinth\.com\/data\/[A-Za-z0-9]+\/images\/[0-9a-f]{40})\.(png|jpe?g|webp)$/i);
  return m ? `${m[1]}_350.webp` : n;
};
function dedupeList(urls, thumb = false) {
  const out = [], seenK = new Set(), seenStem = new Set();
  for (const raw of urls || []) {
    if (!raw) continue;
    const u = normImg(raw);
    if (/^https:\/\/cdn\.modrinth\.com\/data\/[A-Za-z0-9]+\/[^/]+\.(png|webp|jpe?g)(\?|$)/i.test(u)) continue;
    const k = imgKey(u);
    if (seenK.has(k)) continue;
    const fn = u.split("?")[0].split("/").pop().toLowerCase().replace(/_350\.webp$/, "").replace(/\.(png|jpe?g|webp|gif)$/, "");
    if (fn.length >= 4 && !/^(image|screenshot|preview|default|bandicam|javaw|minecraft|\d+)$/.test(fn)) {
      if (seenStem.has(fn)) continue;
      seenStem.add(fn);
    }
    seenK.add(k);
    out.push(thumb ? toThumb(u) : u);
  }
  if (thumb && out.length > 1) {
    const stat = out.filter(x => !/\.gif(\?|$)/i.test(x));
    const gifs = out.filter(x => /\.gif(\?|$)/i.test(x));
    if (stat.length && gifs.length) return [...stat, ...gifs];
  }
  return out;
}

export function writeMediaApp(media = JSON.parse(fs.readFileSync("data/media.json", "utf8"))) {
  const REV = fs.existsSync("data/video-review.json") ? JSON.parse(fs.readFileSync("data/video-review.json", "utf8")) : {};
  const out = {};
  for (const [s, e] of Object.entries(media)) {
    const o = {};
    if (e.icon) o.icon = e.icon;
    const rawAll = [...(e.hq || []), ...(e.bilder || [])];
    const hq = dedupeList(rawAll, false).slice(0, 16);
    const bilder = dedupeList(rawAll, true).slice(0, 16);
    if (hq.length) o.hq = hq;
    if (bilder.length) o.bilder = bilder;
    const seen = new Set();
    const v = (Array.isArray(e.videos) ? e.videos : [])
      .map(x => ({ ...x, status: REV[s + ":" + x.id] || x.status }))
      .filter(x => x?.id && x.status !== "nein" && x.status !== "review" && !seen.has(x.id) && seen.add(x.id)).slice(0, 3)
      .map(x => ({ id: x.id, ...(x.titel ? { titel: x.titel } : {}), ...(fs.existsSync(`media/yt/${x.id}.webp`) ? { b: 1 } : {}), ...(fs.existsSync(`media/yt/${x.id}-hd.webp`) ? { hd: 1 } : {}) }));
    if (v.length) o.videos = v;
    if (Object.keys(o).length) out[s] = o;
  }
  fs.writeFileSync("data/media-app.json", JSON.stringify(out));
  return Object.keys(out).length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log("media-app.json:", writeMediaApp(), "Einträge");
