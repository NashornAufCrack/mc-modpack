// RSS-Feed der Updates: data/updates.xml aus data/updates.json (ein Eintrag pro Tag mit neuen Versionen).
// Läuft am Ende von check-updates.mjs und kann allein laufen: node scripts/rss.mjs
// Adresse: https://nashornaufcrack.github.io/mc-modpack/data/updates.xml
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const SITE = "https://nashornaufcrack.github.io/mc-modpack/neu/";
const SELF = "https://nashornaufcrack.github.io/mc-modpack/data/updates.xml";
const T = { m: "Mod", r: "Resource Pack", s: "Shader", d: "Datapack" };
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function writeRss(u = JSON.parse(fs.readFileSync("data/updates.json", "utf8"))) {
  const days = [...(u.verlauf || [])].filter(v => v.updates?.length).sort((a, b) => b.datum.localeCompare(a.datum)).slice(0, 30);
  const items = days.map(v => {
    const n = v.updates.length, de = v.datum.split("-").reverse().join(".");
    const li = v.updates.map(x => `<li><b>${esc(x.name)}</b> (${T[x.typ] || "Mod"}): ${esc(x.von || "neu")} → ${esc(x.auf)}${x.art && x.art !== "release" ? ` (${esc(x.art)})` : ""}</li>`).join("");
    return [
      "  <item>",
      `    <title>${esc(`${de}: ${n} ${n === 1 ? "neue Version" : "neue Versionen"}`)}</title>`,
      `    <link>${SITE}#updates</link>`,
      `    <guid isPermaLink="false">mc-modpack-updates-${v.datum}</guid>`,
      `    <pubDate>${new Date(v.datum + "T12:00:00Z").toUTCString()}</pubDate>`,
      `    <description>${esc(`<ul>${li}</ul>`)}</description>`,
      "  </item>",
    ].join("\n");
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Mod-Katalog ${esc(u.mc || "26.3")} – Updates</title>
  <link>${SITE}#updates</link>
  <atom:link href="${SELF}" rel="self" type="application/rss+xml"/>
  <description>Neue Versionen der Mods, Shader, Resource Packs und Datapacks im Mod-Katalog (Minecraft ${esc(u.mc || "26.3")}, Fabric). Täglich geprüft.</description>
  <language>de-de</language>
  <lastBuildDate>${new Date(u.checked || Date.now()).toUTCString()}</lastBuildDate>
${items.join("\n")}
</channel>
</rss>
`;
  fs.writeFileSync("data/updates.xml", xml);
  return items.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log("updates.xml:", writeRss(), "Einträge");
