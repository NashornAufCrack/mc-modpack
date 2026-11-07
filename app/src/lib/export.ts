// Export: .mrpack, Prism-Instanz (mit RAM), Server-Pack; schreibt Configs mit allen Kommentaren zurück.
import JSZip from "jszip";
import { pack } from "./pack.svelte";
import { SETDEF } from "./const";
import { keyLines } from "./keys";
import { rpTopDown } from "./rp";

export const KIT = "https://nashornaufcrack.github.io/mc-modpack/downloads/Test-Kit.zip";
export const TESTSEED = "-4172144997902289642";

function fmtVal(v: any, t: string, fmt: string, orig: string) {
  if (t === "bool" || typeof v === "boolean") return String(v === true || v === "true");
  if (t === "num" || typeof v === "number") { const s = String(Number(v)); return /^-?\d+\.\d+/.test(String(orig).trim()) && !s.includes(".") ? s + ".0" : s; }
  return fmt === "props" ? String(v) : JSON.stringify(String(v));
}
const rx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function patchText(t: string, fmt: string, k: string, val: (orig: string) => string) {
  if (fmt === "toml" || fmt === "props") {
    const p = k.split("."); const key = fmt === "toml" ? p.pop()! : k; let a = 0, b = t.length;
    if (fmt === "toml" && p.length) { const m = t.match(new RegExp("^\\s*\\[" + rx(p.join(".")) + "\\]\\s*$", "m")); if (!m) return t; a = m.index! + m[0].length; const n = t.slice(a).search(/^\s*\[/m); if (n >= 0) b = a + n; }
    return t.slice(0, a) + t.slice(a, b).replace(new RegExp('^(\\s*"?' + rx(key) + '"?\\s*[=:]\\s*)(.*)$', "m"), (_m, g1, g2) => g1 + val(g2)) + t.slice(b);
  }
  return t.replace(new RegExp('^(\\s*"?' + rx(k) + '"?\\s*:\\s*)([^,\\n]*)', "m"), (_m, g1, g2) => g1 + val(g2));
}
const fmtOf = (f: string) => (/\.json$/.test(f) ? "json" : /\.json5$/.test(f) ? "json5" : /\.toml$/.test(f) ? "toml" : "props");
function applyChanges(tpl: string, fmt: string, ch: Record<string, [any, string]>) {
  if (fmt === "json") { const o = JSON.parse(tpl); for (const [k, [v, ty]] of Object.entries(ch)) { const p = k.split("."); let c = o; while (p.length > 1) { const q = p.shift()!; c[q] = c[q] || {}; c = c[q]; } c[p[0]] = ty === "bool" ? v === true || v === "true" : ty === "num" ? Number(v) : v; } return JSON.stringify(o, null, 2); }
  let t = tpl; for (const [k, [v, ty]] of Object.entries(ch)) t = patchText(t, fmt, k, o => fmtVal(v, ty, fmt, o)); return t;
}
/** alle geänderten Dateien einer Mod: {pfad: inhalt} */
export function modFiles(slug: string) {
  const X = pack.data.x, out: Record<string, string> = {}, cfg = pack.cfg[slug] || {};
  const def: any = (SETDEF as any)[slug];
  const curated: Record<string, [any, string]> = {};
  if (def && (Object.keys(cfg).some(k => k[0] !== "@") || slug === "voxy")) for (const i of def.items) { let v = pack.cv(slug, i.k); if (i.inv) v = !v; curated[i.k] = [v, i.t === "bool" ? "bool" : i.s ? "str" : "num"]; }
  for (const f of X.cfgs[slug] || []) {
    const ch: Record<string, [any, string]> = {};
    for (const i of f.items) { const id = "@" + f.file + "|" + i.k; if (id in cfg) ch[i.k] = [cfg[id], i.t]; else { const a = pack.autoVal(slug, f.file, i.k); if (a) ch[i.k] = [a.v, i.t]; } }
    if (def && def.file === f.file) Object.assign(ch, curated);
    if (Object.keys(ch).length) out["config/" + f.file] = applyChanges(X.tpl[f.file], f.fmt, ch);
  }
  if (def && Object.keys(curated).length && !out["config/" + def.file] && !(X.cfgs[slug] || []).some(f => f.file === def.file)) {
    const tpl = X.tplS[def.file];
    if (tpl) out["config/" + def.file] = applyChanges(tpl, fmtOf(def.file), curated);
    else if (def.fmt === "props") out["config/" + def.file] = Object.entries(curated).map(([k, [v]]) => `${k}=${v}`).join("\n") + "\n";
    else out["config/" + def.file] = applyChanges(JSON.stringify(def.base || {}), "json", curated);
  }
  const r = X.rpo[slug];
  if (r && pack.data.files[slug]) { const d = JSON.parse(JSON.stringify(r.data)); for (const [id, v] of Object.entries(cfg)) if (id.startsWith("@rpo|")) { const p = id.slice(5).split("."); let c = d; while (p.length > 1) c = c[p.shift()!]; c[p[0]] = v; } out["resourcepacks/" + decodeURIComponent(pack.data.files[slug][1]) + ".rpo"] = JSON.stringify(d, null, 2); }
  return out;
}
export const manualList = () => [...pack.sel].filter(s => !pack.data.files[s] && pack.BY[s]?.cf);
const fname = (s: string) => decodeURIComponent(pack.data.files[s][1]);
export function optionsTxt(mods: Set<string>) {
  const B = (k: string) => pack.cv("_base", k); const rps = [...mods].filter(s => pack.BY[s].pt === "r");
  const order = ["vanilla", ...rpTopDown(rps).reverse().map(s => "file/" + fname(s))];
  return [`renderDistance:${B("renderDistance")}`, `simulationDistance:${B("simulationDistance")}`, `maxFps:${B("maxFps")}`, "enableVsync:false", "mipmapLevels:4", "biomeBlendRadius:2", "resourcePacks:" + JSON.stringify(order), ...keyLines()].join("\n") + "\n";
}
export function packFiles(withCfg: boolean) {
  const r = pack.resolve(); const files: Record<string, string> = {};
  if (!withCfg) return files;
  files["options.txt"] = optionsTxt(r.mods); files["config/defaultoptions/options.txt"] = files["options.txt"];
  const kl = keyLines(); if (kl.length) files["config/defaultoptions/keybindings.txt"] = kl.join("\n") + "\n";
  const sp = [...r.mods].find(s => pack.BY[s].pt === "s");
  if (sp && r.mods.has("iris")) { files["config/iris.properties"] = "enableShaders=true\nshaderPack=" + fname(sp) + "\n";
    if (sp === "photon-shader") files["shaderpacks/" + fname(sp) + ".txt"] = (SETDEF as any)["photon-shader"].items.map((i: any) => { const v = pack.cv("photon-shader", i.k); return i.k + "=" + (i.f ? i.f(Number(v)) : v); }).join("\n") + "\n"; }
  for (const s of r.mods) Object.assign(files, modFiles(s));
  const manual = manualList();
  files["LIES-MICH.txt"] = `Erstellt mit dem Mod-Katalog 26.3 (${new Date().toLocaleDateString("de-DE")}).\nEinstellungen und Tasten sind schon gesetzt (Sicherung in config/defaultoptions).\nArbeitsspeicher: ${pack.ramGB(r)} GB.\n` + (manual.length ? `\nBITTE SELBST HERUNTERLADEN und in den Ordner mods legen (der Autor erlaubt keinen automatischen Download):\n${manual.map(s => "- " + pack.name(s) + ": " + pack.BY[s].cf).join("\n")}\n` : "");
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
export async function exportMrpack(name: string, server: boolean, withCfg: boolean, st: Status) {
  const { r, all } = exportSet(server);
  const env = (s: string) => { const m = pack.BY[s]; const a = m ? m.ampel : "Y"; return { client: m?.cat === "S" ? "optional" : "required", server: a === "G" ? "unsupported" : a === "R" || m?.cat === "S" ? "required" : "optional" }; };
  const files = all.filter(s => !(server && dirOf(s) === "datapacks")).map(s => { const f = pack.data.files[s]; return { path: dirOf(s) + "/" + fname(s), hashes: { sha1: f[2], sha512: f[3] }, env: env(s), downloads: [f[0]], fileSize: f[4] }; });
  const zip = new JSZip(); zip.file("modrinth.index.json", JSON.stringify({ formatVersion: 1, game: "minecraft", versionId: "1.0.0", name: name + (server ? " Server" : ""), summary: "Erstellt mit dem Mod-Katalog 26.3", files, dependencies: { minecraft: "26.3", "fabric-loader": "0.20.1" } }, null, 2));
  if (!server) for (const [p, c] of Object.entries(packFiles(withCfg))) zip.file("overrides/" + p, c);
  await save(await zip.generateAsync({ type: "blob", compression: "DEFLATE" }), safe(name) + (server ? "-Server" : "") + ".mrpack");
  st(server ? "Server-Pack heruntergeladen." : `Heruntergeladen. In der Modrinth App hineinziehen, danach Arbeitsspeicher auf ${pack.ramGB(r)} GB stellen.`);
}
export async function exportPrism(name: string, withCfg: boolean, st: Status) {
  const { r, all } = exportSet(false); const zip = new JSZip();
  zip.file("instance.cfg", `[General]\nConfigVersion=1.2\nInstanceType=OneSix\nname=${name}\nOverrideMemory=true\nMaxMemAlloc=${pack.ramGB(r) * 1024}\nMinMemAlloc=1024\nnotes=Erstellt mit dem Mod-Katalog 26.3\n`);
  zip.file("mmc-pack.json", JSON.stringify({ components: [{ uid: "net.minecraft", version: "26.3", important: true }, { uid: "net.fabricmc.fabric-loader", version: "0.20.1" }], formatVersion: 1 }, null, 1));
  for (const [p, c] of Object.entries(packFiles(withCfg))) zip.file(".minecraft/" + p, c);
  const list = all.filter(s => dirOf(s) !== "datapacks"); let done = 0; const fail: string[] = [];
  const q = [...list]; await Promise.all(Array.from({ length: 6 }, async () => { while (q.length) { const s = q.shift()!; try { const res = await fetch(pack.data.files[s][0]); if (!res.ok) throw 0; zip.file(".minecraft/" + dirOf(s) + "/" + fname(s), await res.arrayBuffer()); } catch { fail.push(pack.name(s)); } st(`Lade Dateien von Modrinth: ${++done} von ${list.length} …`); } }));
  if (fail.length) { st(`${fail.length} Dateien nicht ladbar (${fail.slice(0, 4).join(", ")}). Nimm stattdessen die .mrpack-Datei.`); return; }
  st("Packe die Instanz …"); await save(await zip.generateAsync({ type: "blob", compression: "STORE" }), safe(name) + "-Prism.zip");
  st(`Fertig. Prism: Instanz hinzufügen › Importieren › Datei wählen. Arbeitsspeicher (${pack.ramGB(r)} GB) ist schon eingestellt.`);
}
