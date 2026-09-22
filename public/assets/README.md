Everything the app loads at runtime. Generated files are marked; regenerate them
with `npm run assets`. `npm run preflight` reports anything referenced but
missing, plus anything here that nothing points at.

## In use

| File | Beat | |
| --- | --- | --- |
| `images/anchor-searles-halite.jpg` | the anchor — acts 1, 4, 7 | generated |
| `images/zoom/halite-zoom-01..04.jpg` | zoom ladder (3.2 mm / 1.1 mm / 0.42 mm / 0.42 mm) | generated |
| `images/searching-for-life-poster.jpg` | Mars film poster | generated |
| `images/boulby-stalactites.jpg` | salt world, crystal ceiling | |
| `images/boulby-wood-cribs.jpg` | salt world, closed tunnels | |
| `images/boulby-aaron-scott.jpg` | salt world, lights off | |
| `images/boulby-sampling.jpg` | finding the water | |
| `images/boulby-specimen.jpg` | salt in hand | |
| `images/boulby-brine-bottle.jpg` | the bottle we carried out | |
| `video/searching-for-life.mp4` | the Mars film, plays with sound | generated |
| `video/bacteria.mp4` | the reveal — microbes in an inclusion | |
| `video/sampling.mp4` | drilling the seam | |
| `hero/halite-theatre.json` | Theatre.js timeline for the live crystal | |

## Stand-ins

Clearly-labelled artwork standing in until real photography exists. Swapping one
means dropping a file in and changing one path in `src/beats/catalog.ts`.

| File | Wants |
| --- | --- |
| `stand-ins/pink-brine-field.svg` | the pink brine in the field at Searles |
| `stand-ins/brine-bottle-field.svg` | the sample bottle as collected |
| `stand-ins/brine-bottle-lab.svg` | the same bottle, weeks later, pink |

The bottle pair must be shot identically — same bottle, fill line, light and
angle — because the beat crossfades one into the other and the colour change is
the only thing that should move. `images/boulby-brine-bottle.jpg` is the real
"before"; a matching pink shot of that same bottle retires both stand-ins.

## Not currently used

Kept from the earlier cut of the talk: `fallbacks/bacteria.jpg`,
`fallbacks/collection.jpg`, `fallbacks/field.jpg`, `fallbacks/halite.jpg`,
`fallbacks/mars.jpg`, `images/boulby-darkness.jpg`,
`images/boulby-green-chamber.jpg`, `images/boulby-surface.jpg`,
`images/boulby-tunnel.jpg`, `stand-ins/searles-lakebed.svg`,
`images/boulby-halite-lab.jpg`, `images/boulby-salt-road.jpg`,
`images/boulby-team.jpg`, `images/boulby-team-surface.jpg`,
`images/fluid-inclusion-micro.jpg`, `images/halite-inclusions.jpg`,
`images/hopper-crystal.jpg`, `images/shamu-dhm.jpg`, `video/brine-lake.mp4`.

Story: https://aaroncelestian.substack.com/p/what-woke-up
