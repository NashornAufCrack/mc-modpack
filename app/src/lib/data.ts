// Datenschicht: GitHub-Pages lädt per fetch, das Artifact bekommt alles eingebettet.
export type Mod = {
  slug: string; name: string; cat: "P" | "V" | "G" | "T" | "S"; sub: string; ampel: "G" | "Y" | "R" | "Q";
  rolle: "K" | "O" | "A"; downloadsK: number; notiz: string; quellen: string[]; pt?: "m" | "r" | "s" | "d";
  img?: string[]; pflicht?: boolean; seite?: string; cf?: string; vn?: string;
};
export type Gruppe = { id: string; titel: string; mods: string[]; text: string };
export type Beziehung = { art: "K" | "D" | "T" | "A" | "S"; mods: string[]; text: string; erledigt?: boolean };
export type CfgItem = { k: string; t: "bool" | "num" | "str"; d: any; h?: string; o?: string[] };
export type CfgFile = { file: string; fmt: "json" | "json5" | "toml" | "props"; items: CfgItem[] };
export type Video = { id: string; quelle: string; punkte: number; titel?: string; kanal?: string; status?: string; warum?: string[] };
export type Media = { bilder?: string[]; icon?: string | null; videos?: Video[] };
export type AppData = {
  mods: Mod[]; files: Record<string, any[]>; dec: { gruppen: Gruppe[]; beziehungen: Beziehung[]; entscheidungen: any[] }; settings: any;
  x: { cfgs: Record<string, CfgFile[]>; tpl: Record<string, string>; tplS: Record<string, string>; details: Record<string, { txt?: string; yt?: string[] }>;
       keys: [string, string, string, string][]; rpo: Record<string, { fn: string; data: any }>; prules: any[] };
};
export const ARTIFACT = import.meta.env.MODE === "artifact";
const DATA = (import.meta.env.VITE_DATA as string) || "data/";

export async function loadData(): Promise<{ data: AppData; media: Record<string, Media> }> {
  if (ARTIFACT) {
    const data = (await import("../../../data/app-data.json")).default as unknown as AppData;
    return { data, media: {} };
  }
  const [data, media] = await Promise.all([
    fetch(DATA + "app-data.json").then(r => r.json()),
    fetch(DATA + "media.json").then(r => (r.ok ? r.json() : {})).catch(() => ({})),
  ]);
  return { data, media };
}
