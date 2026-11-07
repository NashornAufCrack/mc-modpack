// Export: .mrpack, Prism-Instanz (mit RAM), Server-Pack; setzt Resource-Pack-Reihenfolge in options.txt.
import JSZip from "jszip";
import { pack } from "./pack.svelte";
import { rpTopDown } from "./rp";

export const KIT = "https://nashornaufcrack.github.io/mc-modpack/downloads/Test-Kit.zip";
export const TESTSEED = "-4172144997902289642";

export const manualList = () => [...pack.sel].filter(s => !pack.data.files[s] && pack.BY[s]?.cf);
const fname = (s: string) => decodeURIComponent(pack.data.files[s][1]);
export function optionsTxt(mods: Set<string>) {
  const B = (k: string) => pack.cv("_base", k); const rps = [...mods].filter(s => pack.BY[s].pt === "r");
  const order = ["vanilla", ...rpTopDown(rps).reverse().map(s => "file/" + fname(s))];
  return [`renderDistance:${B("renderDistance")}`, `simulationDistance:${B("simulationDistance")}`, `maxFps:${B("maxFps")}`, "enableVsync:false", "mipmapLevels:4", "biomeBlendRadius:2", "resourcePacks:" + JSON.stringify(order)].join("\n") + "\n";
}
export function packFiles() {
  const r = pack.resolve(); const files: Record<string, string> = {};
  files["options.txt"] = optionsTxt(r.mods); files["config/defaultoptions/options.txt"] = files["options.txt"];
  const sp = [...r.mods].find(s => pack.BY[s].pt === "s");
  if (sp && r.mods.has("iris")) { files["config/iris.properties"] = "enableShaders=true\nshaderPack=" + fname(sp) + "\n";
  }
  const manual = manualList();
  files["LIES-MICH.txt"] = `Erstellt mit dem Mod-Katalog 26.3 (${new Date().toLocaleDateString("de-DE")}).\nResource-Pack-Reihenfolge, Sichtweite und FPS-Limit sind schon gesetzt.\nArbeitsspeicher: ${pack.ramGB(r)} GB.\n` + (manual.length ? `\nBITTE SELBST HERUNTERLADEN und in den Ordner mods legen (der Autor erlaubt keinen automatischen Download):\n${manual.map(s => "- " + pack.name(s) + ": " + pack.BY[s].cf).join("\n")}\n` : "");
  if (r.mods.has("spark")) files["TEST-ANLEITUNG.txt"] = "Test-Kit: " + KIT + "\nSeed: " + TESTSEED + "\n";
  return files;
}
const dirOf = (s: string) => { const t = pack.BY[s]?.pt || pack.data.files[s][8] || "m"; return t === "r" ? "resourcepacks" : t === "s" ? "shaderpacks" : t === "d" ? "datapacks" : "mods"; };
function exportSet(server: boolean) {
  const r = pack.resolve(); let all = [...r.mods, ...r.libs];
  if (server) { const keep = new Set<string>(); const stack = [...r.mods].filter(s => pack.BY[s].ampel === "R" || pack.BY[s].ampel === "Y").concat(pack.data.mods.filter(m => m.cat === "S" && pack.data.files[m.slug] && (m.slug !== "voxy-server-side" || r.mods.has("voxy"))).map(m => m.slug));
    while (stack.length) { const s = stack.pop()!; if (keep.has(s) || !pack.data.files[s]) continue; const m = pack.BY[s]; if (m && m.pt && m.pt !== "m" && m.pt !== "d") continue; keep.add(s); pack.data.files[s][5].forEach((d: string) => stack.push(d)); }
    all = [...keep]; }
  return { r, all };
}
export type Status = (t: string) => void;
async function save(blob: Blob, name: string) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
const safe = (n: string) => n.replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-") || "Mein-Pack";
export async function exportMrpack(name: string, server: boolean, st: Status) {
  const { r, all } = exportSet(server);
  const env = (s: string) => { const m = pack.BY[s]; const a = m ? m.ampel : "Y"; return { client: m?.cat === "S" ? "optional" : "required", server: a === "G" ? "unsupported" : a === "R" || m?.cat === "S" ? "required" : "optional" }; };
  const files = all.filter(s => !(server && dirOf(s) === "datapacks")).map(s => { const f = pack.data.files[s]; return { path: dirOf(s) + "/" + fname(s), hashes: { sha1: f[2], sha512: f[3] }, env: env(s), downloads: [f[0]], fileSize: f[4] }; });
  const zip = new JSZip(); zip.file("modrinth.index.json", JSON.stringify({ formatVersion: 1, game: "minecraft", versionId: "1.0.0", name: name + (server ? " Server" : ""), summary: "Erstellt mit dem Mod-Katalog 26.3", files, dependencies: { minecraft: "26.3", "fabric-loader": "0.20.1" } }, null, 2));
  if (!server) for (const [p, c] of Object.entries(packFiles())) zip.file("overrides/" + p, c);
  await save(await zip.generateAsync({ type: "blob", compression: "DEFLATE" }), safe(name) + (server ? "-Server" : "") + ".mrpack");
  st(server ? "Server-Pack heruntergeladen." : `Heruntergeladen. In der Modrinth App hineinziehen, danach Arbeitsspeicher auf ${pack.ramGB(r)} GB stellen.`);
}
export async function exportPrism(name: string, st: Status) {
  const { r, all } = exportSet(false); const zip = new JSZip();
  zip.file("instance.cfg", `[General]\nConfigVersion=1.2\nInstanceType=OneSix\nname=${name}\nOverrideMemory=true\nMaxMemAlloc=${pack.ramGB(r) * 1024}\nMinMemAlloc=1024\nnotes=Erstellt mit dem Mod-Katalog 26.3\n`);
  zip.file("mmc-pack.json", JSON.stringify({ components: [{ uid: "net.minecraft", version: "26.3", important: true }, { uid: "net.fabricmc.fabric-loader", version: "0.20.1" }], formatVersion: 1 }, null, 1));
  for (const [p, c] of Object.entries(packFiles())) zip.file(".minecraft/" + p, c);
  const list = all.filter(s => dirOf(s) !== "datapacks"); let done = 0; const fail: string[] = [];
  const q = [...list]; await Promise.all(Array.from({ length: 6 }, async () => { while (q.length) { const s = q.shift()!; try { const res = await fetch(pack.data.files[s][0]); if (!res.ok) throw 0; zip.file(".minecraft/" + dirOf(s) + "/" + fname(s), await res.arrayBuffer()); } catch { fail.push(pack.name(s)); } st(`Lade Dateien von Modrinth: ${++done} von ${list.length} …`); } }));
  if (fail.length) { st(`${fail.length} Dateien nicht ladbar (${fail.slice(0, 4).join(", ")}). Nimm stattdessen die .mrpack-Datei.`); return; }
  st("Packe die Instanz …"); await save(await zip.generateAsync({ type: "blob", compression: "STORE" }), safe(name) + "-Prism.zip");
  st(`Fertig. Prism: Instanz hinzufügen › Importieren › Datei wählen. Arbeitsspeicher (${pack.ramGB(r)} GB) ist schon eingestellt.`);
}
