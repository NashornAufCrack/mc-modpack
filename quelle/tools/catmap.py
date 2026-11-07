# slug -> (cat, sub)  P=Performance V=Visuell G=Gameplay T=Terrain S=Server&Technik
M = """
P Performance: lmd? clumps language-reload cull-leaves ksyxis zfastnoise notenoughrecipebook structure-layout-optimizer quick-pack obe asynclogger async-pack-scan consumableoptimizer smart-particles better-render-distance hold-that-chunk-v2 i-see-you-over-there resourcepackcached sodium-extra-information superresolution xxl-packets entity-view-distance-x shuttfup fast-item-frames
P Basis & Werkzeuge: default-options configured-defaults notenoughcrashes neruina crashexploitfixer uwrad fabrishot fpsdisplay mod-loading-screen modlistmemory iris-shader-folder simple-discord-rpc capes better-capes hd-skins noxesium litematica schematicpreview tweakeroo tweakermore client-commands nbt-autocomplete bettercommandblockui hey-wiki rei justenoughbreeding advanced-loot-info jei-worldgen roughly-enough-professions-rep chunk-debug better-compatibility-checker simple-datapacks simple-resource-loader rescale multi-key-bindings commandkeys auto-clicker mclogs
V HUD & Bedienung: advancement-plaques invmove pick-up-notifier durability-tooltip inventoryhudplus client-tweaks overflowing-bars held-item-info armor-hud simple-armor-hud tooltip-scroll leave-my-bars-alone smooth-gui custom-crosshair-mod centered-crosshair bettersmithingtable distinct-potions ping-view keyoverlay day-counter tnt-timer real-arrow-tip custom-fov-illusive enchantment-descriptions chest-tracker-port eclipseui
V Welt & Licht: particular-reforged perception effectual ripple fog clear-fog clear-waterlavapowdersnow mc2-interactive-foliage sway dense-flowers puddles-floods wavify ambience-v2 head-in-the-clouds glowing-glow-squids vectorientation
V Animation & Modelle: a-good-place stupid-block-animations animated-doors telepistons twod_projectiles armor-3d elytra-trims axolotl-buckets swinging-lanterns custom-glint spawn-animations wither-spawn-animation golem-spawn-animation technomodel talkingheads aitk inventory-interactions not-enough-animations-emf-compat tiny-takeover-x-punchy boatview360
V Sound: sound-physics-perfected sound-culling soundsbegone atmosfera immersivemusicmod
G Komfort: cut-through crafting-tweaks trashslot clientsort item-scroller stack-to-nearby-chests moremousetweaks itemlocks stack-refill bl4cks-sit kleeslabs better-climbing accessible-step breakfree smartblockplacement fast-trading not-interested horseman better-boat-movement leaf-me-alone universal-bone-meal trample-no-more keep-my-soil-tilled scaffolding-drops-nearby accelerated-decay crops-love-rain bow-infinity-fix fortunate-ancient-debris infinity-mending too-cheap villager-converting invisible-frames-mod armor-statues chiseled-bookshelf-visualizer immersivemc underlay grind-enchantments block-runner furnace-recycle unlimited-trading craftable-notch-apple mastercutter sleep-warp-updated serversleep eroding-stone-entities
G Inhalt: advanced-netherite heart-crystals more-villagers-re-employed critical-strike universal-enchants naturally-trimmed diagonal-walls diagonal-windows connected-glass additional-lanterns lanterns-bow displaycase reconnectible-chains vanity trinkets-updated mob-heads more-mobs luna-slimes stormies-spiders cosy-critters nocturnal-bats cave-spider-spawn ly-lucky-blocks areas itemphysic voice-chat-interaction mobexplosiongriefinggamerule
T Terrain: snow this-rocks better-trees countereds-terrain-slabs wilder-flowers 2032-world-height crazygen
T Strukturen: end-villager-outpost giant-natural-additions
S Server & Technik: vmp-fabric carpet carpet-tis-addition carpet-ams-addition carpet-org-addition carpet-extra-extras essentialaddons litematica-server-paster automodpack tt20 view-distance-fix mobfilter invview styled-nicknames lambda chunkyborder chunky-offline voxy-server-side enchanting-commands configmanager
V Fernsicht: voxy-extra voxy-worldgen distant-horizons-seedgen
"""
LIB = set("prickle malilib almanac supermartijn642s-config-lib configurable ukulib zconfig advanced-core-info craterlib konfig amber monolib anvians-lib tlib walksylib bookshelf-lib villagerapi lib-5555ff configuration data-anchor emf-compat-core biolith compose-multiplatform".split())
CAT = {}
for line in M.strip().splitlines():
    head, rest = line.split(':', 1)
    c, sub = head.split(' ', 1)
    for s in rest.split():
        CAT[s.rstrip('?')] = (c, sub)
