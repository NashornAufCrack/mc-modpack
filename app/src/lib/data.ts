// Datenschicht: GitHub-Pages lädt per fetch, das Artifact bekommt alles eingebettet.
export type Mod = {
  slug: string; name: string; cat: "P" | "V" | "B" | "G" | "T" | "S"; sub: string; ampel: "G" | "Y" | "R" | "Q";
  rolle: "K" | "O" | "A"; downloadsK: number; notiz: string; quellen: string[]; pt?: "m" | "r" | "s" | "d";
  img?: string[]; pflicht?: boolean; neu?: boolean; seite?: string; cf?: string; vn?: string;
  /** Server-Werkzeug, das nicht automatisch ins Server-Pack kommt (Grund) */
  nichtAuto?: string;
  /** nur Shader: funktioniert er mit der Fernsicht-Mod Voxy? */
  voxy?: { s: "ja" | "nein" | "?"; t: string };
};
export type Gruppe = { id: string; titel: string; mods: string[]; text: string };
export type Beziehung = { art: "K" | "D" | "T" | "A" | "S"; mods: string[]; text: string; erledigt?: boolean };
export type CfgItem = { k: string; t: "bool" | "num" | "str"; d: any; h?: string; o?: string[] };
export type CfgFile = { file: string; fmt: "json" | "json5" | "toml" | "props"; items: CfgItem[] };
export type Video = { id: string; quelle: string; punkte: number; titel?: string; kanal?: string; status?: string; warum?: string[]; b?: number; hd?: number };
export type Media = { bilder?: string[]; hq?: string[]; icon?: string | null; videos?: Video[] };
export type AppData = {
  mods: Mod[]; files: Record<string, any[]>; dec: { gruppen: Gruppe[]; beziehungen: Beziehung[]; entscheidungen: any[] }; settings: any;
  x: { details: Record<string, { txt?: string; yt?: string[] }>;
       rpo: Record<string, { fn: string; data: any }>; rpbad?: string[]; basisfehlt?: Record<string, string[]> };
};
export const ARTIFACT = import.meta.env.MODE === "artifact";
const DATA = (import.meta.env.VITE_DATA as string) || "data/";

export type Updates = { checked: string; mc: string; updates: Upd[]; verlauf: { datum: string; updates: Upd[] }[]; ohneNeue: { slug: string; name: string; version: string; seit: string }[]; verfuegbar?: { slug: string; name: string; aktuell: string; neu: string; grund: string }[]; next: { version: string; total: number; ready: number; missing: string[] } | null };
export type Upd = { slug: string; name: string; typ: string; von: string; auf: string; art: string; datum: string };
export type Probe = { datei: string; titel: string };
/** Hörproben: Pfade sind relativ zum Repo-Wurzelordner */
export const SOUNDBASE = DATA + "../";
/** Selbst gehostete YouTube-Vorschaubilder (scripts/yt-thumbs.py); fehlt eines, lädt die Seite es von YouTube */
export const thumb = (v: { id: string; b?: number; hd?: number }, big = false) =>
  big && v.hd ? `${SOUNDBASE}media/yt/${v.id}-hd.webp` : v.b ? `${SOUNDBASE}media/yt/${v.id}.webp` : `https://i.ytimg.com/vi/${v.id}/${big ? "maxresdefault" : "hqdefault"}.jpg`;
export async function loadSounds(): Promise<Record<string, { proben: Probe[] }>> { if (ARTIFACT) return {}; try { const r = await fetch(DATA + "sounds.json"); return r.ok ? r.json() : {}; } catch { return {}; } }
export async function loadUpdates(): Promise<Updates | null> { if (ARTIFACT) return null; try { const r = await fetch(DATA + "updates.json", { cache: "no-cache" }); return r.ok ? r.json() : null; } catch { return null; } }
export async function loadData(): Promise<{ data: AppData; media: Record<string, Media> }> {
  if (ARTIFACT) {
    const data = (await import("../../../data/app-data.json")).default as unknown as AppData;
    return { data, media: {} };
  }
  const json = async (f: string) => { const r = await fetch(DATA + f); if (!r.ok) throw new Error(f + ": HTTP " + r.status); return r.json(); };
  // media-app.json ist die schlanke Fassung (nur Bilder und freigegebene Videos), media.json der Rückfall
  const [data, media] = await Promise.all([
    json("app-data.json"),
    json("media-app.json").catch(() => json("media.json")).catch(() => ({})),
  ]);
  return { data, media };
}
