// Oberflächen-Zustand: welche Dialoge offen sind, Filter, Toasts
import { pack } from "./pack.svelte";

class UI {
  view = $state<"bauen" | "testen" | "hilfe" | "crash">("bauen");
  tab = $state<"m" | "s" | "r" | "d">("m");
  sub = $state<string | null>(null);
  q = $state("");
  filters = $state(new Set<string>());
  detail = $state<string | null>(null);
  lightbox = $state<{ slug: string; i: number } | null>(null);
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
    const cl = pack.clashes(x);
    if (cl.length) { this.conflict = { x, cl }; return; }
    pack.set(x, true); this.say(`${pack.name(x)} hinzugefügt`, true);
  }
  resolveConflict(take: boolean) {
    const c = this.conflict; this.conflict = null; if (!c || !take) return;
    pack.set(c.x, true, [...new Set(c.cl.map(k => k.y))]); this.say(`${pack.name(c.x)} genommen, ${[...new Set(c.cl.map(k => pack.name(k.y)))].join(", ")} entfernt`, true);
  }
  setTheme(t: "dark" | "light") { this.theme = t; document.documentElement.dataset.theme = t; try { localStorage.setItem("mk-theme", t); } catch {} }
}
export const ui = new UI();
