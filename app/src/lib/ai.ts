// KI-Schleife: Prompt aus Pack + Messung erzeugen, JSON-Antwort prüfen und anwenden
import { pack } from "./pack.svelte";
import { BASE } from "./const";

export type Fps = { avg: number; low1: number; low01: number; frames: number; stutter: number };
export function parseFps(txt: string): Fps | null {
  const lines = txt.split(/\r?\n/).filter(Boolean); const head = lines[0].split(",");
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
export function aiParse(raw: string): { ok: A[]; bad: number; err?: string } {
  const m = raw.match(/\{[\s\S]*"aktionen"[\s\S]*\}/);
  try {
    const j = JSON.parse(m ? m[0] : raw); const ok: A[] = []; let bad = 0;
    for (const a of j.aktionen || []) {
      const known = a.typ === "einstellung" && a.slug === "_base" && BASE.items.some((i: any) => i.k === a.key);
      if (((a.typ === "entfernen" || a.typ === "hinzufuegen") && pack.BY[a.slug]) || known) ok.push(a); else bad++;
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
