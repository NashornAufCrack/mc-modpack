// Assistent: aus Antworten Vorschläge, Grafik-Einstellungen und Leistungs-Mods berechnen
import { pack } from "./pack.svelte";
import { BASE } from "./const";

export const SHADERS: [string, string, string, number][] = [["photon-shader","Photon","Realistisches Licht, schöne Wolken und Wasser. Ab Oberklasse-Grafikkarte.",2],["complementary-reimagined","Complementary Reimagined","Sehr beliebt, nah an Vanilla, viele Einstellungen. Ab Mittelklasse.",1],["solas-shader","Solas","Stimmungsvoll und schnell. Gut für Mittelklasse.",1],["bsl-shaders","BSL","Klassiker, läuft auf fast jeder Karte.",0],["i-like-vanilla","I Like Vanilla","Ganz leicht: etwas Licht und Schatten, kaum FPS-Verlust.",0],["pegasus","Pegasus","Schnell mit vielen Stil-Optionen.",0],["mellow","Mellow","Gemalter Look, eher künstlerisch.",1],["complementary-unbound","Complementary Unbound","Wie Reimagined, aber kräftiger und moderner.",2],["bliss-shader","Bliss","Sehr realistisch, aber anspruchsvoll. Nur High-End.",3]];
export function gpuScore(w: Record<string, any>) {
  const g = ({ low: 0, mid: 1, high: 2, top: 3 } as any)[w.gpu || "high"];
  const px = (Number(w.w || 2560) * Number(w.h || 1440)) / (2560 * 1440);
  return Math.max(0, Math.min(3, g - (px > 1.6 ? 1 : px < 0.7 ? -1 : 0) + ((w.fps || "hz") === "60" ? 1 : 0) - (Number(w.hz || 144) > 165 ? 1 : 0)));
}
export function shaderChoices(w: Record<string, any>) { const sc = gpuScore(w); const l = SHADERS.filter(x => pack.BY[x[0]] && x[3] <= sc).sort((a, b) => b[3] - a[3]); return l.length ? l : SHADERS.filter(x => x[0] === "i-like-vanilla"); }
export function plan(w: Record<string, any>) {
  const sc = gpuScore(w), hz = Number(w.hz || 144), fpsHigh = (w.fps || "hz") === "hz";
  const P = [{ sm: 1024, sd: 96, cl: false, wc: false, taau: true, vx: 8, rd: 10 }, { sm: 2048, sd: 128, cl: false, wc: true, taau: false, vx: 12, rd: 12 }, { sm: 2048, sd: 160, cl: true, wc: true, taau: false, vx: 16, rd: 16 }, { sm: 3072, sd: 192, cl: true, wc: true, taau: false, vx: 24, rd: 16 }][sc];
  const fps = fpsHigh ? (w.sync === "yes" ? Math.max(60, hz - 4) : hz) : 60;
  const add = new Set<string>(), why: Record<string, string> = {};
  for (const m of pack.data.mods) {
    if (pack.LOCKED.has(m.slug) || m.cat === "S" || m.cat === "P" || m.pt === "s" || m.rolle !== "K") continue;
    if (w.srv === "vanilla" && m.ampel === "R") continue;
    if (m.cat === "G" || m.cat === "T") { if (w.srv === "vanilla" || w.feel === "pure") continue; if (w.feel === "plus" && m.cat === "T") continue; }
    add.add(m.slug); why[m.slug] = "empfohlen für " + (w.feel === "pure" ? "Vanilla-Look" : "Vanilla+");
  }
  if (w.shader === "yes") { const sp = w.shaderpack || shaderChoices(w)[0][0]; add.add(sp); why[sp] = "passt zu deiner Grafikkarte"; }
  if (w.lod === "none") ["voxy", "living-horizon", "voxy-extra", "voxy-worldgen"].forEach(x => add.delete(x)); else if (pack.BY.voxy) { add.add("voxy"); why.voxy = "Fernsicht gewünscht"; }
  if (w.anim === "none") pack.data.mods.filter(m => m.sub === "Spieler-Animation" || m.sub === "Punchy-Packs").forEach(m => add.delete(m.slug));
  if (w.vendor === "nvidia" && (w.gpu || "high") !== "low" && pack.BY.nvidium) { add.add("nvidium"); why.nvidium = "macht NVIDIA-Karten schneller"; }
  if (pack.BY["smart-particles"]) { add.add("smart-particles"); why["smart-particles"] = "weniger FPS-Einbrüche bei vielen Partikeln"; }
  for (const g of pack.data.dec.gruppen) g.mods.filter(x => add.has(x)).slice(1).forEach(x => add.delete(x));
  const S = new Set(pack.LOCKED); const final: string[] = [];
  // fest eingebaute Mods sind keine Vorschläge (sonst zählt die Vorschau sie mit)
  for (const s of add) if (!pack.LOCKED.has(s) && !pack.BLOCKED.has(s) && !pack.clashes(s, S).length) { S.add(s); final.push(s); }
  return { add: final, why, fps, rd: P.rd, P, ram: Math.min(12, Math.floor(Number(w.ram || 16) / 2)) };
}
export function applyPlan(w: Record<string, any>) {
  const p = plan(w); pack.snapshot();
  pack.sel = new Set([...pack.LOCKED, ...p.add]); pack.sug = new Set(p.add); pack.preset = null; pack.wiz = { ...w };
  const opt: any = BASE.items.find((i: any) => i.k === "maxFps"); if (!opt.o.includes(p.fps)) opt.o = [...opt.o, p.fps].sort((a: number, b: number) => a - b);
  pack.cfg = { ...pack.cfg, _base: { ...(pack.cfg._base || {}), maxFps: p.fps, renderDistance: p.rd } };
  pack.save(); return p;
}
