// Oberflächen-Zustand: welche Dialoge offen sind, Filter, Toasts
import { pack } from "./pack.svelte";

class UI {
  view = $state<"bauen" | "testen" | "hilfe" | "crash" | "updates">("bauen");
  tab = $state<"m" | "s" | "r" | "d">("m");
  sub = $state<string | null>(null);
  sub2 = $state<string | null>(null);
  q = $state("");
  filters = $state(new Set<string>());
  detail = $state<string | null>(null);
  lightbox = $state<{ slug: string; i: number; video?: string } | null>(null);
  wizard = $state(false);
  tool = $state<"rp" | "ai" | null>(null);
  conflict = $state<{ x: string; cl: ReturnType<typeof pack.clashes> } | null>(null);
  toast = $state<{ text: string; undo?: boolean } | null>(null);
  theme = $state<"dark" | "light">("dark");
  #t: any;
  say(text: string, undo = false) { this.toast = { text, undo }; clearTimeout(this.#t); this.#t = setTimeout(() => (this.toast = null), 5000); }
  /** Auswahl umschalten – bei Konflikt fragt ein Dialog */
  pick(x: string, on = !pack.sel.has(x)) {
    if (!on) { if (pack.LOCKED.has(x)) return; pack.set(x, false); this.say(`${pack.name(x)} entfernt`, true); return; }
    const bl = pack.BLOCKED.get(x);
    if (bl) { this.say(`${pack.name(x)} geht nicht: verträgt sich nicht mit ${bl.map(y => pack.name(y)).join(", ")} aus dem festen Leistungspaket.`); return; }
    const cl = pack.clashes(x);
    if (cl.length) { this.conflict = { x, cl }; return; }
    pack.set(x, true); this.say(`${pack.name(x)} hinzugefügt`, true);
  }
  resolveConflict(take: boolean) {
    const c = this.conflict; this.conflict = null; if (!c || !take) return;
    const drop = [...new Set(c.cl.map(k => k.y))].filter(y => !pack.LOCKED.has(y));
    pack.set(c.x, true, drop); this.say(`${pack.name(c.x)} genommen${drop.length ? ", " + drop.map(y => pack.name(y)).join(", ") + " entfernt" : ""}`, true);
  }
  /** Rückgängig inkl. Vorlage/Assistent; der Assistenten-Filter verschwindet, wenn es keine Vorschläge mehr gibt */
  undo() { if (!pack.undo()) { this.say("Nichts zum Rückgängigmachen"); return; } if (!pack.sug.size && this.filters.has("sug")) { const f = new Set(this.filters); f.delete("sug"); this.filters = f; } this.say("Rückgängig gemacht"); }
  setTheme(t: "dark" | "light") { this.theme = t; document.documentElement.dataset.theme = t; try { localStorage.setItem("mk-theme", t); } catch {} }
}
export const ui = new UI();
