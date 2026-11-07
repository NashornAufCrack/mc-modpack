// Zentrale Pack-Logik: Auswahl, Abhängigkeiten, Konflikte, Einstellungen, Vorlagen, Speicherung.
import type { AppData, Media, Mod, Gruppe } from "./data";
import { COST, BOOST, SETDEF, BASE } from "./const";

export const IMPLICIT: Record<string, string[]> = {"fresh-animations":["entity-model-features","entitytexturefeatures"],"fresh-animations-extensions":["fresh-animations"],"fa-player-extension":["fresh-animations"],"just-expressions":["entity-model-features"],"hyper-punchy":["punchy-fpa"],"fresh-food-for-hyper-punchy":["hyper-punchy"],"punchymoves":["fluid-foolish"],"connected-paths":["continuity"],"new-glowing-ores":["continuity"],"euphoria-patches":["complementary-reimagined"],"detailed-animations":["entity-model-features","entitytexturefeatures"],"als-piglins-revamped-x-fresh-animations":["fresh-animations"],"als-zombies-revamped-x-fresh-animations":["fresh-animations"],"als-enderman-revamped-x-fresh-animations":["fresh-animations"],"als-skeletons-revamped-x-fresh-animations":["fresh-animations"],"assorted-allays-x-fresh-animations":["fresh-animations"],"bare-bones-x-fresh-animations":["fresh-animations"],"fresh-skeleton-physics":["fresh-animations"]};
export const PT_T: Record<string, string> = { m: "Mods", s: "Shader", r: "Resource Packs", d: "Datapacks" };
export const PT_1: Record<string, string> = { m: "Mod", s: "Shader", r: "Resource Pack", d: "Datapack" };
export const CATS: Record<string, { t: string; n: string }> = {
  P: { t: "Leistung & Basis", n: "Macht das Spiel schneller und stabiler. Wird automatisch passend zu deinem PC gewählt." },
  V: { t: "Optik & Sound", n: "Verändert, wie das Spiel aussieht, klingt und sich anfühlt, nicht wie es funktioniert. Läuft auf jedem Server." },
  G: { t: "Gameplay", n: "Ändert Regeln oder bringt Inhalte. Meist muss die Mod auch auf dem Server sein." },
  T: { t: "Welt & Terrain", n: "Verändert die Weltgenerierung. Wirkt nur in neuen Gebieten oder neuen Welten." },
  S: { t: "Server & Technik", n: "Werkzeuge für Server und Technik-Spieler. Kommen beim Server-Pack automatisch dazu." },
};
export const PRESETS = [
  { id: "perf", name: "Nur Performance", text: "Maximale FPS, Vanilla-Optik. Ideal für schwache PCs oder PvP." },
  { id: "visual", name: "Vanilla Visual", text: "Schöner, aber läuft auf jedem Vanilla-Server. Shader, Animationen, Sounds." },
  { id: "plus", name: "Vanilla Plus", text: "Visual plus Komfort und sanfte Gameplay-Verbesserungen. Für eigene Server." },
];
const PERF_SET = ["dynamic-fps","entityculling","moreculling","immediatelyfast","modernfix-mvus","badoptimizations","lithium","ferrite-core","krypton","c2me-fabric","scalablelux","sodium-extra","reeses-sodium-options"];

class Pack {
  data!: AppData; media: Record<string, Media> = $state({});
  BY: Record<string, Mod> = {}; GROUPOF: Record<string, Gruppe> = {}; LOCKED = new Set<string>();
  ready = $state(false);
  sel = $state(new Set<string>());
  cfg: Record<string, any> = $state({});
  wiz: Record<string, any> = $state({});
  preset: { id: string; base: string[] } | null = $state(null);
  sug = $state(new Set<string>());
  history: string[][] = [];

  init(data: AppData, media: Record<string, Media>) {
    this.data = data; this.media = media;
    for (const m of data.mods) this.BY[m.slug] = m;
    for (const g of data.dec.gruppen || []) g.mods.forEach(s => (this.GROUPOF[s] = g));
    this.LOCKED = new Set(data.mods.filter(m => (m.cat === "P" && m.rolle === "K") || m.pflicht).map(m => m.slug));
    this.sel = new Set(this.LOCKED);
    this.load();
    this.ready = true;
  }
  name = (s: string) => this.BY[s]?.name || this.data.files[s]?.[7] || s;
  imgHQ(s: string): string[] { const m = this.media[s]; return (m?.hq?.length ? m.hq : this.img(s)); }
  img(s: string): string[] { const m = this.media[s]; return (m?.bilder?.length ? m.bilder : this.BY[s]?.img) || []; }
  videos(s: string) { const v = this.media[s]?.videos || []; const yt = this.data.x.details[s]?.yt || []; const out = v.filter(x => x.status !== "nein" && x.status !== "review").slice(0, 3); for (const id of yt) if (!out.some(o => o.id === id)) out.push({ id, quelle: "beschreibung", punkte: 10 }); return out.slice(0, 4); }
  cost = (s: string) => (BOOST.has(s) ? 0 : ((COST as any)[s] ?? 1));
  implicit(s: string) { const m = this.BY[s]; return (IMPLICIT[s] || []).concat(m?.pt === "s" ? ["iris"] : []).concat(this.data.x.rpo[s] ? ["respackopts"] : []); }
  resolve() {
    const mods = new Set<string>(), libs = new Set<string>(); const stack = [...this.sel];
    while (stack.length) { const s = stack.pop()!; if (mods.has(s) || libs.has(s)) continue; const f = this.data.files[s]; if (!f) continue; (this.BY[s] ? mods : libs).add(s); for (const d of f[5].concat(this.implicit(s))) stack.push(d); }
    return { mods, libs };
  }
  /** Konflikte von x gegen eine Menge */
  clashes(x: string, S: Set<string> = this.sel) {
    const res: { y: string; text: string; art: string; grp?: Gruppe; dec?: any }[] = [];
    const g = this.GROUPOF[x]; if (g) for (const y of g.mods) if (y !== x && S.has(y)) res.push({ y, text: g.text, art: "D", grp: g });
    for (const r of this.data.dec.beziehungen) if ((r.art === "K" || r.art === "D") && !r.erledigt && r.mods.includes(x)) for (const y of r.mods) if (y !== x && S.has(y) && !res.some(c => c.y === y)) res.push({ y, text: r.text, art: r.art });
    for (const d of this.data.dec.entscheidungen) { const ox = d.optionen.filter((o: any) => o.behalten.includes(x)); if (!ox.length) continue;
      for (const o of d.optionen) { if (ox.includes(o)) continue; for (const y of o.behalten) if (y !== x && S.has(y) && !ox.some((a: any) => a.behalten.includes(y)) && !res.some(c => c.y === y)) res.push({ y, text: d.frage, art: d.art, dec: d }); } }
    return res;
  }
  problems() { const out: { a: string; b: string; art: string; text: string }[] = [], seen = new Set<string>(); for (const s of this.sel) for (const c of this.clashes(s)) { const k = [s, c.y].sort().join("|"); if (!seen.has(k)) { seen.add(k); out.push({ a: s, b: c.y, art: c.art, text: c.text }); } } return out; }
  relInfo(x: string) {
    const out: { art: string; others: string[]; text: string }[] = [];
    const g = this.GROUPOF[x]; if (g) out.push({ art: "D", others: g.mods.filter(y => y !== x), text: "Nur eins wählbar: " + g.text });
    for (const r of this.data.dec.beziehungen) if (r.mods.includes(x)) out.push({ art: r.erledigt ? "S" : r.art, others: r.mods.filter(y => y !== x), text: r.text });
    return out;
  }
  snapshot() { this.history.push([...this.sel]); if (this.history.length > 50) this.history.shift(); }
  undo() { const h = this.history.pop(); if (h) { this.sel = new Set(h); this.save(); } }
  set(x: string, on: boolean, drop: string[] = []) {
    this.snapshot(); const n = new Set(this.sel);
    if (on) { drop.forEach(y => { if (!this.LOCKED.has(y)) n.delete(y); }); n.add(x); } else if (!this.LOCKED.has(x)) n.delete(x);
    this.sel = n; this.save();
  }
  applyPreset(id: string) {
    this.snapshot(); const n = new Set(this.LOCKED); const D = this.data;
    if (id === "perf") PERF_SET.forEach(s => this.BY[s] && n.add(s));
    else { for (const m of D.mods) { if (m.rolle !== "K" || m.cat === "S" || m.pt === "s") continue; if (id === "visual" && (m.cat === "G" || m.cat === "T" || m.ampel === "R")) continue; if (!this.clashes(m.slug, n).length) n.add(m.slug); } if (this.BY["photon-shader"]) n.add("photon-shader"); }
    this.sel = n; this.preset = { id, base: [...n] }; this.save();
  }
  presetDiff() { if (!this.preset) return null; const b = new Set(this.preset.base); return { plus: [...this.sel].filter(s => !b.has(s)), minus: [...b].filter(s => !this.sel.has(s)) }; }
  // Einstellungen
  cv(slug: string, k: string) { const def = (slug === "_base" ? BASE : (SETDEF as any)[slug]).items.find((i: any) => i.k === k); return this.cfg[slug] && k in this.cfg[slug] ? this.cfg[slug][k] : def.d; }
  setCv(slug: string, k: string, v: any) { this.cfg = { ...this.cfg, [slug]: { ...(this.cfg[slug] || {}), [k]: v } }; this.save(); }
  resetCv(slug: string, k: string) { const c = { ...(this.cfg[slug] || {}) }; delete c[k]; this.cfg = { ...this.cfg, [slug]: c }; this.save(); }
  autoVal(slug: string, file: string, k: string) { return this.data.x.prules.find(p => p.slug === slug && p.file === file && p.k === k && p.wenn.every((s: string) => this.sel.has(s))); }
  ramGB(r = this.resolve()) { const n = r.mods.size + r.libs.size; let g = n < 60 ? 4 : n < 120 ? 6 : n < 250 ? 8 : 10; if (r.mods.has("voxy") || r.mods.has("distanthorizons")) g += 1; if (r.mods.has("faithful-64x")) g += 1; const sys = Number(this.wiz.ram || 0); if (sys) g = Math.min(g, Math.floor(sys / 2)); return Math.max(3, Math.min(g, 12)); }
  load_() { const c = [...this.resolve().mods].reduce((a, s) => a + this.cost(s), 0); return { c, l: c < 15 ? "Leicht" : c < 30 ? "Mittel" : "Schwer", t: c < 15 ? "ok" : c < 30 ? "warn" : "bad" }; }
  // Speicherung
  save() { try { localStorage.setItem("mk-v3", JSON.stringify({ s: [...this.sel], c: this.cfg, w: this.wiz, p: this.preset })); } catch {} }
  load() {
    const hm = location.hash.match(/^#pack-([0-9a-z.]+)$/);
    if (hm) { const M = this.data.mods; this.sel = new Set([...this.LOCKED, ...hm[1].split(".").map(x => M[parseInt(x, 36)]?.slug).filter(Boolean)]); return; }
    try { const v = JSON.parse(localStorage.getItem("mk-v3") || localStorage.getItem("mk-sel2") || "null"); if (v?.s) { this.sel = new Set([...this.LOCKED, ...v.s.filter((s: string) => this.BY[s])]); this.cfg = v.c || {}; this.wiz = v.w || {}; this.preset = v.p || null; } } catch {}
  }
  shareUrl() { const code = [...this.sel].filter(s => !this.LOCKED.has(s)).map(s => this.data.mods.findIndex(m => m.slug === s).toString(36)).join("."); return location.href.split("#")[0] + "#pack-" + code; }
  resetAll() { try { Object.keys(localStorage).filter(k => k.startsWith("mk-")).forEach(k => localStorage.removeItem(k)); } catch {} this.sel = new Set(this.LOCKED); this.cfg = {}; this.wiz = {}; this.preset = null; this.sug = new Set(); this.history = []; }
}
export const pack = new Pack();
