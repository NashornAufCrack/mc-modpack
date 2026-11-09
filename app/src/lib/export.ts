// Export: .mrpack, Prism-Instanz (mit RAM), Server-Pack; setzt Resource-Pack-Reihenfolge in options.txt.
import JSZip from "jszip";
import { pack } from "./pack.svelte";
import { rpTopDown } from "./rp";
import { buildAutoConfigFiles } from "./auto-cfg";

export const KIT = "https://nashornaufcrack.github.io/mc-modpack/downloads/Test-Kit.zip";
export const TESTSEED = "-4172144997902289642";

export const manualList = () => [...pack.sel].filter(s => !pack.data.files[s] && pack.BY[s]?.cf);
/** Dateiname im Pack: Windows-taugliche Zeichen, bei doppelten Namen (z. B. Herds Panic liefert talkbubbles-1.0.8.jar) mit Slug davor */
let FN: Record<string, string> | null = null;
export function fname(s: string) {
  if (!FN) {
    FN = {}; const by: Record<string, string[]> = {};
    for (const [k, f] of Object.entries(pack.data.files)) { let n = String(f[1]); try { n = decodeURIComponent(n); } catch {} n = n.replace(/[\\/:*?"<>|]+/g, "_"); FN[k] = n; (by[n.toLowerCase()] ||= []).push(k); }
    for (const ks of Object.values(by)) if (ks.length > 1) for (const k of ks) FN[k] = k + "--" + FN[k];
  }
  return FN[s];
}
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
  Object.assign(files, buildAutoConfigFiles(r.mods, pack.data.x.rpo || {}, fname, (s, k) => pack.cv(s, k)));
  const manual = manualList(); const tips = pack.tips(r); const autos = pack.autos(r); const dp = [...r.mods].some(s => pack.typ(s) === "d");
  files["LIES-MICH.txt"] = `Erstellt mit dem Mod-Katalog 26.3 (${new Date().toLocaleDateString("de-DE")}).\nResource-Pack-Reihenfolge, Sichtweite und FPS-Limit sind schon gesetzt.\nArbeitsspeicher: ${pack.ramGB(r)} GB.\n`
    + (dp ? "\nDatapacks liegen im Ordner datapacks und werden von Global Packs in jede NEU erstellte Welt geladen.\n" : "")
    + (autos.length ? `\nAUTOMATISCH AUFEINANDER ABGESTIMMT (bereits in den Config-Dateien gesetzt):\n${autos.map(a => "- " + [a.slug, ...a.partners].map(x => pack.name(x)).join(" + ") + ": " + a.text).join("\n")}\n` : "")
    + (tips.length ? `\nNACH DEM ERSTEN START EINSTELLEN:\n${tips.map(t => "- " + t.mods.map(x => pack.name(x)).join(" + ") + ": " + t.text).join("\n")}\n` : "")
    + (manual.length ? `\nBITTE SELBST HERUNTERLADEN und in den Ordner mods legen (der Autor erlaubt keinen automatischen Download):\n${manual.map(s => "- " + pack.name(s) + ": " + pack.BY[s].cf).join("\n")}\n` : "");
  if (r.mods.has("spark")) files["TEST-ANLEITUNG.txt"] = "Test-Kit: " + KIT + "\nSeed: " + TESTSEED + "\n";
  return files;
}
const dirOf = (s: string) => { const t = pack.typ(s); return t === "r" ? "resourcepacks" : t === "s" ? "shaderpacks" : t === "d" ? "datapacks" : "mods"; };
export const pathOf = (s: string) => dirOf(s) + "/" + fname(s);
export function exportSet(server: boolean) {
  const r = pack.resolve(); let all = [...r.mods, ...r.libs];
  if (server) { // nur was der Server braucht: Mods/Datapacks mit Server-Teil + die gewählten Server-Werkzeuge (pack.srvOn)
    const keep = new Set<string>(); const stack = [...r.mods].filter(s => pack.BY[s].cat !== "S" && (pack.BY[s].ampel === "R" || pack.BY[s].ampel === "Y")).concat(pack.srvTools(r).filter(m => pack.srvOn(m.slug, r)).map(m => m.slug));
    // reine Client-Mods (z. B. Litematica als Modrinth-Abhängigkeit von Litematica Server Paster) gehören nicht auf den Server
    while (stack.length) { const s = stack.pop()!; if (keep.has(s) || !pack.data.files[s]) continue; const t = pack.typ(s); if (t !== "m" && t !== "d") continue; if (t === "m" && pack.BY[s]?.ampel === "G") continue; keep.add(s); pack.data.files[s][5].concat(pack.implicit(s)).forEach((d: string) => stack.push(d)); }
    all = [...keep]; }
  return { r, all };
}
export type Status = (t: string) => void;
async function save(blob: Blob, name: string) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
const safe = (n: string) => n.replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-") || "Mein-Pack";
export async function exportMrpack(name: string, server: boolean, st: Status) {
  const { r, all } = exportSet(server);
  const env = (s: string) => { const m = pack.BY[s]; const a = m ? m.ampel : "Y"; return { client: m?.cat === "S" ? "optional" : "required", server: a === "G" ? "unsupported" : a === "R" || m?.cat === "S" ? "required" : "optional" }; };
  const files = all.map(s => { const f = pack.data.files[s]; return { path: pathOf(s), hashes: { sha1: f[2], sha512: f[3] }, env: env(s), downloads: [f[0]], fileSize: f[4] }; });
  const zip = new JSZip(); zip.file("modrinth.index.json", JSON.stringify({ formatVersion: 1, game: "minecraft", versionId: "1.0.0", name: name + (server ? " Server" : ""), summary: "Erstellt mit dem Mod-Katalog 26.3", files, dependencies: { minecraft: "26.3", "fabric-loader": "0.20.1" } }, null, 2));
  if (!server) for (const [p, c] of Object.entries(packFiles())) zip.file("overrides/" + p, c);
  await save(await zip.generateAsync({ type: "blob", compression: "DEFLATE" }), safe(name) + (server ? "-Server" : "") + ".mrpack");
  st(server ? "Server-Pack heruntergeladen." : `Heruntergeladen. In der Modrinth App hineinziehen, danach Arbeitsspeicher auf ${pack.ramGB(r)} GB stellen.`);
}
// packwiz: Pack als Textdateien (pack.toml, index.toml, je Datei eine .pw.toml) für Server-Admins und Git
const tq = (v: string) => JSON.stringify(v); // TOML-Basisstrings verstehen dieselben Escapes wie JSON
async function sha256(t: string) { return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, "0")).join(""); }
export async function exportPackwiz(name: string, st: Status) {
  const { r, all } = exportSet(false); const zip = new JSZip(); const root = safe(name) + "-packwiz/";
  const idx: string[] = [];
  for (const s of [...all].sort()) {
    const f = pack.data.files[s]; if (!f) continue; const m = pack.BY[s];
    const mr = f[0].match(/^https:\/\/cdn\.modrinth\.com\/data\/([A-Za-z0-9]+)\/versions\/([A-Za-z0-9]+)\//);
    const toml = `name = ${tq(m?.name || f[7] || s)}\nfilename = ${tq(fname(s))}\nside = ${tq(m?.ampel === "G" ? "client" : "both")}\n\n[download]\nurl = ${tq(f[0])}\nhash-format = "sha512"\nhash = ${tq(f[3])}\n`
      + (mr ? `\n[update]\n[update.modrinth]\nmod-id = ${tq(mr[1])}\nversion = ${tq(mr[2])}\n` : "");
    const path = dirOf(s) + "/" + s + ".pw.toml"; zip.file(root + path, toml);
    idx.push(`[[files]]\nfile = ${tq(path)}\nhash = ${tq(await sha256(toml))}\nmetafile = true\n`);
  }
  // Einstellungen nur beim ersten Installieren setzen, spätere eigene Änderungen bleiben (preserve)
  for (const [path, c] of Object.entries(packFiles())) { zip.file(root + path, c); idx.push(`[[files]]\nfile = ${tq(path)}\nhash = ${tq(await sha256(c))}\npreserve = true\n`); }
  const index = `hash-format = "sha256"\n\n` + idx.join("\n");
  zip.file(root + "index.toml", index);
  zip.file(root + "pack.toml", `name = ${tq(name)}\nauthor = "Mod-Katalog 26.3"\nversion = "1.0.0"\npack-format = "packwiz:1.1.0"\n\n[index]\nfile = "index.toml"\nhash-format = "sha256"\nhash = ${tq(await sha256(index))}\n\n[versions]\nfabric = "0.20.1"\nminecraft = "26.3"\n`);
  zip.file(root + "LIES-MICH-packwiz.txt", `packwiz-Pack „${name}“ (Minecraft 26.3, Fabric 0.20.1, ${pack.ramGB(r)} GB Arbeitsspeicher)\n\n`
    + `1. Den Ordner auf GitHub (Pages) oder einen Webserver hochladen.\n`
    + `2. Server: packwiz-installer-bootstrap.jar in den Server-Ordner legen und vor dem Start ausführen:\n   java -jar packwiz-installer-bootstrap.jar -g -s server https://DEINE-SEITE/pack.toml\n`
    + `3. Spieler: in Prism Launcher die Instanz mit dem Pre-Launch-Befehl\n   "$INST_JAVA" -jar packwiz-installer-bootstrap.jar https://DEINE-SEITE/pack.toml\n   starten; neue Versionen kommen dann bei jedem Start automatisch.\n`
    + `4. Aktualisieren: neu exportieren oder mit dem packwiz-Programm „packwiz update --all“ ausführen und hochladen.\n\n`
    + `Reine Client-Mods (side = "client") installiert der Server nicht. Einstellungsdateien (preserve) werden nur beim ersten Mal gesetzt.\n`
    + `packwiz: https://packwiz.infra.link · Installer: https://github.com/packwiz/packwiz-installer-bootstrap\n`);
  await save(await zip.generateAsync({ type: "blob", compression: "DEFLATE" }), safe(name) + "-packwiz.zip");
  st(`packwiz-Ordner heruntergeladen (${all.length} Dateien). Anleitung in LIES-MICH-packwiz.txt.`);
}
export async function exportPrism(name: string, st: Status) {
  const { r, all } = exportSet(false); const zip = new JSZip();
  zip.file("instance.cfg", `[General]\nConfigVersion=1.2\nInstanceType=OneSix\nname=${name}\nOverrideMemory=true\nMaxMemAlloc=${pack.ramGB(r) * 1024}\nMinMemAlloc=1024\nnotes=Erstellt mit dem Mod-Katalog 26.3\n`);
  zip.file("mmc-pack.json", JSON.stringify({ components: [{ uid: "net.minecraft", version: "26.3", important: true }, { uid: "net.fabricmc.fabric-loader", version: "0.20.1" }], formatVersion: 1 }, null, 1));
  for (const [p, c] of Object.entries(packFiles())) zip.file(".minecraft/" + p, c);
  const list = [...all]; let done = 0; const fail: string[] = [];
  const q = [...list]; await Promise.all(Array.from({ length: 6 }, async () => { while (q.length) { const s = q.shift()!; try { const res = await fetch(pack.data.files[s][0]); if (!res.ok) throw 0; zip.file(".minecraft/" + pathOf(s), await res.arrayBuffer()); } catch { fail.push(pack.name(s)); } st(`Lade Dateien: ${++done} von ${list.length} …`); } }));
  if (fail.length) { st(`${fail.length} Dateien nicht ladbar (${fail.slice(0, 4).join(", ")}). Nimm stattdessen die .mrpack-Datei.`); return; }
  st("Packe die Instanz …"); await save(await zip.generateAsync({ type: "blob", compression: "STORE" }), safe(name) + "-Prism.zip");
  st(`Fertig. Prism: Instanz hinzufügen › Importieren › Datei wählen. Arbeitsspeicher (${pack.ramGB(r)} GB) ist schon eingestellt.`);
}
