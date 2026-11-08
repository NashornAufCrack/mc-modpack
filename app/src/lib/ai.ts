// KI-Schleife: Prompt aus Pack + Messung erzeugen, JSON-Antwort prüfen und anwenden
import { pack } from "./pack.svelte";

export type Fps = { avg: number; low1: number; low01: number; frames: number; stutter: number };
export function parseFps(txt: string): Fps | null {
  const lines = (txt || "").split(/\r?\n/).filter(Boolean); if (lines.length < 2) return null; const head = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const col = ["MsBetweenPresents", "FrameTime", "MsBetweenDisplayChange", "msBetweenPresents"].map(c => head.indexOf(c)).find(i => i >= 0);
  if (col === undefined) return null;
  const ft = lines.slice(1).map(l => Number(l.split(",")[col])).filter(v => v > 0 && v < 1000); if (ft.length < 50) return null;
  const s = [...ft].sort((a, b) => b - a); const p = (q: number) => { const k = s.slice(0, Math.max(1, Math.floor(s.length * q))); return 1000 / (k.reduce((a, b) => a + b, 0) / k.length); };
  return { avg: Math.round(1000 / (ft.reduce((a, b) => a + b, 0) / ft.length)), low1: Math.round(p(0.01)), low01: Math.round(p(0.001)), frames: ft.length, stutter: s.filter(v => v > 50).length };
}
export function prompt(t: Fps | null, link: string, note: string) {
  const r = pack.resolve(); const w = pack.wiz;
  return `Du hilfst beim Optimieren eines Minecraft-Modpacks (Fabric, MC 26.3).

HARDWARE: Grafikkarte ${w.vendor || "?"} ${w.gpu || "?"}, RAM ${w.ram || "?"} GB, Monitor ${w.w || "?"}x${w.h || "?"} @ ${w.hz || "?"} Hz, G-Sync/FreeSync: ${w.sync || "?"}
MESSUNG (3-Minuten-Flug, gleiche Strecke): ${t ? `Ø ${t.avg} FPS, 1 %-Tief ${t.low1}, 0,1 %-Tief ${t.low01}, ${t.stutter} Ruckler über 50 ms` : "keine"}${link ? `\nSPARK-PROFIL: ${link}` : ""}${note ? `\nBEOBACHTUNG: ${note}` : ""}

MODS IM PACK (Slug: Name):
${[...r.mods].map(s => `${s}: ${pack.name(s)}`).join("\n")}

GRUPPEN, AUS DENEN NUR EINER ERLAUBT IST:
${pack.data.dec.gruppen.map(g => `- ${g.titel}: ${g.mods.join(", ")}`).join("\n")}

AUFGABE: Finde die wahrscheinlichsten Ursachen für fehlende FPS oder Ruckler und schlage höchstens 8 konkrete Änderungen vor, jede mit einem Satz Begründung auf Deutsch. Gib am Ende GENAU EINEN Codeblock mit diesem JSON zurück:
\`\`\`json
{"aktionen":[{"typ":"entfernen","slug":"…","grund":"…"},{"typ":"hinzufuegen","slug":"…","grund":"…"},{"typ":"einstellung","slug":"_base","key":"renderDistance","wert":12,"grund":"…"}]}
\`\`\`
Einstellungen mit slug "_base": renderDistance, simulationDistance, maxFps. Andere Einstellungen werden nicht übernommen.`;
}
type A = { typ: string; slug: string; key?: string; wert?: any; grund?: string };
/** erlaubte Werte für Grundeinstellungen aus der KI (ganze Zahlen im sinnvollen Bereich) */
const RANGE: Record<string, [number, number]> = { renderDistance: [2, 32], simulationDistance: [5, 32], maxFps: [10, 260] };
/** Ersten vollständigen JSON-Block mit "aktionen" finden: bevorzugt ```json-Block, sonst Klammern zählen (Text davor/danach stört nicht) */
function jsonBlock(raw: string): string | null {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i); if (fence && fence[1].includes('"aktionen"')) return fence[1].trim();
  for (let st = raw.indexOf("{"); st >= 0; st = raw.indexOf("{", st + 1)) {
    let d = 0, inStr = false, esc = false;
    for (let i = st; i < raw.length; i++) { const c = raw[i];
      if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true; else if (c === "{") d++; else if (c === "}" && --d === 0) { const t = raw.slice(st, i + 1); if (t.includes('"aktionen"')) return t; break; } }
  }
  return null;
}
export function aiParse(raw: string): { ok: A[]; bad: number; err?: string } {
  const block = jsonBlock(raw);
  try {
    const j = JSON.parse(block ?? raw); const ok: A[] = []; let bad = 0;
    for (const a of Array.isArray(j?.aktionen) ? j.aktionen : []) {
      if (a?.typ === "einstellung") {
        const r = a.slug === "_base" && RANGE[a.key]; const v = Number(a.wert);
        if (r && Number.isInteger(v) && v >= r[0] && v <= r[1]) ok.push({ ...a, wert: v }); else bad++;
      } else if ((a?.typ === "entfernen" || a?.typ === "hinzufuegen") && pack.BY[a.slug] && !(a.typ === "hinzufuegen" && pack.BLOCKED.has(a.slug))) ok.push(a); else bad++;
    }
    return { ok, bad };
  } catch { return { ok: [], bad: 0, err: "Kein gültiger JSON-Block gefunden." }; }
}
export function aiApply(list: A[]) {
  pack.snapshot();
  for (const a of list) {
    if (a.typ === "entfernen") { if (!pack.LOCKED.has(a.slug)) { const n = new Set(pack.sel); n.delete(a.slug); pack.sel = n; } }
    else if (a.typ === "hinzufuegen") { const n = new Set(pack.sel); pack.clashes(a.slug).forEach(c => { if (!pack.LOCKED.has(c.y)) n.delete(c.y); }); n.add(a.slug); pack.sel = n; }
    else if (a.typ === "einstellung") {
      if (a.slug === "_base") pack.setCv(a.slug, a.key!, a.wert);
    }
  }
  pack.save();
}
