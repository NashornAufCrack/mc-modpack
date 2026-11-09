// Resource-Pack-Reihenfolge (oben = höchste Priorität)
import { pack } from "./pack.svelte";
import { AUTO_RULES } from "./auto-cfg";
export const RPRANK: string[][] = [["fresh-flower-pots","fresh-skeleton-physics","als-creepers-revamped"],["fresh-animations-extensions","fa-player-extension","just-expressions","detailed-animations","als-piglins-revamped-x-fresh-animations","als-zombies-revamped-x-fresh-animations","als-enderman-revamped-x-fresh-animations","als-skeletons-revamped-x-fresh-animations","assorted-allays-x-fresh-animations","bare-bones-x-fresh-animations"],["fresh-animations"],["fresh-food-for-hyper-punchy","hyper-punchy","fluid-foolish","theones-eating-animation-pack"],["fresh-food","fresh-flowers-and-plants","fresh-ores-and-ingots","fresh-buckets","fresh-music-discs","just-3d-potions","glowing-3d-totem","refined-buckets","findreks-3d-buckets-and-fish","fyoncles-3d-trims","glowing-3d-armor","3d-flint-steel-for-punchy","animated-3d-wind-charge-compatible-with-punchy","luminous-lanterns","drigo-3d-lanterns-x-punchy","tools-and-utils","bray-cyber-3d-enchanted-books","nautilus3d","animated-doors","spooky-doors","swinging-lanterns"],["fwa","better-lanterns","torches-reimagined","weskersons-torches","rays-3d-rails","3d-ladders","rays-3d-ladders","3d-crops","fancy-crops","3d-bamboo-shoots","fancy-beds","os-colorful-grasses","connected-paths","fast-better-grass","better-leaves","fancyfast-bushy-leaves","cubic-leaves","rainbows-foliage","3d-default","actually-3d-stuff","animated-items","xk-redstone-display","excalibur-lootr-support","emissive-trims"],["even-better-enchants","beautiful-enchanted-books","enchanted-books-re-covered","visual-armor-trims","glowing-glints","new-glowing-ores","low-on-fire","low-shield-pack","blinking-ender-eyes","dramatic-skys","sunbathing-godrays","visual-effects-plus"],["icons","recolourful-containers-gui","clearer-slot-highlight","shrimps-immersive-interfaces","default-dark-mode"],["vvi","enhanced-audio","gentler-weather-sounds"],["vanilla-exp","xalis-enhanced-vanilla","faithful-32x","faithful-64x"]];
export function rpAuto(rps: string[]) {
  const flat = RPRANK.flat();
  const rank = (s: string) => { const i = RPRANK.findIndex(g => g.includes(s)); return i < 0 ? 6 : i; };
  const sorted = [...rps].sort((a, b) => rank(a) - rank(b) || flat.indexOf(a) - flat.indexOf(b));
  const choices = pack.cfg?._auto || {};
  for (const r of AUTO_RULES) {
    if (r.fmt !== "rp-order" || choices[r.id] !== "alt" || !r.alt) continue;
    // Im "alt"-Modus tauschen genau die beiden beteiligten Packs ihre Plätze (nur wenn beide im Pack sind)
    const ia = sorted.indexOf(r.slug), iw = sorted.indexOf(r.alt.slug);
    if (ia < 0 || iw < 0) continue;
    [sorted[ia], sorted[iw]] = [sorted[iw], sorted[ia]];
  }
  return sorted;
}
/** Eigene Reihenfolge behalten; neu gewählte Packs landen nicht unten, sondern direkt über dem Pack, das sie laut Regeln überdecken müssen */
export function rpTopDown(rps: string[]) {
  const auto = rpAuto(rps); const out: string[] = (pack.cfg._rpord || []).filter((s: string) => rps.includes(s)); if (!out.length) return auto;
  for (let i = 0; i < auto.length; i++) { const x = auto[i]; if (out.includes(x)) continue; const next = auto.slice(i + 1).find(y => out.includes(y)); out.splice(next ? out.indexOf(next) : out.length, 0, x); }
  return out;
}
