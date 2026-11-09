// Automatische Feinabstimmung bei Teil-Überschneidungen:
// Wenn zwei Mods/Packs/Shader teilweise dasselbe tun oder sich in einer Teilfunktion stören würden,
// bleiben beide im Pack, aber die doppelte bzw. störende Teilfunktion wird in der Config oder Pack-Reihenfolge abgestimmt.
// Der Nutzer kann bei jeder aktiven Regel selbst wählen, welcher Mod den Effekt übernimmt ("std" / "alt") oder ob beide aktiv bleiben ("off").
import { TPL } from "./auto-tpl";
import { SETDEF } from "./const";

export type AutoMode = "std" | "alt" | "off";

export type AutoAlt = {
  slug: string;
  file: string;
  fmt: "toml" | "json" | "json5" | "props" | "shader" | "rpo" | "rp-order";
  changes: [string, any][];
  text: string;
};

export type AutoRule = {
  id: string;
  /** Mod/Pack/Shader, dessen Einstellung im Standardfall angepasst wird */
  slug: string;
  /** Aktiv, sobald mindestens einer dieser Partner ebenfalls im Pack ist */
  when: string[];
  /** Datei unter config/ (oder "shader:photon-shader", "rpo:<slug>" bzw. "options.txt") */
  file: string;
  fmt: "toml" | "json" | "json5" | "props" | "shader" | "rpo" | "rp-order";
  changes: [string, any][];
  text: string;
  /** Optionale Umkehr-Regel, falls der Nutzer lieber `slug` statt `when` für den Teil-Effekt bevorzugen möchte */
  alt?: AutoAlt;
};

export const AUTO_RULES: AutoRule[] = [
  // --- Shader + Mods ---
  {
    id: "photon-ldl",
    slug: "photon-shader",
    when: ["lambdynamiclights"],
    file: "shader:photon-shader",
    fmt: "shader",
    changes: [["HANDHELD_LIGHTING", false]],
    text: "Handlicht in Photon deaktiviert, da LambDynamicLights das Leuchten übernimmt (verhindert doppelte Überblendung)."
  },
  {
    id: "photon-prain",
    slug: "photon-shader",
    when: ["particle-rain"],
    file: "shader:photon-shader",
    fmt: "shader",
    changes: [["DESERT_SANDSTORM", false]],
    text: "Wüsten-Sandsturm in Photon deaktiviert, da Particle Rain eigene Sandstürme erzeugt."
  },
  {
    id: "photon-puddles",
    slug: "photon-shader",
    when: ["puddles-floods"],
    file: "shader:photon-shader",
    fmt: "shader",
    changes: [["RAIN_PUDDLES", false]],
    text: "Shader-Regenpfützen in Photon deaktiviert, da Puddles & Floods echte Pfützen in der Welt bildet."
  },
  {
    id: "betterclouds-shader",
    slug: "better-clouds",
    when: ["photon-shader", "complementary-reimagined", "complementary-unbound", "bsl-shaders", "solas-shader", "bliss-shader"],
    file: "betterclouds-v1.json",
    fmt: "json",
    changes: [["shaderSupport", true], ["irisSupport", true]],
    text: "Shader-Kompatibilität in Better Clouds aktiviert – und falls du den Shader im Spiel per Taste K ausschaltest, hast du sofort trotzdem 3D-Wolken."
  },

  // --- Partikel & Umgebungs-Mods untereinander ---
  {
    id: "visuality-ripples",
    slug: "visuality",
    when: ["particle-rain", "particular-reforged", "subtle-effects"],
    file: "visuality.json",
    fmt: "json",
    changes: [["waterCircles.enabled", false]],
    text: "Regenringe auf Wasser in Visuality deaktiviert, damit deine andere Partikel-Mod sie zeichnet.",
    alt: {
      slug: "particular-reforged",
      file: "particular-common.toml",
      fmt: "toml",
      changes: [["general.enabledEffects.rainRipples", false]],
      text: "Regenringe auf Wasser in Particular deaktiviert, damit Visuality die Wasserringe zeichnet."
    }
  },
  {
    id: "subtle-particular-env",
    slug: "subtle-effects",
    when: ["particular-reforged"],
    file: "subtle_effects/environment.toml",
    fmt: "toml",
    changes: [["waterfalls.waterfallsEnabled", false], ["fireflies.firefliesEnabled", false]],
    text: "Wasserfall-Gischt und Glühwürmchen in Subtle Effects deaktiviert, da Particular sie übernimmt.",
    alt: {
      slug: "particular-reforged",
      file: "particular-common.toml",
      fmt: "toml",
      changes: [["general.enabledEffects.waterfallSpray", false], ["general.enabledEffects.fireflies", false]],
      text: "Wasserfall-Gischt und Glühwürmchen in Particular deaktiviert, damit Subtle Effects sie übernimmt."
    }
  },
  {
    id: "subtle-particular-gen",
    slug: "subtle-effects",
    when: ["particular-reforged"],
    file: "subtle_effects/general.toml",
    fmt: "toml",
    changes: [["poppingBubbles", false], ["dropLandInFluidRipples", false], ["glowingLavaDrops", false]],
    text: "Platzende Blasen, Tropfenringe und Lavatropfen in Subtle Effects deaktiviert, da Particular aktiv ist.",
    alt: {
      slug: "particular-reforged",
      file: "particular-common.toml",
      fmt: "toml",
      changes: [["general.enabledEffects.poppingBubbles", false], ["general.enabledEffects.waterDripRipples", false]],
      text: "Platzende Blasen und Tropfenringe in Particular deaktiviert, damit Subtle Effects sie übernimmt."
    }
  },
  {
    id: "subtle-particular-blk",
    slug: "subtle-effects",
    when: ["particular-reforged"],
    file: "subtle_effects/blocks.toml",
    fmt: "toml",
    changes: [["cakeEatParticles", false], ["openingChestsSpawnsBubbles", false], ["openingBarrelsSpawnsBubbles", false], ["rainWaterRipples", false]],
    text: "Kuchenkrümel, Truhen-Blasen und Regenringe in Subtle Effects deaktiviert, da Particular sie erzeugt.",
    alt: {
      slug: "particular-reforged",
      file: "particular-common.toml",
      fmt: "toml",
      changes: [["general.enabledEffects.cakeEatingParticles", false], ["general.enabledEffects.chestBubbles", false], ["general.enabledEffects.barrelBubbles", false], ["general.enabledEffects.rainRipples", false]],
      text: "Kuchenkrümel, Truhen-Blasen und Regenringe in Particular deaktiviert, damit Subtle Effects sie erzeugt."
    }
  },
  {
    id: "subtle-prain",
    slug: "subtle-effects",
    when: ["particle-rain"],
    file: "subtle_effects/blocks.toml",
    fmt: "toml",
    changes: [["rainWaterRipples", false]],
    text: "Regenringe auf Wasser in Subtle Effects deaktiviert, da Particle Rain aktiv ist."
  },
  {
    id: "particular-prain",
    slug: "particular-reforged",
    when: ["particle-rain"],
    file: "particular-common.toml",
    fmt: "toml",
    changes: [["general.enabledEffects.rainRipples", false]],
    text: "Regenringe auf Wasser in Particular deaktiviert, da Particle Rain aktiv ist."
  },
  {
    id: "particular-leaves",
    slug: "particular-reforged",
    when: ["fallingleaves"],
    file: "particular-common.toml",
    fmt: "toml",
    changes: [["general.enabledEffects.fallingLeaves", false]],
    text: "Fallende Blätter in Particular deaktiviert, da Falling Leaves diese übernimmt."
  },
  {
    id: "subtle-leaves",
    slug: "subtle-effects",
    when: ["fallingleaves"],
    file: "subtle_effects/blocks.toml",
    fmt: "toml",
    changes: [["leavesDecayEffects", false]],
    text: "Laub-Partikel in Subtle Effects reduziert, da Falling Leaves aktiv ist."
  },
  {
    id: "subtle-visuality-ent",
    slug: "subtle-effects",
    when: ["visuality"],
    file: "subtle_effects/entities.toml",
    fmt: "toml",
    changes: [["damageTaken.damagedChickenFeathers", false], ["damageTaken.damagedSkeletonBones", false], ["damageTaken.damagedSkeletonHorseBones", false]],
    text: "Treffer-Federn und -Knochen in Subtle Effects deaktiviert, da Visuality diese erzeugt."
  },
  {
    id: "subtle-visuality-blk",
    slug: "subtle-effects",
    when: ["visuality"],
    file: "subtle_effects/blocks.toml",
    fmt: "toml",
    changes: [["amethystSparkleDisplayType", "OFF"]],
    text: "Amethyst-Funkeln in Subtle Effects deaktiviert, da Visuality Erze und Kristalle glitzern lässt."
  },
  {
    id: "subtle-smoke",
    slug: "subtle-effects",
    when: ["better-smoke"],
    file: "subtle_effects/blocks.toml",
    fmt: "toml",
    changes: [["updatedSmoke.campfireDowseSmoke", false], ["updatedSmoke.fireSmoke", false], ["steam.replaceCampfireFoodSmoke", false]],
    text: "Lagerfeuer- und Feuerrauch in Subtle Effects deaktiviert, damit Better Smoke den Rauch übernimmt."
  },
  {
    id: "subtle-bubbles-gen",
    slug: "subtle-effects",
    when: ["make_bubbles_pop"],
    file: "subtle_effects/general.toml",
    fmt: "toml",
    changes: [["poppingBubbles", false]],
    text: "Platzende Blasen in Subtle Effects deaktiviert, da Make Bubbles Pop aktiv ist."
  },
  {
    id: "subtle-bubbles-blk",
    slug: "subtle-effects",
    when: ["make_bubbles_pop"],
    file: "subtle_effects/blocks.toml",
    fmt: "toml",
    changes: [["openingChestsSpawnsBubbles", false], ["openingBarrelsSpawnsBubbles", false]],
    text: "Truhen- und Fass-Blasen in Subtle Effects deaktiviert, da Make Bubbles Pop aktiv ist.",
    alt: {
      slug: "make_bubbles_pop",
      file: "make_bubbles_pop.json",
      fmt: "json",
      changes: [["CHEST_BUBBLES_ENABLED", false], ["BARREL_BUBBLES_ENABLED", false]],
      text: "Truhen-Blasen in Make Bubbles Pop deaktiviert, damit Subtle Effects sie übernimmt."
    }
  },
  {
    id: "particular-bubbles",
    slug: "particular-reforged",
    when: ["make_bubbles_pop"],
    file: "particular-common.toml",
    fmt: "toml",
    changes: [["general.enabledEffects.poppingBubbles", false], ["general.enabledEffects.chestBubbles", false], ["general.enabledEffects.barrelBubbles", false]],
    text: "Platzende Blasen und Truhen-Blasen in Particular deaktiviert, da Make Bubbles Pop aktiv ist.",
    alt: {
      slug: "make_bubbles_pop",
      file: "make_bubbles_pop.json",
      fmt: "json",
      changes: [["CHEST_BUBBLES_ENABLED", false], ["BARREL_BUBBLES_ENABLED", false]],
      text: "Truhen-Blasen in Make Bubbles Pop deaktiviert, damit Particular sie übernimmt."
    }
  },
  {
    id: "subtle-explosive",
    slug: "subtle-effects",
    when: ["explosive-enhancement"],
    file: "subtle_effects/entities.toml",
    fmt: "toml",
    changes: [["explosives.tntUpdateSmoke", false], ["explosives.tntFlamesDensity", 0], ["explosives.tntSparks", false], ["explosives.creeperSmoke", "DEFAULT"], ["explosives.creeperSparks", false]],
    text: "TNT- und Creeper-Rauch in Subtle Effects deaktiviert, damit Explosive Enhancement die Explosion allein rendert."
  },
  {
    id: "bubbles-explosive",
    slug: "make_bubbles_pop",
    when: ["explosive-enhancement"],
    file: "make_bubbles_pop.json",
    fmt: "json",
    changes: [["EXPLOSION_BUBBLES_ENABLED", false]],
    text: "Unterwasser-Explosionsblasen in Make Bubbles Pop deaktiviert, da Explosive Enhancement eigene Unterwasser-Explosionen zeigt."
  },
  {
    id: "effectual-particular",
    slug: "effectual",
    when: ["particular-reforged"],
    file: "effectual.json",
    fmt: "json",
    changes: [["caveDust", false], ["bubbleChests", false], ["bubblePots", false]],
    text: "Höhlenstaub und Truhen-Blasen in Effectual deaktiviert, da Particular diese übernimmt.",
    alt: {
      slug: "particular-reforged",
      file: "particular-common.toml",
      fmt: "toml",
      changes: [["general.enabledEffects.caveDust", false], ["general.enabledEffects.chestBubbles", false], ["general.enabledEffects.barrelBubbles", false]],
      text: "Höhlenstaub und Truhen-Blasen in Particular deaktiviert, damit Effectual sie übernimmt."
    }
  },
  {
    id: "effectual-subtle",
    slug: "effectual",
    when: ["subtle-effects"],
    file: "effectual.json",
    fmt: "json",
    changes: [["mouthSteam", false], ["runDust", false], ["bubbleChests", false], ["bubblePots", false]],
    text: "Atemdampf, Laufstaub und Truhen-Blasen in Effectual deaktiviert, da Subtle Effects diese übernimmt.",
    alt: {
      slug: "subtle-effects",
      file: "subtle_effects/blocks.toml",
      fmt: "toml",
      changes: [["openingChestsSpawnsBubbles", false], ["openingBarrelsSpawnsBubbles", false]],
      text: "Truhen-Blasen in Subtle Effects deaktiviert, damit Effectual diese Effekte übernimmt."
    }
  },
  {
    id: "effectual-bubbles",
    slug: "effectual",
    when: ["make_bubbles_pop"],
    file: "effectual.json",
    fmt: "json",
    changes: [["bubbleChests", false], ["bubblePots", false]],
    text: "Truhen-Blasen in Effectual deaktiviert, da Make Bubbles Pop aktiv ist.",
    alt: {
      slug: "make_bubbles_pop",
      file: "make_bubbles_pop.json",
      fmt: "json",
      changes: [["CHEST_BUBBLES_ENABLED", false], ["BARREL_BUBBLES_ENABLED", false]],
      text: "Truhen-Blasen in Make Bubbles Pop deaktiviert, damit Effectual sie übernimmt."
    }
  },
  {
    id: "effectual-footprints",
    slug: "effectual",
    when: ["footprintparticle", "snow-imprints"],
    file: "effectual.json",
    fmt: "json",
    changes: [["snowFootprints", false]],
    text: "Schnee-Fußspuren in Effectual deaktiviert, damit keine doppelten Fußspuren entstehen."
  },
  {
    id: "effectual-smoke",
    slug: "effectual",
    when: ["better-smoke"],
    file: "effectual.json",
    fmt: "json",
    changes: [["campfireImprovements", false]],
    text: "Lagerfeuer-Rauch in Effectual deaktiviert, da Better Smoke aktiv ist."
  },
  {
    id: "effectual-drip",
    slug: "effectual",
    when: ["dripsounds"],
    file: "effectual.json",
    fmt: "json",
    changes: [["waterDrip", false]],
    text: "Wassertropfen-Effekt in Effectual deaktiviert, da Drip Sounds aktiv ist."
  },

  // --- Wilder Wild Teil-Überschneidungen ---
  {
    id: "wilder-bubbles",
    slug: "wilder-wild",
    when: ["particular-reforged", "subtle-effects", "make_bubbles_pop"],
    file: "wilderwild/block.json5",
    fmt: "json5",
    changes: [["chestBubbling", false]],
    text: "Unterwasser-Truhenblasen in Wilder Wild deaktiviert, da deine Partikel-Mod das schon übernimmt."
  },
  {
    id: "wilder-pollen",
    slug: "wilder-wild",
    when: ["subtle-effects"],
    file: "wilderwild/block.json5",
    fmt: "json5",
    changes: [["pollenParticles", false]],
    text: "Pollen-Partikel in Wilder Wild deaktiviert, da Subtle Effects eigene Blütenpollen erzeugt."
  },
  {
    id: "wilder-wind",
    slug: "wilder-wild",
    when: ["windy", "immersive-storms"],
    file: "wilderwild/misc.json5",
    fmt: "json5",
    changes: [["windParticles", false]],
    text: "Wind-Partikel in Wilder Wild deaktiviert, damit sie nicht mit deiner Wind-/Sturm-Mod doppelt laufen."
  },
  {
    id: "wilder-snow",
    slug: "wilder-wild",
    when: ["snow", "snow-under-trees"],
    file: "wilderwild/worldgen.json5",
    fmt: "json5",
    changes: [["snowBelowTrees", false]],
    text: "Schnee unter Bäumen in Wilder Wild deaktiviert, da deine Schnee-Mod dies übernimmt."
  },

  // --- Gameplay, Türen, Kamera, Spieler-Animationen & HUD ---
  {
    id: "fpm-punchy-hands",
    slug: "first-person-model",
    when: ["punchy-fpa", "interactivestuff"],
    file: "firstperson.json",
    fmt: "json",
    changes: [["autoVanillaHands", true], ["vanillaHandsMode", "ALL_ITEMS"], ["dynamicMode", true]],
    text: "Dynamischer Hand-Modus in First-Person Model aktiviert: Beim Runterschauen siehst du Körper & Beine, beim Halten von Items deine animierten Ego-Hände (und per F6 kannst du jederzeit umschalten)."
  },
  {
    id: "peek-shulker",
    slug: "peek",
    when: ["shulkerboxtooltip", "easy-shulker-boxes"],
    file: "peek.json",
    fmt: "json",
    changes: [["showShulkerBoxItemHint", false], ["showShulkerBoxBlockHint", false]],
    text: "Shulkerkisten-Tooltip in Peek deaktiviert, damit Peek weiterhin Bienenstöcke, Karten, Endertruhen & Kompass zeigt, während deine Shulker-Mod die Shulkerkisten übernimmt.",
    alt: {
      slug: "easy-shulker-boxes",
      file: "easyshulkerboxes-client.toml",
      fmt: "toml",
      changes: [["tooltip.extra_tooltip_contents", "NONE"]],
      text: "Shulkerkisten-Tooltip in Easy Shulker Boxes deaktiviert, damit Peek die Shulker-Vorschau übernimmt."
    }
  },
  {
    id: "easyshulker-tooltip",
    slug: "easy-shulker-boxes",
    when: ["shulkerboxtooltip"],
    file: "easyshulkerboxes-client.toml",
    fmt: "toml",
    changes: [["tooltip.extra_tooltip_contents", "NONE"]],
    text: "Eigenen Tooltip in Easy Shulker Boxes ausgeblendet: Easy Shulker Boxes regelt das Ein-/Auspacken per Rechtsklick im Inventar, Shulker Box Tooltip zeichnet die Vorschau."
  },
  {
    id: "coolrain-gentler",
    slug: "coolrain",
    when: ["gentler-weather-sounds"],
    file: "coolrain.json",
    fmt: "json",
    changes: [["rainVolume", 0.65]],
    text: "Lautstärke in Cool Rain harmonisiert: Cool Rain liefert die Aufprallgeräusche auf Blech, Glas, Holz & Laub, während Gentler Weather Sounds den Grundregen und Donner sanfter macht."
  },
  {
    id: "betterdays-sleepwarp",
    slug: "betterdays",
    when: ["sleep-warp-updated"],
    file: "betterdays.json",
    fmt: "json",
    changes: [["enableSleepFeature", false]],
    text: "Schlaf-Vorspulen in Better Days deaktiviert, damit Better Days die Tag-/Nachtlänge steuert und SleepWarp das Vorspulen der Nacht allein übernimmt."
  },
  {
    id: "rrls-smoothload",
    slug: "rrls",
    when: ["smooth-loading-screen"],
    file: "rrls.toml",
    fmt: "toml",
    changes: [["fadeOut", true]],
    text: "Weiches Ausblenden in Remove Reloading Screen aktiviert: Smooth Loading Screen animiert den Spielstart, RRLS lädt Resource Packs im laufenden Spiel im Hintergrund."
  },
  {
    id: "fastframes-invis",
    slug: "fast-item-frames",
    when: ["invisible-frames-mod"],
    file: "fastitemframes-server.toml",
    fmt: "toml",
    changes: [["general.glass_pane_invisibility", false]],
    text: "Glasscheiben-Rezept in Fast Item Frames deaktiviert: Fast Item Frames liefert mehr FPS und färbbare Rahmen, Invisible Frames das Unsichtbarmachen per Schleichen+Rechtsklick."
  },
  {
    id: "stylisheffects-vanilla",
    slug: "stylish-effects",
    when: ["status-effect-bars", "statuseffecttimer"],
    file: "stylisheffects-client.toml",
    fmt: "toml",
    changes: [["renderers.gui.respect_vanilla_widgets", true]],
    text: "Kompatibilitätsmodus in Stylish Effects aktiviert, damit sich die Effekt-Anzeigen nicht überlagern."
  },
  {
    id: "doors-double",
    slug: "animated-doors",
    when: ["double-doors"],
    file: "animated_doors.properties",
    fmt: "props",
    changes: [["connectedDoorsEnabled", false], ["connectedFenceGatesEnabled", false], ["connectedTrapdoorsEnabled", false]],
    text: "Doppeltür-Automatik in Animated Doors deaktiviert, damit Double Doors die Tür nicht sofort wieder zuschlägt (verhindert Tür-Bug)."
  },
  {
    id: "carryon-arms",
    slug: "carry-on",
    when: ["punchy-fpa", "punchymoves", "fa-player-extension", "first-person-model", "not-enough-animations", "cubic-player-animator"],
    file: "carryon-client.json",
    fmt: "json",
    changes: [["renderArms", false]],
    text: "Starre Trage-Arme in Carry On deaktiviert, damit sie nicht fehlerhaft durch deine Spieler-Animationen ragen."
  },
  {
    id: "fa-player-ego",
    slug: "fa-player-extension",
    when: ["punchy-fpa", "interactivestuff"],
    file: "entity_model_features.json",
    fmt: "json",
    changes: [["preventFirstPersonHandAnimating", true]],
    text: "Ego-Hand-Animation in Entity Model Features blockiert, damit FA Player Extension (Third Person) nicht deine Ego-Animationen überschreibt."
  },
  {
    id: "cam-shake",
    slug: "cameraoverhaul",
    when: ["betterhurtcam", "perception", "enhancedvisuals"],
    file: "cameraoverhaul.toml",
    fmt: "toml",
    changes: [["general.screenShakesMaxIntensity", 0.0]],
    text: "Bildschirm-Wackeln in Camera Overhaul deaktiviert, damit es sich nicht mit deiner Treffer-/Kamerawackel-Mod verdoppelt."
  },
  {
    id: "cam-thirdperson",
    slug: "cameraoverhaul",
    when: ["punchymoves"],
    file: "cameraoverhaul.toml",
    fmt: "toml",
    changes: [["general.enableInThirdPerson", false]],
    text: "Camera Overhaul auf die Ego-Sicht beschränkt, damit es in Third Person nicht gegen Punchy! Moves arbeitet."
  },
  {
    id: "armorhud-mount",
    slug: "simple-armor-hud",
    when: ["better-mount-hud", "leave-my-bars-alone"],
    file: "armorhud.properties",
    fmt: "props",
    changes: [["better_mount_hud", false]],
    text: "Reit-HUD in Simple Armor Hud deaktiviert, da deine Reit-HUD-Mod das übernimmt."
  },
  {
    id: "horseman-mount",
    slug: "horseman",
    when: ["better-mount-hud", "leave-my-bars-alone", "simple-armor-hud"],
    file: "horseman-client.toml",
    fmt: "toml",
    changes: [["improved_mount_gui", false]],
    text: "Reit-Leisten-Umbau in Horseman deaktiviert, damit er nicht mit deiner Reit-HUD-Mod kollidiert.",
    alt: {
      slug: "simple-armor-hud",
      file: "armorhud.properties",
      fmt: "props",
      changes: [["better_mount_hud", false]],
      text: "Reit-HUD in Simple Armor Hud deaktiviert, damit Horseman die Reit-Leiste übernimmt."
    }
  },
  {
    id: "horseman-icy",
    slug: "horseman",
    when: ["icys-better-horses"],
    file: "horseman-client.toml",
    fmt: "toml",
    changes: [["switch_inventory.enabled", false]],
    text: "Inventar-Umschalter in Horseman angepasst, damit Icy's Better Horses für Bindung, Zucht & Ausrüstung und Horseman für ruhigeres Reiten, Schwimmen & Anbinden zusammenarbeiten."
  },
  {
    id: "detailarmor-hearts",
    slug: "detail-armor-bar-reconstructed",
    when: ["overflowing-bars"],
    file: "detailarmorbar.json",
    fmt: "json",
    changes: [["toggleCompatibleHeartMod", true]],
    text: "Kompatibilitätsmodus für gestapelte Herzen (Overflowing Bars) in Detail Armor Bar aktiviert."
  },
  {
    id: "plaques-jade",
    slug: "advancement-plaques",
    when: ["jade"],
    file: "advancementplaques.toml",
    fmt: "toml",
    changes: [["client.visual_options.hide_waila", true]],
    text: "Jade-Anzeige wird automatisch kurz ausgeblendet, während ein Fortschritts-Banner oben eingeblendet wird."
  },
  {
    id: "subtle-itemborders",
    slug: "subtle-effects",
    when: ["item-borders"],
    file: "subtle_effects/items.toml",
    fmt: "toml",
    changes: [["itemRarity.useItemBorder", false]],
    text: "Item-Rahmen in Subtle Effects deaktiviert, damit Item Borders sie allein zeichnet."
  },
  {
    id: "itemborders-legendary",
    slug: "item-borders",
    when: ["legendary-tooltips"],
    file: "itemborders.toml",
    fmt: "toml",
    changes: [["client.options.legendary_tooltips_sync", true]],
    text: "Farbsynchronisation zwischen Item Borders und Legendary Tooltips automatisch aktiviert."
  },
  {
    id: "immhotbar-helditem",
    slug: "immersive-hotbar",
    when: ["held-item-info"],
    file: "immersive-hotbar.json5",
    fmt: "json5",
    changes: [["immersiveToolTip", false]],
    text: "Aufplopp-Animation des Item-Namens in Immersive Hotbar deaktiviert, damit die Zusatzzeilen von Held Item Info nicht abgeschnitten werden."
  },
  {
    id: "smoothgui-hotbar",
    slug: "smooth-gui",
    when: ["immersive-hotbar"],
    file: "smoothgui.json",
    fmt: "json",
    changes: [["smoothHotbar", false]],
    text: "Hotbar-Animation in Smooth GUI deaktiviert, da Immersive Hotbar die Hotbar animiert.",
    alt: {
      slug: "immersive-hotbar",
      file: "immersive-hotbar.json5",
      fmt: "json5",
      changes: [["hotbarItemAnimationsEnabled", false], ["selectorScaleEnabled", false]],
      text: "Hotbar-Animation in Immersive Hotbar deaktiviert, damit Smooth GUI die Hotbar animiert."
    }
  },
  {
    id: "immui-hotbar",
    slug: "immersive-ui",
    when: ["immersive-hotbar"],
    file: "immersiveui-common.json5",
    fmt: "json5",
    changes: [["enableHotbarSelectorAnimation", false]],
    text: "Hotbar-Auswahlrahmen-Animation in Immersive UI deaktiviert, da Immersive Hotbar aktiv ist."
  },
  {
    id: "immui-slothighlight",
    slug: "immersive-ui",
    when: ["clearer-slot-highlight"],
    file: "immersiveui-common.json5",
    fmt: "json5",
    changes: [["disableVanillaSlotHighlighting", false]],
    text: "Slot-Hervorhebung in Immersive UI freigegeben, damit Clearer Slot Highlight sichtbar bleibt."
  },
  {
    id: "immui-rarity",
    slug: "immersive-ui",
    when: ["item-borders", "subtle-effects"],
    file: "immersiveui-common.json5",
    fmt: "json5",
    changes: [["enableRarityParticles", false]],
    text: "Seltenheits-Partikel im Inventar in Immersive UI deaktiviert, um doppelte Effekte im Slot zu vermeiden."
  },

  // --- Resource Packs mit automatischer Schicht-Reihenfolge in options.txt ---
  {
    id: "rp-fa-creepers",
    slug: "fresh-animations-extensions",
    when: ["als-creepers-revamped"],
    file: "options.txt",
    fmt: "rp-order",
    changes: [],
    text: "AL's Creepers Revamped wird in options.txt über FA+All Extensions geladen: AL's übernimmt die Creeper, FA+All Extensions alle übrigen Mobs.",
    alt: {
      slug: "als-creepers-revamped",
      file: "options.txt",
      fmt: "rp-order",
      changes: [],
      text: "FA+All Extensions wird in options.txt über AL's Creepers Revamped geladen."
    }
  },
  {
    id: "rp-3d-tools",
    slug: "tools-and-utils",
    when: ["3d-default", "actually-3d-stuff"],
    file: "options.txt",
    fmt: "rp-order",
    changes: [],
    text: "Weskerson's 3D Items wird in options.txt über dein allgemeines 3D-Pack gelegt, damit Werkzeuge im Inventar flach bleiben und in der Hand 3D sind.",
    alt: {
      slug: "3d-default",
      file: "options.txt",
      fmt: "rp-order",
      changes: [],
      text: "Dein allgemeines 3D-Pack wird in options.txt über Weskerson's 3D Items gelegt."
    }
  },
  {
    id: "rp-trims-order",
    slug: "emissive-trims",
    when: ["visual-armor-trims"],
    file: "options.txt",
    fmt: "rp-order",
    changes: [],
    text: "Emissive Trims liegt in options.txt über Visual Armor Trims: Im Inventar siehst du die Besatz-Muster als Icons, am Körper leuchten sie im Dunkeln.",
    alt: {
      slug: "visual-armor-trims",
      file: "options.txt",
      fmt: "rp-order",
      changes: [],
      text: "Visual Armor Trims liegt in options.txt über Emissive Trims."
    }
  },
  {
    id: "rp-food-eat",
    slug: "fresh-food",
    when: ["theones-eating-animation-pack"],
    file: "options.txt",
    fmt: "rp-order",
    changes: [],
    text: "TheOne's Eating Animation liegt über Fresh Food: Abbeißen-Animation beim Essen, 3D-Modelle bei den übrigen Lebensmitteln.",
    alt: {
      slug: "theones-eating-animation-pack",
      file: "options.txt",
      fmt: "rp-order",
      changes: [],
      text: "Fresh Food liegt in options.txt über TheOne's Eating Animation (3D-Essensmodelle haben Vorrang)."
    }
  },

  // --- Resource Packs mit Respackopts (.rpo) ---
  {
    id: "rpo-connected-paths-grass",
    slug: "connected-paths",
    when: ["lambdabettergrass", "bettergrassify", "fast-better-grass"],
    file: "rpo:connected-paths",
    fmt: "rpo",
    changes: [
      ["minecraft.grass_block_side", false],
      ["minecraft.grass_block_side_overlay", false],
      ["minecraft.grass_block_snow", false],
      ["minecraft.fake_grass_snow", false]
    ],
    text: "Grasblock-Seiten in Connected Paths deaktiviert, damit dein Better-Grass-Mod die Graskanten nahtlos verbindet."
  },
  {
    id: "rpo-xali-leaves",
    slug: "xalis-enhanced-vanilla",
    when: ["better-leaves", "fancyfast-bushy-leaves", "cubic-leaves", "rainbows-foliage"],
    file: "rpo:xalis-enhanced-vanilla",
    fmt: "rpo",
    changes: [["bushyLeaves", false]],
    text: "Buschige Blätter in xali's Enhanced Vanilla deaktiviert, damit dein gewähltes Blätter-Pack übernimmt."
  },
  {
    id: "rpo-nautilus-leaves",
    slug: "nautilus3d",
    when: ["better-leaves", "fancyfast-bushy-leaves", "cubic-leaves", "rainbows-foliage"],
    file: "rpo:nautilus3d",
    fmt: "rpo",
    changes: [
      ["Leaves.OakLeaves", false], ["Leaves.SpruceLeaves", false], ["Leaves.BirchLeaves", false],
      ["Leaves.JungleLeaves", false], ["Leaves.AcaciaLeaves", false], ["Leaves.DarkOakLeaves", false],
      ["Leaves.MangroveLeaves", false], ["Leaves.CherryLeaves", false], ["Leaves.PaleOakLeaves", false],
      ["Leaves.AzaleaLeaves", false], ["Leaves.FloweringAzaleaLeaves", false]
    ],
    text: "3D-Blätter in Nautilus3D deaktiviert, damit dein gewähltes Blätter-Pack übernimmt."
  },
  {
    id: "rpo-nautilus-crops",
    slug: "nautilus3d",
    when: ["3d-crops", "fancy-crops"],
    file: "rpo:nautilus3d",
    fmt: "rpo",
    changes: [["Vegetation.Wheat", false], ["Vegetation.Potatoes", false], ["Vegetation.Carrots", false], ["Vegetation.Beetroots", false]],
    text: "3D-Feldfrüchte in Nautilus3D deaktiviert, da dein eigenes 3D-Feldfrüchte-Pack aktiv ist."
  },
  {
    id: "rpo-nautilus-ladders",
    slug: "nautilus3d",
    when: ["3d-ladders", "rays-3d-ladders"],
    file: "rpo:nautilus3d",
    fmt: "rpo",
    changes: [["Misc.Ladder", false]],
    text: "3D-Leiter in Nautilus3D deaktiviert, da dein eigenes 3D-Leitern-Pack aktiv ist."
  },
  {
    id: "rpo-nautilus-rails",
    slug: "nautilus3d",
    when: ["rays-3d-rails"],
    file: "rpo:nautilus3d",
    fmt: "rpo",
    changes: [["Misc.Rails", false]],
    text: "3D-Schienen in Nautilus3D deaktiviert, da Ray's 3D Rails aktiv ist."
  },
  {
    id: "rpo-nautilus-torches",
    slug: "nautilus3d",
    when: ["torches-reimagined", "weskersons-torches"],
    file: "rpo:nautilus3d",
    fmt: "rpo",
    changes: [["Misc.Torch", false]],
    text: "3D-Fackel in Nautilus3D deaktiviert, da dein eigenes 3D-Fackel-Pack aktiv ist."
  },
  {
    id: "rpo-nautilus-lanterns",
    slug: "nautilus3d",
    when: ["better-lanterns", "luminous-lanterns", "drigo-3d-lanterns-x-punchy"],
    file: "rpo:nautilus3d",
    fmt: "rpo",
    changes: [["Misc.Lantern", false]],
    text: "3D-Laterne in Nautilus3D deaktiviert, da dein eigenes 3D-Laternen-Pack aktiv ist."
  },
  {
    id: "rpo-vexp-crops",
    slug: "vanilla-exp",
    when: ["3d-crops", "fancy-crops"],
    file: "rpo:vanilla-exp",
    fmt: "rpo",
    changes: [["Vegetation.floweringPotatoCrops", false], ["Vegetation.floweringBeetrootCrops", false], ["Vegetation.tallWheatCrops", false]],
    text: "Feldfrüchte-Varianten in Vanilla Experience+ deaktiviert, damit dein 3D-Feldfrüchte-Pack fehlerfrei greift."
  },
  {
    id: "rpo-vexp-buckets",
    slug: "vanilla-exp",
    when: ["fresh-buckets", "refined-buckets", "findreks-3d-buckets-and-fish"],
    file: "rpo:vanilla-exp",
    fmt: "rpo",
    changes: [["Items.animatedBuckets", false], ["Items.animatedFish", false]],
    text: "Eimer-Animationen in Vanilla Experience+ deaktiviert, da dein 3D-Eimer-Pack aktiv ist."
  },
  {
    id: "rpo-vexp-crosshair",
    slug: "vanilla-exp",
    when: ["crosshair-indicator", "animated-crosshair", "clean-crosshair", "dot-crosshair", "adaptive-crosshair"],
    file: "rpo:vanilla-exp",
    fmt: "rpo",
    changes: [["HUD.crosshair", false]],
    text: "Fadenkreuz in Vanilla Experience+ deaktiviert, damit dein gewähltes Fadenkreuz sichtbar bleibt."
  }
];

export type ActiveAuto = {
  id: string;
  slug: string;
  partners: string[];
  file: string;
  text: string;
  mode: AutoMode;
  hasAlt: boolean;
  canOff: boolean;
};

export type SlugAutoRule = {
  id: string;
  slug: string;
  others: string[];
  text: string;
  active: boolean;
  mode: AutoMode;
  hasAlt: boolean;
  canOff: boolean;
};

function ruleStatus(r: AutoRule, mods: Set<string>, choices: Record<string, AutoMode> = {}) {
  const mode: AutoMode = choices[r.id] || "std";
  const hasAlt = !!(r.alt && mods.has(r.alt.slug));
  const canOff = r.fmt !== "rp-order";
  const effMode: AutoMode = mode === "alt" && !hasAlt ? "std" : mode === "off" && !canOff ? "std" : mode;
  const text = effMode === "alt" && r.alt ? r.alt.text : effMode === "off" ? "Beide Teil-Effekte bleiben aktiv (automatische Abschaltung auf Wunsch deaktiviert)." : r.text;
  const file = effMode === "alt" && r.alt ? r.alt.file : r.file;
  return { mode: effMode, hasAlt, canOff, text, file };
}

/** Alle aktuell im Pack greifenden automatischen Feinabstimmungen */
export function activeAutos(mods: Set<string>, choices: Record<string, AutoMode> = {}): ActiveAuto[] {
  const out: ActiveAuto[] = [];
  for (const r of AUTO_RULES) {
    if (!mods.has(r.slug)) continue;
    const partners = r.when.filter(w => mods.has(w));
    if (!partners.length) continue;
    const st = ruleStatus(r, mods, choices);
    out.push({ id: r.id, slug: r.slug, partners, file: st.file, text: st.text, mode: st.mode, hasAlt: st.hasAlt, canOff: st.canOff });
  }
  return out;
}

/** Alle Regeln, an denen ein bestimmter Eintrag (als Ziel oder Auslöser) beteiligt ist */
export function rulesForSlug(slug: string, mods: Set<string>, choices: Record<string, AutoMode> = {}): SlugAutoRule[] {
  return AUTO_RULES.filter(r => r.slug === slug || r.when.includes(slug)).map(r => {
    const activePartners = r.when.filter(w => mods.has(w));
    const active = mods.has(r.slug) && activePartners.length > 0;
    const others = r.slug === slug ? r.when : [r.slug];
    const st = ruleStatus(r, mods, choices);
    return { id: r.id, slug: r.slug, others, text: st.text, active, mode: st.mode, hasAlt: st.hasAlt, canOff: st.canOff };
  });
}

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function fmtVal(v: any, fmt: string, orig = ""): string {
  if (typeof v === "boolean") return String(v);
  if (typeof v === "number") {
    const s = String(v);
    return /^-?\d+\.\d+/.test(orig.trim()) && !s.includes(".") ? s + ".0" : s;
  }
  return fmt === "props" ? String(v) : JSON.stringify(String(v));
}

function patchText(t: string, fmt: "toml" | "props" | "json5", k: string, val: any): string {
  if (fmt === "toml") {
    const parts = k.split(".");
    const key = parts.pop()!;
    let a = 0, b = t.length;
    if (parts.length) {
      const m = t.match(new RegExp("^\\s*\\[" + escRe(parts.join(".")) + "\\]\\s*$", "m"));
      if (!m || m.index === undefined) return t;
      a = m.index + m[0].length;
      const next = t.slice(a).search(/^\s*\[/m);
      if (next >= 0) b = a + next;
    } else {
      const firstSec = t.search(/^\s*\[/m);
      if (firstSec >= 0) b = firstSec;
    }
    const seg = t.slice(a, b).replace(
      new RegExp('^(\\s*"?' + escRe(key) + '"?\\s*=\\s*)([^\\r\\n]*)', "m"),
      (_m0, g1, g2) => g1 + fmtVal(val, fmt, g2)
    );
    return t.slice(0, a) + seg + t.slice(b);
  }
  if (fmt === "props") {
    return t.replace(
      new RegExp("^(\\s*" + escRe(k) + "\\s*[=:]\\s*)([^\\r\\n]*)", "m"),
      (_m0, g1, g2) => g1 + fmtVal(val, fmt, g2)
    );
  }
  // json5
  const leaf = k.split(".").pop()!;
  return t.replace(
    new RegExp('^(\\s*"?' + escRe(leaf) + '"?\\s*:\\s*)([^,\\r\\n]+)(,?.*)$', "m"),
    (_m0, g1, g2, g3) => g1 + fmtVal(val, fmt, g2) + g3
  );
}

function setDeep(obj: any, path: string, val: any) {
  const parts = path.split(".");
  let cur = obj;
  while (parts.length > 1) {
    const p = parts.shift()!;
    if (typeof cur[p] !== "object" || cur[p] === null) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[0]] = val;
}

/** Erzeugt die automatisch abgestimmten Config-, Shader- und .rpo-Dateien für den Export */
export function buildAutoConfigFiles(
  mods: Set<string>,
  rpoData: Record<string, { fn: string; data: any }>,
  fname: (s: string) => string,
  cv: (slug: string, k: string) => any,
  choices: Record<string, AutoMode> = {}
): Record<string, string> {
  const out: Record<string, string> = {};
  const byFile = new Map<string, { fmt: AutoRule["fmt"]; slug: string; changes: [string, any][] }>();

  for (const r of AUTO_RULES) {
    if (!mods.has(r.slug)) continue;
    if (!r.when.some(w => mods.has(w))) continue;
    const st = ruleStatus(r, mods, choices);
    if (st.mode === "off") continue;
    const target = st.mode === "alt" && r.alt ? r.alt : r;
    if (target.fmt === "rp-order") continue;
    let entry = byFile.get(target.file);
    if (!entry) {
      entry = { fmt: target.fmt, slug: target.slug, changes: [] };
      byFile.set(target.file, entry);
    }
    entry.changes.push(...target.changes);
  }

  for (const [file, { fmt, slug, changes }] of byFile.entries()) {
    if (fmt === "shader") {
      if (slug !== "photon-shader") continue;
      const fn = fname("photon-shader");
      if (!fn) continue;
      const items = (SETDEF as any)["photon-shader"]?.items || [];
      const map = new Map<string, string>();
      for (const i of items) {
        const v = cv("photon-shader", i.k);
        map.set(i.k, String(i.f ? i.f(Number(v)) : v));
      }
      for (const [k, v] of changes) map.set(k, String(v));
      out["shaderpacks/" + fn + ".txt"] = [...map.entries()].map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
      continue;
    }
    if (fmt === "rpo") {
      const rpo = rpoData[slug];
      const fn = fname(slug) || rpo?.fn;
      if (!rpo || !fn) continue;
      const d = JSON.parse(JSON.stringify(rpo.data));
      for (const [k, v] of changes) setDeep(d, k, v);
      out["resourcepacks/" + fn + ".rpo"] = JSON.stringify(d, null, 2) + "\n";
      continue;
    }
    const raw = (TPL as Record<string, string>)[file];
    if (!raw) continue;
    if (fmt === "json") {
      const o = JSON.parse(raw);
      for (const [k, v] of changes) setDeep(o, k, v);
      out["config/" + file] = JSON.stringify(o, null, 2) + "\n";
    } else if (fmt === "toml" || fmt === "props" || fmt === "json5") {
      let txt = raw;
      for (const [k, v] of changes) txt = patchText(txt, fmt, k, v);
      out["config/" + file] = txt;
    }
  }
  return out;
}
