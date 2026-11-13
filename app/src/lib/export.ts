// Export: .mrpack, Prism-Instanz (mit RAM), Server-Pack; setzt Resource-Pack-Reihenfolge in options.txt.
import { pack } from "./pack.svelte";
import { rpTopDown } from "./rp";
import { buildAutoConfigFiles, SHADER_LOD_FOG_DEFAULTS } from "./auto-cfg";
import { SETDEF } from "./const";
import projectCfg from "../../../config/project.json";

export const KIT = "https://nashornaufcrack.github.io/mc-modpack/downloads/Test-Kit.zip";
export const TESTSEED = "-4172144997902289642";

export const manualList = () => [...pack.sel].filter(s => !pack.data.files[s] && pack.BY[s]?.cf);
const safeSeg = (v: string) => v.replace(/[\\/:*?"<>|]+/g, "_").replace(/^\.+$/, m => "_".repeat(m.length)) || "file";
function safeRelPath(p: string): string {
  const norm = p.replace(/\\/g, "/");
  if (!norm || norm.startsWith("/") || norm.split("/").some(seg => !seg || seg === "." || seg === "..")) {
    throw new Error(`Unsicherer Export-Pfad: ${p}`);
  }
  return norm;
}
/** Dateiname im Pack: Windows-taugliche Zeichen, bei doppelten Namen (z. B. Herds Panic liefert talkbubbles-1.0.8.jar) mit Slug davor */
let fnFilesRef: unknown = null;
let FN: Record<string, string> | null = null;
export function fname(s: string) {
  if (!FN || fnFilesRef !== pack.data.files) {
    fnFilesRef = pack.data.files;
    FN = {}; const by: Record<string, string[]> = {};
    for (const [k, f] of Object.entries(pack.data.files)) { let n = String(f[1]); try { n = decodeURIComponent(n); } catch {} n = safeSeg(n); FN[k] = n; (by[n.toLowerCase()] ||= []).push(k); }
    for (const ks of Object.values(by)) if (ks.length > 1) for (const k of ks) FN[k] = safeSeg(k) + "--" + FN[k];
  }
  return FN[s] || (safeSeg(s) + ".jar");
}
export function folderpackJson(rps: string[]) {
  return JSON.stringify({
    module: true,
    packIds: rpTopDown(rps).map(s => "file/Modpack/" + fname(s))
  }, null, 2) + "\n";
}
export function optionsTxt(mods: Set<string>) {
  const B = (k: string, def = "12") => String(pack.cv("_base", k) || def); const rps = [...mods].filter(s => pack.BY[s]?.pt === "r");
  const order = ["vanilla", ...rpTopDown(rps).reverse().map(s => "file/Modpack/" + fname(s))];
  return [`renderDistance:${B("renderDistance", "12")}`, `simulationDistance:${B("simulationDistance", "8")}`, `maxFps:${B("maxFps", "120")}`, "enableVsync:false", "mipmapLevels:4", "biomeBlendRadius:2", "resourcePacks:" + JSON.stringify(order)].join("\n") + "\n";
}
export function packFiles() {
  const r = pack.resolve(); const files: Record<string, string> = {};
  files["options.txt"] = optionsTxt(r.mods); files["config/defaultoptions/options.txt"] = files["options.txt"];
  const rps = [...r.mods].filter(s => pack.BY[s]?.pt === "r");
  if (rps.length > 0) {
    files["resourcepacks/Modpack/packed_packs.folderpack.json"] = folderpackJson(rps);
  }
  const sp = [...r.mods].find(s => pack.BY[s]?.pt === "s");
  if (sp && r.mods.has("iris")) {
    const sfn = fname(sp);
    files["config/iris.properties"] = "enableShaders=true\nshaderPack=" + sfn + "\n";
    const spKey = "shaderpacks/" + sfn + ".txt";
    const map = new Map<string, string>();
    const lodDefaults = SHADER_LOD_FOG_DEFAULTS[sp] || {};
    for (const [k, v] of Object.entries(lodDefaults)) map.set(k, String(v));
    const items = (SETDEF as any)[sp]?.items || [];
    for (const i of items) {
      const v = pack.cv(sp, i.k);
      map.set(i.k, String(i.f ? i.f(Number(v)) : v));
    }
    if (map.size > 0) files[spKey] = [...map.entries()].map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
  }
  Object.assign(files, buildAutoConfigFiles(r.mods, pack.data.x.rpo || {}, fname, (s, k) => pack.cv(s, k), pack.cfg._auto || {}));
  const manual = manualList(); const tips = pack.tips(r); const autos = pack.autos(r); const dp = [...r.mods].some(s => pack.typ(s) === "d");
  files["LIES-MICH.txt"] = `Erstellt mit dem Mod-Katalog ${projectCfg.minecraftVersion} (${new Date().toLocaleDateString("de-DE")}).\nResource-Pack-Reihenfolge, Sichtweite und FPS-Limit sind schon gesetzt.\nArbeitsspeicher: ${pack.ramGB(r)} GB.\n`
    + (rps.length ? "\nResource Packs sind über das Mod Packed Packs übersichtlich im Ordner „Modpack“ gebündelt und können im Menü mit einem Klick gemeinsam umgeschaltet werden.\n" : "")
    + (dp ? "\nDatapacks liegen im Ordner datapacks und werden von Global Packs in jede NEU erstellte Welt geladen.\n" : "")
    + (autos.length ? `\nAUTOMATISCH AUFEINANDER ABGESTIMMT (bereits in den Config-Dateien gesetzt):\n${autos.map(a => "- " + [a.slug, ...a.partners].map(x => pack.name(x)).join(" + ") + ": " + a.text).join("\n")}\n` : "")
    + (tips.length ? `\nNACH DEM ERSTEN START EINSTELLEN:\n${tips.map(t => "- " + t.mods.map(x => pack.name(x)).join(" + ") + ": " + t.text).join("\n")}\n` : "")
    + (manual.length ? `\nBITTE SELBST HERUNTERLADEN und in den Ordner mods legen (der Autor erlaubt keinen automatischen Download):\n${manual.map(s => "- " + pack.name(s) + ": " + pack.BY[s].cf).join("\n")}\n` : "");
  if (r.mods.has("spark")) files["TEST-ANLEITUNG.txt"] = "Test-Kit: " + KIT + "\nSeed: " + TESTSEED + "\n";
  return files;
}
const dirOf = (s: string) => { const t = pack.typ(s); return t === "r" ? "resourcepacks/Modpack" : t === "s" ? "shaderpacks" : t === "d" ? "datapacks" : "mods"; };
export const pathOf = (s: string) => safeRelPath(dirOf(s) + "/" + fname(s));
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
/** Start-Check vor jedem Export: Abhängigkeiten, Konflikte, doppelte Dateien, gültige Configs (inkl. options.txt und iris.properties) */
export function startCheck() {
  const r = pack.resolve();
  const v = pack.verifyPack(r, fname);
  const errors = [...v.errors];
  const issues = [...v.issues];
  const files = packFiles();
  const seenIssueIds = new Set(issues.map(i => i.id));
  const pushIssue = (issue: (typeof issues)[number]) => {
    if (seenIssueIds.has(issue.id)) return;
    seenIssueIds.add(issue.id);
    issues.push(issue);
  };
  for (const [p, c] of Object.entries(files)) {
    if (p === "options.txt") {
      const lines = c.split("\n").filter(Boolean);
      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        const [k, val] = [line.slice(0, line.indexOf(":")), line.slice(line.indexOf(":") + 1)];
        if (!k || line.indexOf(":") < 0) {
          const msg = `Ungültige Zeile in ${p}: ${line}`;
          errors.push(msg);
          pushIssue({ id: `opt-invalid-${p}-${idx}`, type: "other", title: `Konfigurationsfehler in ${p}`, detail: msg });
          continue;
        }
        if (["renderDistance", "simulationDistance", "maxFps", "mipmapLevels", "biomeBlendRadius"].includes(k) && !/^\d+$/.test(val)) {
          const msg = `${p}: ${k} ist keine Zahl (${val}).`;
          errors.push(msg);
          pushIssue({ id: `opt-num-${k}-${idx}`, type: "other", title: `Ungültiger Wert in ${p}`, detail: msg });
        }
        if (k === "resourcePacks") {
          try {
            const a = JSON.parse(val);
            if (!Array.isArray(a)) throw 0;
            for (let j = 0; j < a.length; j++) {
              const x = a[j];
              if (x !== "vanilla" && !String(x).startsWith("file/")) {
                const msg = `${p}: unbekannter Resource-Pack-Eintrag ${x}.`;
                errors.push(msg);
                pushIssue({ id: `rp-unknown-${idx}-${j}`, type: "other", title: "Unbekanntes Resource-Pack", detail: msg });
              }
            }
          } catch {
            const msg = `${p}: Resource-Pack-Liste ist kein gültiges JSON.`;
            errors.push(msg);
            pushIssue({ id: `rp-json-${idx}`, type: "other", title: "Resource-Pack Syntaxfehler", detail: msg });
          }
        }
      }
    }
    if (p === "config/iris.properties") {
      const sp = (c.match(/^shaderPack=(.+)$/m) || [])[1];
      if (!sp || ![...r.mods].some(s => pack.typ(s) === "s" && fname(s) === sp)) {
        const msg = `iris.properties verweist auf einen Shader, der nicht im Pack ist (${sp}).`;
        errors.push(msg);
        pushIssue({ id: "iris-sp", type: "other", title: "Shader-Zuordnungsfehler", detail: msg });
      }
    }
  }
  return { ...v, ok: errors.length === 0, errors, issues, total: Object.keys(files).length };
}

async function createZip() { const { default: JSZip } = await import("jszip"); return new JSZip(); }
async function save(blob: Blob, name: string) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
const safe = (n: string) => n.replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-") || "Mein-Pack";
export async function exportMrpack(name: string, server: boolean, st: Status) {
  const { r, all } = exportSet(server);
  const env = (s: string) => { const m = pack.BY[s]; const a = m ? m.ampel : "Y"; return { client: m?.cat === "S" ? "optional" : "required", server: a === "G" ? "unsupported" : a === "R" || m?.cat === "S" ? "required" : "optional" }; };
  const valid = all.filter(s => !!pack.data.files[s]);
  const files = valid.map(s => { const f = pack.data.files[s]; return { path: safeRelPath(pathOf(s)), hashes: { sha1: f[2], sha512: f[3] }, env: env(s), downloads: [f[0]], fileSize: f[4] }; });
  const zip = await createZip(); zip.file("modrinth.index.json", JSON.stringify({ formatVersion: 1, game: "minecraft", versionId: "1.0.0", name: name + (server ? " Server" : ""), summary: `Erstellt mit dem Mod-Katalog ${projectCfg.minecraftVersion}`, files, dependencies: { minecraft: projectCfg.minecraftVersion, [projectCfg.loader]: projectCfg.loaderVersion } }, null, 2));
  if (!server) for (const [p, c] of Object.entries(packFiles())) zip.file("overrides/" + safeRelPath(p), c);
  await save(await zip.generateAsync({ type: "blob", compression: "DEFLATE" }), safe(name) + (server ? "-Server" : "") + ".mrpack");
  st(server ? "Server-Pack heruntergeladen." : `Heruntergeladen. In der Modrinth App hineinziehen, danach Arbeitsspeicher auf ${pack.ramGB(r)} GB stellen.`);
}
// packwiz: Pack als Textdateien (pack.toml, index.toml, je Datei eine .pw.toml) für Server-Admins und Git
const tq = (v: string) => JSON.stringify(v); // TOML-Basisstrings verstehen dieselben Escapes wie JSON
async function sha256(t: string) { return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, "0")).join(""); }
export async function exportPackwiz(name: string, st: Status) {
  const { r, all } = exportSet(false); const zip = await createZip(); const root = safe(name) + "-packwiz/";
  const idx: string[] = [];
  for (const s of [...all].sort()) {
    const f = pack.data.files[s]; if (!f) continue; const m = pack.BY[s];
    const mr = f[0].match(/^https:\/\/cdn\.modrinth\.com\/data\/([A-Za-z0-9]+)\/versions\/([A-Za-z0-9]+)\//);
    const pt = pack.typ(s);
    const side = pt === "r" || pt === "s" || (pt === "m" && (m?.ampel === "G" || m?.ampel === "Q")) ? "client" : "both";
    const toml = `name = ${tq(m?.name || f[7] || s)}\nfilename = ${tq(fname(s))}\nside = ${tq(side)}\n\n[download]\nurl = ${tq(f[0])}\nhash-format = "sha512"\nhash = ${tq(f[3])}\n`
      + (mr ? `\n[update]\n[update.modrinth]\nmod-id = ${tq(mr[1])}\nversion = ${tq(mr[2])}\n` : "");
    const path = safeRelPath(dirOf(s) + "/" + safeSeg(s) + ".pw.toml"); zip.file(root + path, toml);
    idx.push(`[[files]]\nfile = ${tq(path)}\nhash = ${tq(await sha256(toml))}\nmetafile = true\n`);
  }
  // Einstellungen nur beim ersten Installieren setzen, spätere eigene Änderungen bleiben (preserve)
  for (const [rawPath, c] of Object.entries(packFiles())) { const path = safeRelPath(rawPath); zip.file(root + path, c); idx.push(`[[files]]\nfile = ${tq(path)}\nhash = ${tq(await sha256(c))}\npreserve = true\n`); }
  const index = `hash-format = "sha256"\n\n` + idx.join("\n");
  zip.file(root + "index.toml", index);
  zip.file(root + "pack.toml", `name = ${tq(name)}\nauthor = ${tq("Mod-Katalog " + projectCfg.minecraftVersion)}\nversion = "1.0.0"\npack-format = ${tq(projectCfg.packFormat)}\n\n[index]\nfile = "index.toml"\nhash-format = "sha256"\nhash = ${tq(await sha256(index))}\n\n[versions]\nfabric = ${tq(projectCfg.loaderVersion)}\nminecraft = ${tq(projectCfg.minecraftVersion)}\n`);
  zip.file(root + "LIES-MICH-packwiz.txt", `packwiz-Pack „${name}“ (Minecraft ${projectCfg.minecraftVersion}, Fabric ${projectCfg.loaderVersion}, ${pack.ramGB(r)} GB Arbeitsspeicher)\n\n`
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
  const { r, all } = exportSet(false); const zip = await createZip();
  const cfgName = name.replace(/[\r\n]+/g, " ");
  zip.file("instance.cfg", `[General]\nConfigVersion=1.2\nInstanceType=OneSix\nname=${cfgName}\nOverrideMemory=true\nMaxMemAlloc=${pack.ramGB(r) * 1024}\nMinMemAlloc=1024\nnotes=Erstellt mit dem Mod-Katalog ${projectCfg.minecraftVersion}\n`);
  zip.file("mmc-pack.json", JSON.stringify({ components: [{ uid: "net.minecraft", version: projectCfg.minecraftVersion, important: true }, { uid: "net.fabricmc.fabric-loader", version: projectCfg.loaderVersion }], formatVersion: 1 }, null, 1));
  for (const [p, c] of Object.entries(packFiles())) zip.file(".minecraft/" + safeRelPath(p), c);
  const list = [...all].filter(s => !!pack.data.files[s]); let done = 0; const fail: string[] = [];
  const q = [...list]; await Promise.all(Array.from({ length: 6 }, async () => { while (q.length) { const s = q.shift()!; try { const res = await fetch(pack.data.files[s][0]); if (!res.ok) throw 0; zip.file(".minecraft/" + safeRelPath(pathOf(s)), await res.arrayBuffer()); } catch { fail.push(pack.name(s)); } st(`Lade Dateien: ${++done} von ${list.length} …`); } }));
  if (fail.length) { st(`${fail.length} Dateien nicht ladbar (${fail.slice(0, 4).join(", ")}). Nimm stattdessen die .mrpack-Datei.`); return; }
  st("Packe die Instanz …"); await save(await zip.generateAsync({ type: "blob", compression: "STORE" }), safe(name) + "-Prism.zip");
  st(`Fertig. Prism: Instanz hinzufügen › Importieren › Datei wählen. Arbeitsspeicher (${pack.ramGB(r)} GB) ist schon eingestellt.`);
}
