// Tastenbelegung: Datenmodell, Konfliktlogik, Zuordnung Browser-Taste ↔ Minecraft (GLFW, US-Position)
import { pack } from "./pack.svelte";

export type Binding = { id: string; def: string; key: string; mod: string; ctx: string; mods: string[] };
export const LBL: Record<string, string> = { z: "Y", y: "Z", semicolon: "Ö", apostrophe: "Ä", "left.bracket": "Ü", "right.bracket": "+", minus: "ß", equal: "´", "grave.accent": "^", slash: "-", backslash: "#", "world.2": "<", "left.shift": "Shift", "right.shift": "Shift", "left.control": "Strg", "right.control": "Strg", "left.alt": "Alt", "right.alt": "AltGr", space: "Leertaste", tab: "Tab", "caps.lock": "⇪", enter: "Enter", backspace: "⌫", escape: "Esc", "left.win": "⊞", menu: "☰", comma: ",", period: ".", insert: "Einfg", delete: "Entf", home: "Pos1", end: "Ende", "page.up": "Bild↑", "page.down": "Bild↓", up: "↑", down: "↓", left: "←", right: "→", "print.screen": "Druck", "scroll.lock": "Rollen", pause: "Pause",
  "mouse.left": "Links", "mouse.right": "Rechts", "mouse.middle": "Rad-Klick", "mouse.4": "Zurück", "mouse.5": "Vor", "mouse.wheel.up": "Rad ↑", "mouse.wheel.down": "Rad ↓" };
export const label = (k: string) => (k ? LBL[k] || k.replace(/^keypad\./, "Num ").toUpperCase() : "–");
// ISO-QWERTZ: [glfw-Name, Breite in Einheiten]
type K = [string, number];
export const ROWS: K[][] = [
  [["escape",1],["",1],["f1",1],["f2",1],["f3",1],["f4",1],["",.5],["f5",1],["f6",1],["f7",1],["f8",1],["",.5],["f9",1],["f10",1],["f11",1],["f12",1]],
  [["grave.accent",1],["1",1],["2",1],["3",1],["4",1],["5",1],["6",1],["7",1],["8",1],["9",1],["0",1],["minus",1],["equal",1],["backspace",2]],
  [["tab",1.5],["q",1],["w",1],["e",1],["r",1],["t",1],["y",1],["u",1],["i",1],["o",1],["p",1],["left.bracket",1],["right.bracket",1],["enter",1.5]],
  [["caps.lock",1.75],["a",1],["s",1],["d",1],["f",1],["g",1],["h",1],["j",1],["k",1],["l",1],["semicolon",1],["apostrophe",1],["backslash",1],["",1.25]],
  [["left.shift",1.25],["world.2",1],["z",1],["x",1],["c",1],["v",1],["b",1],["n",1],["m",1],["comma",1],["period",1],["slash",1],["right.shift",2.75]],
  [["left.control",1.25],["left.win",1.25],["left.alt",1.25],["space",6.25],["right.alt",1.25],["menu",1.25],["right.control",1.25]],
];
export const NAV: K[][] = [[["insert",1],["home",1],["page.up",1]],[["delete",1],["end",1],["page.down",1]],[["",1]],[["",1],["up",1],["",1]],[["left",1],["down",1],["right",1]]];
export const MOUSE = ["mouse.left", "mouse.middle", "mouse.right", "mouse.wheel.up", "mouse.wheel.down", "mouse.4", "mouse.5"];
export const MODKEYS = ["left.shift", "right.shift", "left.control", "right.control", "left.alt", "right.alt", "f3"];

// KeyboardEvent.code → glfw-Name (beide nach US-Position)
export function codeToKey(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^F\d{1,2}$/.test(code)) return code.toLowerCase();
  if (/^Numpad\d$/.test(code)) return "keypad." + code.slice(6);
  const M: Record<string, string> = { Escape: "escape", Backquote: "grave.accent", Minus: "minus", Equal: "equal", Backspace: "backspace", Tab: "tab", BracketLeft: "left.bracket", BracketRight: "right.bracket", Enter: "enter", CapsLock: "caps.lock", Semicolon: "semicolon", Quote: "apostrophe", Backslash: "backslash", ShiftLeft: "left.shift", ShiftRight: "right.shift", IntlBackslash: "world.2", Comma: "comma", Period: "period", Slash: "slash", ControlLeft: "left.control", ControlRight: "right.control", MetaLeft: "left.win", AltLeft: "left.alt", AltRight: "right.alt", ContextMenu: "menu", Space: "space", Insert: "insert", Delete: "delete", Home: "home", End: "end", PageUp: "page.up", PageDown: "page.down", ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", PrintScreen: "print.screen", ScrollLock: "scroll.lock", Pause: "pause" };
  return M[code] || null;
}
export const mouseToKey = (b: number) => ["mouse.left", "mouse.middle", "mouse.right", "mouse.4", "mouse.5"][b] || null;

/** alle Belegungen der aktiven Mods (Vanilla immer) */
export function bindings(): Binding[] {
  const ch = pack.cfg._keys || {}; const out: Binding[] = [];
  for (const [id, def, mod, ctx] of pack.data.x.keys) {
    if (!(mod === "vanilla" || mod === "vanilla-f3" || pack.sel.has(mod))) continue;
    const raw = id in ch ? ch[id] : def;
    const key = raw.replace(/^maus\./, "mouse.");
    out.push({ id, def, key, mod: mod === "vanilla-f3" ? "vanilla" : mod, ctx: ctx === "f3" ? "welt" : ctx, mods: ctx === "f3" ? ["f3"] : [] });
  }
  return out;
}
export type KeyState = "frei" | "einfach" | "konflikt" | "mehrfach" | "kombi";
export function keyMap(list = bindings()) {
  const by: Record<string, Binding[]> = {};
  for (const b of list) if (b.key) (by[b.key] ||= []).push(b);
  return by;
}
export function state(bs: Binding[] | undefined, heldMods: string[] = []): KeyState {
  if (!bs || !bs.length) return "frei";
  const rel = bs.filter(b => sameMods(b.mods, heldMods));
  if (!rel.length) return heldMods.length ? "frei" : "kombi";
  const groups: Record<string, Set<string>> = {};
  for (const b of rel) (groups[b.ctx] ||= new Set()).add(b.mod);
  if (Object.values(groups).some(g => g.size > 1)) return "konflikt";
  return rel.length > 1 ? "mehrfach" : "einfach";
}
const norm = (m: string) => m.replace(/^(left|right)\./, "");
export const sameMods = (a: string[], b: string[]) => { const A = [...new Set(a.map(norm))].sort().join(), B = [...new Set(b.map(norm))].sort().join(); return A === B; };
export function conflicts(list = bindings()) {
  const by = keyMap(list); const out: { key: string; mods: string[]; items: Binding[] }[] = [];
  for (const [key, bs] of Object.entries(by)) {
    const g: Record<string, Binding[]> = {};
    for (const b of bs) (g[b.ctx + "|" + [...new Set(b.mods.map(norm))].sort().join()] ||= []).push(b);
    for (const [k, items] of Object.entries(g)) if (new Set(items.map(i => i.mod)).size > 1) out.push({ key, mods: k.split("|")[1] ? k.split("|")[1].split(",") : [], items });
  }
  return out;
}
export function actionLabel(b: Binding) { return b.id.replace(/^(key|keybind|keybinding)\./, "").replace(/^[^.]+\./, (m) => (b.mod === "vanilla" ? "" : "")).replace(/[._]/g, " ").replace(/\s+/g, " ").trim(); }
export function keyLines() { const ch = pack.cfg._keys || {}; const ids = new Set(bindings().map(b => b.id)); return Object.keys(ch).filter(id => ids.has(id)).map(id => `key_${id}:${ch[id] ? (ch[id].startsWith("mouse.") || ch[id].startsWith("maus.") ? "key.mouse." + ch[id].replace(/^(maus|mouse)\./, "") : "key.keyboard." + ch[id]) : "key.keyboard.unknown"}`); }
export function setKey(id: string, key: string) { pack.cfg = { ...pack.cfg, _keys: { ...(pack.cfg._keys || {}), [id]: key } }; pack.save(); }
export function resetKey(id: string) { const c = { ...(pack.cfg._keys || {}) }; delete c[id]; pack.cfg = { ...pack.cfg, _keys: c }; pack.save(); }
/** freie Taste vorschlagen (für eine Belegung) */
export function suggestFree(b: Binding) {
  const by = keyMap(); const cand = ["f7","f8","f9","f10","j","k","l","n","m","u","o","p","h","g","b","v","x","comma","period","semicolon","apostrophe","left.bracket","right.bracket","keypad.1","keypad.2","keypad.3"];
  return cand.find(k => !(by[k] || []).some(o => o.ctx === b.ctx && sameMods(o.mods, b.mods))) || "";
}
