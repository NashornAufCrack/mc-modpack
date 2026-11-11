// Zentrale Pack-Logik: Auswahl, Abhängigkeiten, Konflikte, Einstellungen, Vorlagen, Speicherung, Start-Check.
import type { AppData, Media, Mod, Gruppe, Video } from "./data";
import { thumb } from "./data";
import { COST, BOOST, SETDEF, BASE } from "./const";
import { activeAutos, rulesForSlug, buildAutoConfigFiles, type AutoMode } from "./auto-cfg";
import LZString from "lz-string";

export const IMPLICIT: Record<string, string[]> = {"sunbathing-godrays":["polytone"],"visual-effects-plus":["polytone"],"immersive-interfaces-mod-support-unofficial":["shrimps-immersive-interfaces"],"connected-rocks":["continuity"],"rainbows-foliage":["polytone"],"fresh-animations":["entity-model-features","entitytexturefeatures"],"fresh-animations-extensions":["fresh-animations"],"fa-player-extension":["fresh-animations"],"just-expressions":["entity-model-features"],"hyper-punchy":["punchy-fpa"],"fresh-food-for-hyper-punchy":["hyper-punchy"],"punchymoves":["fluid-foolish"],"connected-paths":["continuity"],"new-glowing-ores":["continuity"],"detailed-animations":["entity-model-features","entitytexturefeatures"],"als-piglins-revamped-x-fresh-animations":["fresh-animations"],"als-zombies-revamped-x-fresh-animations":["fresh-animations"],"als-enderman-revamped-x-fresh-animations":["fresh-animations"],"als-skeletons-revamped-x-fresh-animations":["fresh-animations"],"assorted-allays-x-fresh-animations":["fresh-animations"],"bare-bones-x-fresh-animations":["fresh-animations"],"fresh-skeleton-physics":["fresh-animations"],"brays-zombie-overhaul-fresh-animations":["fresh-animations"],"whimscape-x-fresh-animations":["fresh-animations","whimscape"],"als-boss-rush-x-fresh-animations":["fresh-animations"],"fresh-animations-quivers":["fresh-animations"],"excalibur-fresh-animations":["fresh-animations","excal"],"3d-harnesses-x-fresh-animations":["fresh-animations"],"fresh-flower-pots-rotated":["fresh-flower-pots"],"drigo-3d-lanterns-x-punchy":["hyper-punchy"],"3d-flint-steel-for-punchy":["hyper-punchy"],"animated-3d-wind-charge-compatible-with-punchy":["hyper-punchy"]};
/** Abhängigkeiten aus den Modrinth-Angaben, die für Fabric 26.3 keine Rolle spielen (Quilt, Forge-Brücke, Backports) */
export const DEP_IGNORE = new Set(["qsl", "quilted-fabric-api", "connector", "modefite-item-definition-backport"]);
/** Eine dieser Alternativen reicht: kommt nur dazu, wenn keine davon gewählt ist (Euphoria Patches läuft mit Reimagined oder Unbound) */
export const ONE_OF: Record<string, string[]> = { "euphoria-patches": ["complementary-reimagined", "complementary-unbound"] };
export const PT_T: Record<string, string> = { m: "Mods", s: "Shader", r: "Resource Packs", d: "Datapacks" };
export const PT_1: Record<string, string> = { m: "Mod", s: "Shader", r: "Resource Pack", d: "Datapack" };
export const CATS: Record<string, { t: string; n: string }> = {
  P: { t: "Leistung & Basis", n: "Das Leistungspaket ist immer dabei. Hier stehen nur Extras, die du zusätzlich wählen kannst." },
  V: { t: "Optik & Sound", n: "Verändert, wie das Spiel aussieht, klingt und sich anfühlt: Licht, Partikel, Animationen, 3D-Modelle, Sound. Läuft auf jedem Server." },
  B: { t: "Bedienung & HUD", n: "Anzeigen, Inventar, Menüs und Steuerung, z. B. AppleSkin, Jade, Mouse Tweaks. Läuft auf jedem Server." },
  G: { t: "Gameplay", n: "Ändert Regeln oder bringt Inhalte. Meist muss die Mod auch auf dem Server sein." },
  T: { t: "Welt & Terrain", n: "Verändert die Weltgenerierung. Wirkt nur in neuen Gebieten oder neuen Welten." },
  S: { t: "Server & Technik", n: "Werkzeuge für Server und Technik-Spieler. Beim Server-Pack sind die harmlosen vorausgewählt, AutoModpack, Chunky Offline und TT20 nur auf Wunsch; dort lässt sich jedes einzeln an- und abwählen." },
};
export interface PackIssue {
  id: string;
  type: "break" | "conflict" | "missing_dep" | "mc_incompatible" | "other";
  title: string;
  detail: string;
  modA?: string;
  modB?: string;
  isLockedA?: boolean;
  isLockedB?: boolean;
  cascadeA?: string[];
  cascadeB?: string[];
  canAddB?: boolean;
}

export const PRESETS = [
  { id: "perf", name: "Nur Performance", text: "Maximale FPS, Vanilla-Optik. Ideal für schwache PCs oder PvP." },
  { id: "visual", name: "Vanilla Visual", text: "Schöner, aber läuft auf jedem Vanilla-Server. Shader, Animationen, Sounds." },
  { id: "plus", name: "Vanilla Plus", text: "Visual plus Komfort und sanfte Gameplay-Verbesserungen. Für eigene Server." },
];
// Krypton bewusst nicht: nachweislich Verbindungsprobleme im Client (siehe Leistungspaket-Hinweis)
/** Suchtext normalisieren: klein, ohne Akzente (é → e) */
export const normQ = (s: string) => String(s || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
const PERF_SET = ["dynamic-fps","entityculling","moreculling","immediatelyfast","modernfix-mvus","badoptimizations","lithium","ferrite-core","c2me-fabric","scalablelux","sodium-extra","reeses-sodium-options"];

class Pack {
  data!: AppData; media: Record<string, Media> = $state({});
  sounds: Record<string, { proben: { datei: string; titel: string }[] }> = $state({});
  proben(s: string) { return this.sounds[s]?.proben || []; }
  outdated: string[] = [];
  /** ausgeblendet, weil eine Pflicht-Abhängigkeit für 26.3 fehlt (z. B. Addon ohne Basis-Pack) */
  ohneBasis: { name: string; fehlt: string[] }[] = [];
  /** ausgeblendet, weil im Konflikt mit dem festen Leistungspaket */
  gegenPaket: { name: string; mit: string[] }[] = [];
  BY: Record<string, Mod> = {}; GROUPOF: Record<string, Gruppe> = {}; LOCKED = new Set<string>();
  /** nicht wählbar, weil im Konflikt mit einem fest eingebauten Mod (Wert: die festen Gegenspieler) */
  BLOCKED = new Map<string, string[]>();
  /** Vorberechnete Caches für flüssiges Scrollen und verzögerungsfreie Suche */
  #IMGS: Record<string, string[]> = {};
  #IMGS_HQ: Record<string, string[]> = {};
  #VIDS: Record<string, Video[]> = {};
  #SEARCH: Record<string, string> = {};
  ready = $state(false);
  sel = $state(new Set<string>());
  cfg: Record<string, any> = $state({});
  wiz: Record<string, any> = $state({});
  preset: { id: string; base: string[] } | null = $state(null);
  sug = $state(new Set<string>());
  history: { sel: string[]; preset: Pack["preset"]; sug: string[]; base: any; wiz: Record<string, any> }[] = [];

  init(data: AppData, media: Record<string, Media>) {
    // Feinere Einordnung: Bedienung/HUD als eigene Kategorie, klarere Unterbereiche
    const SUBN: Record<string, string> = { "Effekte & Partikel": "Welt & Licht", "Komfort": "Komfort (QoL)", "Inhalt": "Neue Inhalte" };
    for (const m of data.mods) { if (m.cat === "V" && (m.sub === "HUD & Bedienung" || m.sub === "Komfort")) { m.cat = "B"; m.sub = m.sub === "Komfort" ? "Komfort (QoL)" : "Anzeigen & Menüs"; } else if (SUBN[m.sub]) m.sub = SUBN[m.sub]; }
    // Fehlt eine Pflicht-Abhängigkeit (auch indirekt), wäre das Pack kaputt: Eintrag ausblenden und auf der Update-Seite nennen
    const PT: Record<string, string> = Object.fromEntries(data.mods.map(m => [m.slug, m.pt || "m"]));
    const extra = (x: string) => (IMPLICIT[x] || []).concat(PT[x] === "s" ? ["iris"] : PT[x] === "d" ? ["globalpacks"] : []).concat(data.x.rpo[x] ? ["respackopts"] : []);
    const missing = (s: string) => { const out: string[] = [], seen = new Set<string>(), st = [s]; while (st.length) { const x = st.pop()!; if (seen.has(x) || DEP_IGNORE.has(x)) continue; seen.add(x); const f = data.files[x]; if (!f) { out.push(x); continue; } st.push(...f[5], ...extra(x)); } return out; };
    const bf: Record<string, string[]> = { ...(data.x.basisfehlt || {}) };
    for (const m of data.mods) if (data.files[m.slug] && !bf[m.slug]) { const f = missing(m.slug); if (f.length) bf[m.slug] = f; }
    this.ohneBasis = data.mods.filter(m => bf[m.slug]).map(m => ({ name: m.name, fehlt: bf[m.slug] }));
    const bad = new Set([...(data.x.rpbad || []), ...Object.keys(bf)]);
    this.outdated = data.mods.filter(m => (data.x.rpbad || []).includes(m.slug)).map(m => m.name);
    if (bad.size) { data.mods = data.mods.filter(m => !bad.has(m.slug)); for (const g of data.dec.gruppen || []) g.mods = g.mods.filter(s => !bad.has(s)); }
    const avail = (s: string) => data.mods.some(m => m.slug === s) && (!!data.files[s] || !!data.mods.find(m => m.slug === s)?.cf);
    data.dec.gruppen = (data.dec.gruppen || []).map(g => ({ ...g, mods: g.mods.filter(avail) })).filter(g => g.mods.length >= 2);
    this.data = data; this.media = media;
    for (const m of data.mods) this.BY[m.slug] = m;
    for (const g of data.dec.gruppen || []) g.mods.forEach(s => (this.GROUPOF[s] = g));
    this.LOCKED = new Set(data.mods.filter(m => (m.cat === "P" && m.rolle === "K") || m.pflicht).map(m => m.slug));
    for (const m of data.mods) if (!this.LOCKED.has(m.slug)) { const b = [...new Set(this.clashes(m.slug, this.LOCKED).map(c => c.y))]; if (b.length) this.BLOCKED.set(m.slug, b); }
    // Entscheidung 08.11.: was sich mit dem festen Leistungspaket beißt, gehört nicht in den Katalog (Liste auf der Update-Seite)
    if (this.BLOCKED.size) {
      this.gegenPaket = data.mods.filter(m => this.BLOCKED.has(m.slug)).map(m => ({ name: m.name, mit: this.BLOCKED.get(m.slug)!.map(y => this.name(y)) }));
      data.mods = data.mods.filter(m => !this.BLOCKED.has(m.slug)); for (const s of this.BLOCKED.keys()) delete this.BY[s];
      data.dec.gruppen = data.dec.gruppen.map(g => ({ ...g, mods: g.mods.filter(s => !this.BLOCKED.has(s)) })).filter(g => g.mods.length >= 2);
      this.GROUPOF = {}; for (const g of data.dec.gruppen) g.mods.forEach(s => (this.GROUPOF[s] = g));
    }
    // Medien & Suchtexte einmalig vorberechnen (verhindert tausendfache Array-Erzeugung beim Scrollen)
    const hasMedia = Object.keys(media).length > 0;
    for (const m of data.mods) {
      const s = m.slug;
      const me = media[s];
      const vRaw = me?.videos || [];
      const yt = data.x.details[s]?.yt || [];
      const seenV = new Set<string>();
      const vOut: Video[] = vRaw.filter(x => x.status !== "nein" && x.status !== "review" && !seenV.has(x.id) && !!seenV.add(x.id)).slice(0, 3);
      for (const id of yt) if (!vOut.some(o => o.id === id)) vOut.push({ id, quelle: "beschreibung", punkte: 10 });
      const vids = vOut.slice(0, 4);
      this.#VIDS[s] = vids;
      const vidThumb = vids.slice(0, 3).map(v => thumb(v, false));
      const vidBig = vids.slice(0, 3).map(v => thumb(v, true));
      this.#IMGS[s] = me?.bilder?.length ? me.bilder : m.img?.length ? m.img : vidThumb;
      this.#IMGS_HQ[s] = me?.hq?.length ? me.hq : me?.bilder?.length ? me.bilder : m.img?.length ? m.img : vidBig;
      const searchParts = [
        m.name,
        m.sub,
        m.notiz,
        s,
        CATS[m.cat]?.t || "",
        m.pt === "s" ? "shader shaderpack schatten" : m.pt === "r" ? "resourcepack resource pack textur texture texturen 3d" : m.pt === "d" ? "datapack data pack" : "mod",
        vids.length ? "video videos clip youtube yt showcase trailer" : "",
        m.rolle === "K" ? "empfohlen recommended tipp top must-have" : "",
        m.ampel !== "R" && m.cat !== "S" ? "vanilla client-only" : "server",
        (data.x.details[s]?.txt || "").slice(0, 200)
      ];
      this.#SEARCH[s] = normQ(searchParts.filter(Boolean).join(" "));
    }
    this.sel = new Set(this.LOCKED);
    this.load();
    this.ready = true;
  }
  name = (s: string) => this.BY[s]?.name || this.data.files[s]?.[7] || s;
  matches(s: string, q: string) {
    if (!q) return true;
    if ((this.#SEARCH[s] || "").includes(q)) return true;
    if (this.proben(s).length > 0 && (q === "audio" || q === "sound" || q === "ton" || q === "musik" || q === "horprobe" || q === "proben")) return true;
    return false;
  }
  imgHQ(s: string): string[] { return this.#IMGS_HQ[s] || []; }
  /** Bildergalerie als Paare (Vorschau, Vollbild) in derselben Reihenfolge wie img(): Vorschau-Index = Lightbox-Index.
   *  Modrinth-Vorschauen (…/<hash>_350.webp) und Originale (…/<hash>.png) teilen den Hash, CurseForge den Dateinamen. */
  gallery(s: string): { thumb: string; full: string }[] {
    const key = (u: string) => (u.match(/\/images\/([0-9a-f]{40})/) || [])[1] || u.split("?")[0].split("/").pop() || u;
    const hq = this.#IMGS_HQ[s] || []; const by = new Map(hq.map(u => [key(u), u]));
    const out = this.img(s).map(t => ({ thumb: t, full: by.get(key(t)) || t })); const used = new Set(out.map(o => o.full));
    for (const u of hq) if (!used.has(u)) out.push({ thumb: u, full: u });
    return out;
  }
  img(s: string): string[] { return this.#IMGS[s] || []; }
  icon(s: string): string { return this.media[s]?.icon || this.img(s)[0] || ""; }
  videos(s: string): Video[] { return this.#VIDS[s] || []; }
  cost = (s: string) => (BOOST.has(s) ? 0 : ((COST as any)[s] ?? 1));
  /** Typ eines Eintrags (auch für Bibliotheken ohne Katalogeintrag) */
  typ(s: string) { return this.BY[s]?.pt || this.data.files[s]?.[8] || "m"; }
  implicit(s: string) {
    const t = this.typ(s);
    const alt = ONE_OF[s];
    let base = alt ? (alt.some(a => this.sel.has(a)) ? [] : [alt[0]]) : (IMPLICIT[s] || []);
    if ((s === "carry-on" || s === "punchy-fpa") && this.sel.has("carry-on") && this.sel.has("punchy-fpa")) {
      base = base.concat(["dont-punch-my-tacz"]);
    }
    return base.concat(t === "s" ? ["iris"] : []).concat(t === "d" ? ["globalpacks"] : []).concat(this.data.x.rpo[s] ? ["respackopts"] : []);
  }
  /** Tipps (Beziehungen „Testen“) für Einträge, die gemeinsam im Pack sind */
  tips(r = this.resolve()) {
    const t: { mods: string[]; text: string }[] = this.data.dec.beziehungen.filter(b => b.art === "T" && b.mods.filter(x => r.mods.has(x)).length >= 2).map(b => ({ mods: b.mods.filter(x => r.mods.has(x)), text: b.text }));
    // Shader ohne (sichere) Voxy-Unterstützung zusammen mit Voxy
    if (r.mods.has("voxy")) for (const s of r.mods) { const v = this.BY[s]?.voxy; if (v && v.s !== "ja") t.push({ mods: ["voxy", s], text: v.t }); }
    return t;
  }
  /** Nutzer-Entscheidung für Teil-Überschneidungen ("std" = Standard, "alt" = umgekehrt, "off" = beide anlassen) */
  autoChoice(id: string): AutoMode { return this.cfg._auto?.[id] || "std"; }
  setAutoChoice(id: string, mode: AutoMode) {
    const cur = { ...(this.cfg._auto || {}) };
    if (mode === "std") delete cur[id]; else cur[id] = mode;
    this.cfg = { ...this.cfg, _auto: cur };
    this.save();
  }
  /** Automatische Config-Feinabstimmungen für Teil-Überschneidungen im aktuellen Pack */
  autos(r = this.resolve()) { return activeAutos(r.mods, this.cfg._auto || {}); }
  /** Automatische Feinabstimmungs-Regeln für einen einzelnen Eintrag */
  autoRules(s: string, r = this.resolve()) { return rulesForSlug(s, r.mods, this.cfg._auto || {}); }
  resolve(sel: Set<string> = this.sel) {
    const mods = new Set<string>(), libs = new Set<string>(); const stack = [...sel];
    while (stack.length) { const s = stack.pop()!; if (mods.has(s) || libs.has(s) || DEP_IGNORE.has(s)) continue; const f = this.data.files[s]; if (!f) continue; (this.BY[s] ? mods : libs).add(s); for (const d of f[5].concat(this.implicit(s))) stack.push(d); }
    return { mods, libs };
  }
  /** Vorab-Start-Check: Prüft das fertige Modpack auf fehlende Abhängigkeiten, Konflikte, doppelte Dateien und kaputte Configs */
  verifyPack(r = this.resolve(), fnameFn?: (s: string) => string) {
    const errors: string[] = [];
    const issues: PackIssue[] = [];
    const seenIssueKeys = new Set<string>();
    const seenConflictPairs = new Set<string>();
    const all = [...r.mods, ...r.libs];
    let checkedDeps = 0;
    for (const s of all) {
      const f = this.data.files[s];
      if (!f) {
        errors.push(`Datei-Eintrag fehlt für „${this.name(s)}“ (${s}).`);
        issues.push({ id: `file-missing-${s}`, type: "other", title: `Datei-Eintrag fehlt: „${this.name(s)}“`, detail: `Für ${s} existiert kein Download-Eintrag in den Katalogdaten.`, modA: s, isLockedA: this.LOCKED.has(s) });
        continue;
      }
      if (!String(f[0] || "").startsWith("https://")) {
        const msg = `Ungültige Download-URL für „${this.name(s)}“.`;
        errors.push(msg);
        issues.push({ id: `url-${s}`, type: "other", title: `Download-Fehler: „${this.name(s)}“`, detail: msg, modA: s, isLockedA: this.LOCKED.has(s) });
      }
      if (!/^[0-9a-f]{40}$/i.test(String(f[2] || "")) || !/^[0-9a-f]{128}$/i.test(String(f[3] || ""))) {
        const msg = `Prüfsumme (SHA1/SHA512) unvollständig bei „${this.name(s)}“.`;
        errors.push(msg);
        issues.push({ id: `hash-${s}`, type: "other", title: `Prüfsummen-Fehler: „${this.name(s)}“`, detail: msg, modA: s, isLockedA: this.LOCKED.has(s) });
      }
      if (!(Number(f[4]) > 0)) {
        const msg = `Dateigröße 0 Bytes bei „${this.name(s)}“.`;
        errors.push(msg);
        issues.push({ id: `size-${s}`, type: "other", title: `Dateigröße 0: „${this.name(s)}“`, detail: msg, modA: s, isLockedA: this.LOCKED.has(s) });
      }
      const deps = f[5].concat(this.implicit(s));
      for (const d of deps) {
        if (DEP_IGNORE.has(d)) continue;
        checkedDeps++;
        if (!r.mods.has(d) && !r.libs.has(d)) {
          const msg = `Pflicht-Abhängigkeit „${this.name(d)}“ für „${this.name(s)}“ fehlt im Pack.`;
          errors.push(msg);
          const k = `dep-${s}-${d}`;
          if (!seenIssueKeys.has(k)) {
            seenIssueKeys.add(k);
            issues.push({
              id: k,
              type: "missing_dep",
              title: `Pflicht-Abhängigkeit fehlt: „${this.name(d)}“`,
              detail: `„${this.name(s)}“ benötigt „${this.name(d)}“, um fehlerfrei zu starten.`,
              modA: s,
              modB: d,
              isLockedA: this.LOCKED.has(s),
              isLockedB: false,
              canAddB: !!this.data.files[d] || !!this.BY[d],
              cascadeA: this.cascadeDependentsOf(s)
            });
          }
        }
      }
      if (this.BLOCKED.has(s)) {
        const blockedBy = this.BLOCKED.get(s)!;
        const msg = `„${this.name(s)}“ kollidiert mit dem festen Leistungspaket (${blockedBy.map(y => this.name(y)).join(", ")}).`;
        errors.push(msg);
        const k = `blocked-${s}`;
        if (!seenIssueKeys.has(k)) {
          seenIssueKeys.add(k);
          issues.push({
            id: k,
            type: "break",
            title: `Kollision mit Leistungspaket: „${this.name(s)}“`,
            detail: `${msg} Pflichtmods können für maximale Performance und Stabilität nicht entfernt werden.`,
            modA: s,
            modB: blockedBy[0],
            isLockedA: false,
            isLockedB: true,
            cascadeA: this.cascadeDependentsOf(s)
          });
        }
      }
    }
    for (const p of this.problems()) {
      const msg = `Unaufgelöster Konflikt zwischen „${this.name(p.a)}“ und „${this.name(p.b)}“: ${p.text}`;
      errors.push(msg);
      const pairKey = [p.a, p.b].sort().join("|");
      const k = "prob-" + [p.a, p.b].sort().join("-");
      if (!seenConflictPairs.has(pairKey)) {
        seenConflictPairs.add(pairKey);
        issues.push({
          id: k,
          type: "conflict",
          title: `Konflikt: „${this.name(p.a)}“ vs. „${this.name(p.b)}“`,
          detail: p.text,
          modA: p.a,
          modB: p.b,
          isLockedA: this.LOCKED.has(p.a),
          isLockedB: this.LOCKED.has(p.b),
          cascadeA: this.cascadeDependentsOf(p.a),
          cascadeB: this.cascadeDependentsOf(p.b)
        });
      }
    }
    // Echter Fabric Loader Kompatibilitäts-Check (breaks, conflicts, minecraft-Version aus fabric.mod.json)
    const jarRules = this.data.jar_rules || {};
    const activeModIds = new Map<string, string>();
    for (const s of all) {
      const rule = jarRules[s];
      const mid = rule?.id || s;
      activeModIds.set(mid, s);
      activeModIds.set(s, s);
    }
    const cleanVer = (v: string): number[] => {
      let s = String(v || "").trim();
      s = s.replace(/^[vV]\.?/, "");
      const sub = s.replace(/^(?:mc\d+(?:\.\d+)*[_-]|fabric-\d+(?:\.\d+)*[_-]|fabric-)/i, "");
      if (sub) s = sub;
      s = s.split("+")[0].split("-")[0];
      const parts = s.match(/\d+/g);
      return parts && parts.length ? parts.map(Number) : [0];
    };
    const cmpVer = (v1: number[], v2: number[]): number => {
      const l = Math.max(v1.length, v2.length);
      const a = v1.concat(new Array(l - v1.length).fill(0));
      const b = v2.concat(new Array(l - v2.length).fill(0));
      for (let i = 0; i < l; i++) {
        if (a[i] < b[i]) return -1;
        if (a[i] > b[i]) return 1;
      }
      return 0;
    };
    const isMc26Compatible = (constraint: any): boolean => {
      if (Array.isArray(constraint)) return constraint.some(c => isMc26Compatible(c));
      const c = String(constraint || "").trim();
      if (!c || c === "*") return true;
      if (c.startsWith("26.3") || c.includes("26.*") || c.startsWith("^26") || c.startsWith("~26")) return true;
      const act = [26, 3];
      const rm = c.match(/^(>=|>)\s*([0-9a-zA-Z._-]+)\s*(<=|<)\s*([0-9a-zA-Z._-]+)$/);
      if (rm) {
        const [, op1, low, op2, high] = rm;
        const l = cleanVer(low), h = cleanVer(high);
        const ok1 = op1 === ">=" ? cmpVer(act, l) >= 0 : cmpVer(act, l) > 0;
        const ok2 = op2 === "<=" ? cmpVer(act, h) <= 0 : cmpVer(act, h) < 0;
        return ok1 && ok2;
      }
      const mLow = c.match(/^(>=|>)\s*([0-9a-zA-Z._-]+)$/);
      if (mLow) {
        const [, op, low] = mLow;
        const l = cleanVer(low);
        return op === ">=" ? cmpVer(act, l) >= 0 : cmpVer(act, l) > 0;
      }
      const mHi = c.match(/^(<=|<|=|==)?\s*([0-9a-zA-Z._-]+)$/);
      if (mHi) {
        const [, op = "=", hi = ""] = mHi;
        const h = cleanVer(hi);
        const cVal = cmpVer(act, h);
        if (op === "<=") return cVal <= 0;
        if (op === "<") return cVal < 0;
        if (op === "=" || op === "==") return cVal === 0;
      }
      return false;
    };
    const matchVer = (actual: string, constraint: any): boolean => {
      if (Array.isArray(constraint)) return constraint.some(c => matchVer(actual, c));
      const c = String(constraint || "").trim();
      if (!c || c === "*") return true;
      const act = cleanVer(actual);
      const rangeM = c.match(/^>=\s*([0-9.]+)\s*<\s*([0-9.]+)$/);
      if (rangeM) {
        const low = cleanVer(rangeM[1]), high = cleanVer(rangeM[2]);
        return cmpVer(act, low) >= 0 && cmpVer(act, high) < 0;
      }
      const m = c.match(/^(<=|<|>=|>|=|~|\^)?\s*([0-9a-zA-Z._-]+)$/);
      if (!m) return true;
      const op = m[1] || "=", req = cleanVer(m[2]);
      const cmp = cmpVer(act, req);
      if (op === "~" || op === "^") return cmp === 0;
      if (op === "<=") return cmp <= 0;
      if (op === "<") return cmp < 0;
      if (op === ">=") return cmp >= 0;
      if (op === ">") return cmp > 0;
      return cmp === 0;
    };
    for (const s of all) {
      const rule = jarRules[s];
      if (!rule) continue;
      if (rule.mc && !isMc26Compatible(rule.mc)) {
        const msg = `Mod „${this.name(s)}“ erfordert Minecraft ${rule.mc}, ist aber inkompatibel mit 26.3!`;
        errors.push(msg);
        const k = "mc-" + s;
        if (!seenIssueKeys.has(k)) {
          seenIssueKeys.add(k);
          issues.push({
            id: k,
            type: "mc_incompatible",
            title: `„${this.name(s)}“ ist inkompatibel mit Minecraft 26.3`,
            detail: `Das Mod-Manifest setzt Minecraft ${rule.mc} voraus.`,
            modA: s,
            isLockedA: this.LOCKED.has(s),
            cascadeA: this.cascadeDependentsOf(s)
          });
        }
      }
      if (rule.breaks) {
        for (const [targetMid, constraint] of Object.entries(rule.breaks)) {
          if (activeModIds.has(targetMid)) {
            const targetSlug = activeModIds.get(targetMid)!;
            if (targetSlug === s) continue;
            const targetFile = this.data.files[targetSlug];
            const targetVer = targetFile?.[6] || "";
            if (constraint === "*" || matchVer(targetVer, constraint)) {
              const msg = `Inkompatibilität: „${this.name(s)}“ schließt „${this.name(targetSlug)}“ (Version ${targetVer || constraint}) aus!`;
              errors.push(msg);
              const pairKey = [s, targetSlug].sort().join("|");
              const k = "break-" + [s, targetSlug].sort().join("-");
              if (!seenConflictPairs.has(pairKey)) {
                seenConflictPairs.add(pairKey);
                issues.push({
                  id: k,
                  type: "break",
                  title: `Inkompatibilität: „${this.name(s)}“ vs. „${this.name(targetSlug)}“`,
                  detail: `„${this.name(s)}“ schließt „${this.name(targetSlug)}“ (Version ${targetVer || constraint}) technisch aus.`,
                  modA: s,
                  modB: targetSlug,
                  isLockedA: this.LOCKED.has(s),
                  isLockedB: this.LOCKED.has(targetSlug),
                  cascadeA: this.cascadeDependentsOf(s),
                  cascadeB: this.cascadeDependentsOf(targetSlug)
                });
              }
            }
          }
        }
      }
      if (rule.conflicts) {
        for (const [targetMid, constraint] of Object.entries(rule.conflicts)) {
          if (activeModIds.has(targetMid)) {
            const targetSlug = activeModIds.get(targetMid)!;
            if (targetSlug === s) continue;
            const msg = `Kollision: „${this.name(s)}“ hat einen unlösbaren Konflikt mit „${this.name(targetSlug)}“!`;
            errors.push(msg);
            const pairKey = [s, targetSlug].sort().join("|");
            const k = "conflict-" + [s, targetSlug].sort().join("-");
            if (!seenConflictPairs.has(pairKey)) {
              seenConflictPairs.add(pairKey);
              issues.push({
                id: k,
                type: "conflict",
                title: `Kollision: „${this.name(s)}“ vs. „${this.name(targetSlug)}“`,
                detail: `Die Mods können laut JAR-Manifest nicht gleichzeitig ausgeführt werden.`,
                modA: s,
                modB: targetSlug,
                isLockedA: this.LOCKED.has(s),
                isLockedB: this.LOCKED.has(targetSlug),
                cascadeA: this.cascadeDependentsOf(s),
                cascadeB: this.cascadeDependentsOf(targetSlug)
              });
            }
          }
        }
      }
    }
    if (fnameFn) {
      const seenPath = new Map<string, string>();
      for (const s of all) {
        const t = this.typ(s);
        const dir = t === "r" ? "resourcepacks/Modpack" : t === "s" ? "shaderpacks" : t === "d" ? "datapacks" : "mods";
        const p = (dir + "/" + fnameFn(s)).toLowerCase();
        if (seenPath.has(p)) {
          const msg = `Doppelter Dateiname im Zielordner: ${p} (${this.name(seenPath.get(p)!)} & ${this.name(s)})`;
          errors.push(msg);
          issues.push({
            id: `dupe-${p}`,
            type: "other",
            title: `Doppelter Dateiname: ${p}`,
            detail: msg,
            modA: seenPath.get(p)!,
            modB: s,
            isLockedA: this.LOCKED.has(seenPath.get(p)!),
            isLockedB: this.LOCKED.has(s)
          });
        }
        else seenPath.set(p, s);
      }
    }
    let checkedConfigs = 0;
    try {
      const fn = fnameFn || ((s: string) => String(this.data.files[s]?.[1] || s));
      const cfgs = buildAutoConfigFiles(r.mods, this.data.x.rpo || {}, fn, (s, k) => this.cv(s, k), this.cfg._auto || {});
      for (const [k, content] of Object.entries(cfgs)) {
        checkedConfigs++;
        if (k.endsWith(".json") || k.endsWith(".rpo")) {
          try { JSON.parse(content); } catch {
            const msg = `Fehlerhafte JSON-Syntax in generierter Datei „${k}“.`;
            errors.push(msg);
            issues.push({ id: `cfg-syntax-${k}`, type: "other", title: `Konfigurationsfehler: ${k}`, detail: msg });
          }
        }
        if (!content || !content.trim()) {
          const msg = `Leere generierte Konfigurationsdatei „${k}“.`;
          errors.push(msg);
          issues.push({ id: `cfg-empty-${k}`, type: "other", title: `Leere Konfiguration: ${k}`, detail: msg });
        }
      }
    } catch (e: any) {
      const msg = `Fehler beim Erzeugen der Konfigurationsdateien: ${e?.message || e}`;
      errors.push(msg);
      issues.push({ id: "cfg-build-err", type: "other", title: "Fehler beim Erzeugen der Konfiguration", detail: msg });
    }
    return { ok: errors.length === 0, errors, issues, checkedFiles: all.length, checkedDeps, checkedConfigs };
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
  /** Rückgängig sichert Auswahl, Vorlage, Assistenten-Vorschläge und -Grundeinstellungen (nicht Packname/Pack-Reihenfolge) */
  snapshot() { this.history.push({ sel: [...this.sel], preset: this.preset, sug: [...this.sug], base: this.cfg._base, wiz: this.wiz }); if (this.history.length > 50) this.history.shift(); }
  undo() {
    const h = this.history.pop(); if (!h) return false;
    this.sel = new Set(h.sel); this.preset = h.preset; this.sug = new Set(h.sug); this.wiz = h.wiz;
    const c = { ...this.cfg }; if (h.base) c._base = h.base; else delete c._base; this.cfg = c; this.save(); return true;
  }
  cascadeDependentsOf(targetSlug: string, inSel: Set<string> = this.sel): string[] {
    const cascade = new Set<string>();
    const queue = [targetSlug];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const s of inSel) {
        if (s === cur || cascade.has(s) || s === targetSlug) continue;
        const f = this.data.files[s];
        const deps = (f ? f[5] : []).concat(this.implicit(s));
        if (deps.includes(cur)) {
          cascade.add(s);
          queue.push(s);
        }
      }
    }
    return [...cascade];
  }
  removeWithCascade(targetSlug: string) {
    if (this.LOCKED.has(targetSlug)) return;
    const toDrop = this.cascadeDependentsOf(targetSlug);
    this.snapshot();
    const n = new Set(this.sel);
    n.delete(targetSlug);
    for (const d of toDrop) {
      if (!this.LOCKED.has(d)) {
        n.delete(d);
      }
    }
    this.sel = n;
    this.save();
  }
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
  cv(slug: string, k: string) {
    if (this.cfg[slug] && k in this.cfg[slug]) return this.cfg[slug][k];
    const group = slug === "_base" ? BASE : (SETDEF as any)[slug];
    const def = group?.items?.find((i: any) => i.k === k);
    return def?.d ?? "";
  }
  setCv(slug: string, k: string, v: any) { this.cfg = { ...this.cfg, [slug]: { ...(this.cfg[slug] || {}), [k]: v } }; this.save(); }
  resetCv(slug: string, k: string) { const c = { ...(this.cfg[slug] || {}) }; delete c[k]; this.cfg = { ...this.cfg, [slug]: c }; this.save(); }
  ramGB(r = this.resolve(), sys = Number(this.wiz.ram || 0)) { const n = r.mods.size + r.libs.size; let g = n < 60 ? 4 : n < 120 ? 6 : n < 250 ? 8 : 10; if (r.mods.has("voxy") || r.mods.has("distanthorizons")) g += 1; if (r.mods.has("faithful-64x")) g += 1; if (sys) g = Math.min(g, Math.floor(sys / 2)); return Math.max(3, Math.min(g, 10)); }
  load_() { const c = [...this.resolve().mods].filter(s => !this.LOCKED.has(s)).reduce((a, s) => a + this.cost(s), 0); return { c, l: c < 15 ? "Leicht" : c < 30 ? "Mittel" : "Schwer", t: c < 15 ? "ok" : c < 30 ? "warn" : "bad" }; }
  // Server-Pack: Werkzeuge einzeln wählbar. Vorauswahl: harmlose ja, „nichtAuto“ nur, wenn im Pack gewählt
  srvTools(r = this.resolve()) { return this.data.mods.filter(m => m.cat === "S" && this.data.files[m.slug] && (m.slug !== "voxy-server-side" || r.mods.has("voxy"))); }
  srvDefault(s: string, r = this.resolve()) { return r.mods.has(s) || !this.BY[s]?.nichtAuto; }
  srvOn(s: string, r = this.resolve()) { const o = this.cfg._srv?.[s]; return typeof o === "boolean" ? o : this.srvDefault(s, r); }
  setSrv(s: string, on: boolean) { const c = { ...(this.cfg._srv || {}) }; if (on === this.srvDefault(s)) delete c[s]; else c[s] = on; this.cfg = { ...this.cfg, _srv: c }; this.save(); }
  // Speicherung
  save() { try { localStorage.setItem("mk-v3", JSON.stringify({ s: [...this.sel], c: this.cfg, w: this.wiz, p: this.preset })); } catch {} }
  load() {
    try { const v = JSON.parse(localStorage.getItem("mk-v3") || localStorage.getItem("mk-sel2") || "null"); if (v?.s) { this.sel = new Set([...this.LOCKED, ...v.s.filter((s: string) => this.BY[s])]); this.cfg = v.c || {}; this.wiz = v.w || {}; this.preset = v.p || null; } } catch {}
    this.importShared();
  }
  /** Auswahl aus einem geteilten Link (#p=… mit Slugs; alte #pack-… Links mit Positionen werden noch gelesen).
   *  Eigene Einstellungen bleiben, die vorige Auswahl ist per Rückgängig erreichbar, der Link verschwindet aus der Adresse. */
  /** Ergebnis des letzten Link-Imports (Anzahl nicht übernommener Einträge), für die Meldung in der Oberfläche */
  imported: number | null = $state(null);
  importShared(): number | null {
    const h = location.hash; let slugs: string[] | null = null;
    if (h.startsWith("#p=")) { try { slugs = (LZString.decompressFromEncodedURIComponent(h.slice(3)) || "").split(",").filter(Boolean); } catch { slugs = []; } }
    else { const hm = h.match(/^#pack-([0-9a-z.]+)$/); if (hm) slugs = hm[1].split(".").map(x => this.data.mods[parseInt(x, 36)]?.slug).filter(Boolean) as string[]; }
    if (!slugs) return null;
    const ok = slugs.filter(s => this.BY[s] && !this.BLOCKED.has(s));
    this.snapshot(); this.sel = new Set([...this.LOCKED, ...ok]); this.preset = null; this.sug = new Set(); this.save();
    try { history.replaceState(null, "", location.pathname + location.search + "#bauen"); } catch {}
    return (this.imported = slugs.length - ok.length);
  }
  shareUrl() { const list = [...this.sel].filter(s => !this.LOCKED.has(s)).sort(); return location.href.split("#")[0] + "#p=" + LZString.compressToEncodedURIComponent(list.join(",")); }
  /** setzt nur das Pack zurück; Testverlauf und Hell/Dunkel bleiben */
  resetAll() { try { ["mk-v3", "mk-sel2"].forEach(k => localStorage.removeItem(k)); } catch {} this.sel = new Set(this.LOCKED); this.cfg = {}; this.wiz = {}; this.preset = null; this.sug = new Set(); this.history = []; }
}
export const pack = new Pack();
