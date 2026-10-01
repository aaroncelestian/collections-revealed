Everything the app loads at runtime. Generated files are marked; regenerate them
with `npm run assets`. `npm run preflight` reports anything referenced but
missing, plus anything here that nothing points at.

## In use

| File | Beat | |
| --- | --- | --- |
| `images/anchor-searles-halite.jpg` | the anchor — acts 1, 4, 7 | generated from `assets/new_hero.jpg` |
| `images/zoom/halite-zoom-01..04.jpg` | zoom ladder (3.2 mm / 1.1 mm / 0.42 mm / 0.42 mm) | generated |
| `images/searching-for-life-poster.jpg` | Mars film poster | generated |
| `video/boulby-drive.mp4` | salt world, the drive in — plays with sound | generated |
| `images/boulby-stalactites.jpg` | salt world — drive fallback + ceiling still | |
| `images/boulby-green-door.jpeg` | salt world — sealed chamber | from `assets/green_door_escape_room.jpeg` |
| `images/boulby-aaron-scott.jpg` | salt world, lights off | |
| `images/boulby-sampling.jpg` | finding the water | |
| `images/boulby-specimen.jpg` | salt in hand | |
| `images/boulby-brine-bottle.jpg` | the bottle we carried out | |
| `video/searching-for-life.mp4` | the Mars film, plays with sound | generated |
| `video/bacteria.mp4` | the reveal — microbes in an inclusion | |
| `images/searles-lakebed.jpg` | Act 2 still — dry lakebed | from `assets/lake_wide_shot.jpeg` |
| `images/searles-drilling.jpg` | Act 2 still — drilling the flat | from `assets/drilling.jpeg` |
| `images/searles-rock-art.jpg` | Act 2 still — painted rocks | from `assets/rock_art.jpg` |
| `images/searles-pink-water.jpg` | Act 2 still — pink pool | from `assets/pink_water.jpg` |
| `images/searles-pink-strands.jpg` | Act 2 still — pink filaments | from `assets/pink_bacteria_strands.jpg` |
| `video/sampling.mp4` | drilling the seam | |
| `hero/halite-theatre.json` | Theatre.js timeline for the live crystal | |

## Stand-ins

Clearly-labelled artwork standing in until real photography exists. Swapping one
means dropping a file in and changing one path in `src/beats/catalog.ts`.

| File | Wants |
| --- | --- |
| `stand-ins/brine-bottle-field.svg` | the sample bottle as collected |
| `stand-ins/brine-bottle-lab.svg` | the same bottle, hours later, pink |

The bottle pair must be shot identically — same bottle, fill line, light and
angle — because the beat crossfades one into the other and the color change is
the only thing that should move. `images/boulby-brine-bottle.jpg` is the real
"before"; a matching pink shot of that same bottle retires both stand-ins.

## Not currently used

Kept from the earlier cut of the talk: `fallbacks/bacteria.jpg`,
`fallbacks/collection.jpg`, `fallbacks/field.jpg`, `fallbacks/halite.jpg`,
`fallbacks/mars.jpg`, `images/boulby-darkness.jpg`,
`images/boulby-green-chamber.jpg`, `images/boulby-surface.jpg`,
`images/boulby-tunnel.jpg`, `images/boulby-wood-cribs.jpg`,
`stand-ins/searles-lakebed.svg`, `stand-ins/pink-brine-field.svg`,
`images/boulby-halite-lab.jpg`, `images/boulby-salt-road.jpg`,
`images/boulby-team.jpg`, `images/boulby-team-surface.jpg`,
`images/fluid-inclusion-micro.jpg`, `images/halite-inclusions.jpg`,
`images/hopper-crystal.jpg`, `images/shamu-dhm.jpg`,
`video/brine-lake.mp4`.

Story: https://aaroncelestian.substack.com/p/what-woke-up
