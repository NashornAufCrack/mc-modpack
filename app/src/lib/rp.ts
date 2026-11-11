// Resource-Pack-Reihenfolge (oben = höchste Priorität)
import { pack } from "./pack.svelte";
import { AUTO_RULES } from "./auto-cfg";

export const RPRANK: string[][] = [
  // 0: Spezifische Standalone-Fixes / Erweiterungen ganz oben
  ["fresh-flower-pots-rotated", "fresh-flower-pots", "fresh-skeleton-physics", "als-creepers-revamped"],
  // 1: Fresh Animations Addons & Extensions (müssen VOR Fresh Animations geladen werden)
  [
    "fresh-animations-extensions", "fa-player-extension", "just-expressions", "detailed-animations",
    "als-piglins-revamped-x-fresh-animations", "als-zombies-revamped-x-fresh-animations",
    "als-enderman-revamped-x-fresh-animations", "als-skeletons-revamped-x-fresh-animations",
    "assorted-allays-x-fresh-animations", "bare-bones-x-fresh-animations",
    "3d-harnesses-x-fresh-animations", "fresh-animations-quivers",
    "brays-zombie-overhaul-fresh-animations", "whimscape-x-fresh-animations",
    "als-boss-rush-x-fresh-animations", "excalibur-fresh-animations"
  ],
  // 2: Fresh Animations Core
  ["fresh-animations"],
  // 3: Hand- & Ess-Animationen, Punchy-Addons
  [
    "fresh-food-for-hyper-punchy", "3d-flint-steel-for-punchy", "drigo-3d-lanterns-x-punchy",
    "animated-3d-wind-charge-compatible-with-punchy", "hyper-punchy", "fluid-foolish",
    "theones-eating-animation-pack"
  ],
  // 4: 3D-Items, Ausrüstung, Werkzeuge, Held Items & Mobs
  [
    "brays-better-3d-bow", "amazing-mace-3d", "blockier-goat-horn", "animated-totem-of-undying",
    "glowing-3d-totem", "small-shield-totem", "small-held-items", "low-shield-pack",
    "fresh-food", "fresh-seeds", "fresh-flowers-and-plants", "fresh-ores-and-ingots",
    "fresh-buckets", "fresh-music-discs", "just-3d-potions", "refined-buckets",
    "findreks-3d-buckets-and-fish", "fyoncles-3d-trims", "glowing-3d-armor",
    "luminous-lanterns", "tools-and-utils", "bray-cyber-3d-enchanted-books",
    "nautilus3d", "animated-doors", "spooky-doors", "swinging-lanterns", "mob-crates"
  ],
  // 5: Spezifische 3D-Weltblöcke, Vegetation, Laub, Möbel & Wege (überschreiben generische 3D-Packs)
  [
    "fwa", "better-lanterns", "better-candles", "torches-reimagined", "weskersons-torches",
    "rays-3d-rails", "minecarts-with-wheels", "3d-ladders", "rays-3d-ladders",
    "3d-crops", "fancy-crops", "3d-bamboo-shoots", "fancy-beds", "dimanic-beds",
    "renewed-bookshelf", "os-colorful-grasses", "connected-paths", "connected-rocks",
    "borderless-glass", "simple-overlays", "fast-better-grass", "better-leaves",
    "fancyfast-bushy-leaves", "cubic-leaves", "hanging-leaves", "bushier-bushes",
    "better-moss", "rainbows-foliage", "fluffy-carpets", "emissive-trims",
    "animated-items", "xk-redstone-display", "excalibur-lootr-support"
  ],
  // 6: Generische 3D-Welt & Block-Overhauls (Basis unter den spezifischen Packs)
  [
    "actually-3d-stuff", "nature-x", "3d-default"
  ],
  // 7: Optische Effekte, Glühen, Partikel, Verzauberungen & Himmel
  [
    "jutting-ores", "animated-ore", "subtly-glowing-ores", "new-glowing-ores",
    "glowing-glints", "visual-enchantments", "even-better-enchants", "beautiful-enchanted-books",
    "enchanted-books-re-covered", "visual-armor-trims", "better-flame-particles",
    "enchanting-table-magic-circle", "eggs-n-eyes", "rethoughted-spawn-eggs",
    "blinking-ender-eyes", "low-on-fire", "low-fire-pack", "visual-effects-plus",
    "dramatic-skys", "sunbathing-godrays", "default-hd-sun-and-moon"
  ],
  // 8: GUI, HUD, Menüs, Icons & Übersetzungen (Icons oben, damit Fonts nicht überschrieben werden)
  [
    "icons", "clearer-slot-highlight", "enhanced-boss-bars", "hardcore-hearts",
    "no-pumpkin-blur", "unique-dark", "cozyui-plus", "default-dark-mode",
    "recolourful-containers-gui", "redstone-tweaks", "translations-for-sodium",
    "shrimps-immersive-interfaces", "immersive-interfaces-mod-support-unofficial"
  ],
  // 9: Audio & Geräusche
  ["vvi", "enhanced-audio", "gentler-weather-sounds"],
  // 10: Basis-Texturen / Komplett-Overhauls
  ["vanilla-exp", "xalis-enhanced-vanilla", "faithful-32x", "faithful-64x"]
];

function fallbackRank(s: string): number {
  if (/fresh-animations|-fa-/.test(s)) return 1;
  if (/punchy/.test(s)) return 3;
  if (/3d|model|item|totem|bow|mace|sword|armor|tool/.test(s)) return 4;
  if (/crop|leaf|leaves|grass|bush|tree|wood|rock|path|block|glass/.test(s)) return 5;
  if (/nature-x|actually-3d/.test(s)) return 6;
  if (/ore|glint|glow|enchant|flame|fire|sky|sun|moon|eye|effect/.test(s)) return 7;
  if (/gui|ui|dark|icon|hud|bar|heart|menu|translat/.test(s)) return 8;
  if (/sound|audio|weather|voice/.test(s)) return 9;
  if (/vanilla|faithful|overhaul|pack/.test(s)) return 10;
  return 7;
}

export function rpAuto(rps: string[]) {
  const flat = RPRANK.flat();
  const rank = (s: string) => {
    const i = RPRANK.findIndex(g => g.includes(s));
    return i < 0 ? fallbackRank(s) : i;
  };
  const sorted = [...rps].sort((a, b) => {
    const ra = rank(a), rb = rank(b);
    if (ra !== rb) return ra - rb;
    const fa = flat.indexOf(a), fb = flat.indexOf(b);
    if (fa >= 0 && fb >= 0) return fa - fb;
    if (fa >= 0) return -1;
    if (fb >= 0) return 1;
    return a.localeCompare(b);
  });
  const choices = pack.cfg?._auto || {};
  for (const r of AUTO_RULES) {
    if (r.fmt !== "rp-order" || choices[r.id] !== "alt" || !r.alt) continue;
    // Im "alt"-Modus tauschen genau die beiden beteiligten Packs ihre Plätze (nur wenn beide im Pack sind)
    const ia = sorted.indexOf(r.slug), iw = sorted.indexOf(r.alt.slug);
    if (ia < 0 || iw < 0) continue;
    [sorted[ia], sorted[iw]] = [sorted[iw], sorted[ia]];
  }
  // Topologische Abhängigkeiten durchsetzen: Addons/Abhängige (a) MÜSSEN VOR ihren Eltern (dep) stehen
  let changed = true;
  let passes = 0;
  while (changed && passes < 25) {
    changed = false;
    passes++;
    for (const a of sorted) {
      const deps = (pack.implicit(a) || []).concat(pack.data?.files?.[a]?.[5] || []).filter(d => sorted.includes(d));
      const ia = sorted.indexOf(a);
      for (const dep of deps) {
        const idep = sorted.indexOf(dep);
        if (ia > idep) {
          sorted.splice(ia, 1);
          sorted.splice(idep, 0, a);
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }
  return sorted;
}

/** Eigene Reihenfolge behalten; neu gewählte Packs landen nicht unten, sondern direkt über dem Pack, das sie laut Regeln überdecken müssen */
export function rpTopDown(rps: string[]) {
  const auto = rpAuto(rps);
  const out: string[] = (pack.cfg._rpord || []).filter((s: string) => rps.includes(s));
  if (!out.length) return auto;
  for (let i = 0; i < auto.length; i++) {
    const x = auto[i];
    if (out.includes(x)) continue;
    const next = auto.slice(i + 1).find(y => out.includes(y));
    out.splice(next ? out.indexOf(next) : out.length, 0, x);
  }
  return out;
}
