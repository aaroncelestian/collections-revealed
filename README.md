# Collections Revealed — Life in Salt

Presenter-driven stage build for NHM **Collections Revealed**. A 15-minute scale
journey anchored on one halite crystal from Searles Lake, out to micrometres,
living cells, Mars, and a kilometre under the North Sea, then back to the same
rock. Story from [What Woke Up](https://aaroncelestian.substack.com/p/what-woke-up).

**Rehearsing? Read [`docs/run-of-show.md`](docs/run-of-show.md)** — beat times,
cue lines, and the four audience-interaction scripts.

## Quick start

```bash
npm install
npm run assets     # once, or after dropping new files into assets/
npm run dev
```

`npm run preflight` checks that every asset path the code references actually
exists. Run it before you present.

## Presenter controls

| Input | Action |
| --- | --- |
| `Space` / `→` / clicker Next | Next reveal, then next beat |
| `←` / clicker Back | Back, one reveal at a time |
| `1`–`7` | Jump to the start of an act |
| `T` / `R` | Start-pause / reset the clock |
| `H` | Toggle HUD |

Append `?audience=1` to the URL to hide the HUD on a house feed.

## Structure

The crystal is a hub, not scenery: it opens the talk, returns at every act
break, and closes it. 18 beats in 7 acts, 14:54.

| Act | Beats | Runs |
| --- | --- | --- |
| 1 The Object | cold open, name the object | 1:30 |
| 2 The Place | globe, rain shadow, pink brine | 2:00 |
| 3 The Zoom | zoom ladder, fluid inclusions | 1:30 |
| 4 The Life | microbe clip, back to the rock | 1:30 |
| 5 The Reach | the Mars film | 2:15 |
| 6 The Depth | dive, descent, Boulby, brine turns pink | 4:09 |
| 7 The Return | live 3D hunt, the re-read, send-off | 2:00 |

Beats live in [`src/beats/catalog.ts`](src/beats/catalog.ts). That file is the
script — copy, timings, assets and interaction cues are all in one place.

## Reveal steps

A beat can hold several presses. `next` consumes a beat's `steps` before moving
on, which is what lets a beat pose a question, wait, and then answer it without
cutting the picture.

Steps are applied as overrides on the beat's base state, and stepping backwards
replays from the base rather than undoing — so `←` always reproduces exactly
what was on screen. Writing `headline: undefined` in a step *clears* the
headline; omitting the key leaves it alone.

## Scenes

`PresentationApp` routes between three canvases' worth of scene:

- **`hero`** — the live halite crystal (`src/scene/halite/hero-halite.js`,
  Theatre.js zoom loop, DOF, scale bar, focus rack). Act 7 pauses the scripted
  camera and hands the controls to the room.
- **`globe`** — [`src/scene/GlobeDive.ts`](src/scene/GlobeDive.ts). A textured
  Earth, an animated great-circle arc from Searles to Boulby, then a procedural
  descent to the salt with a live depth readout.

  The descent is one continuous 35-second move on a single press, because the
  house lights come down over it. The camera falls out of orbit onto Yorkshire
  with the lens opening as it goes, the frame blacks out as it reaches the
  ground — which is also what hides the point where the map runs out of pixels —
  and it returns already dropping down the shaft. A second press opens the shaft
  out into the salt chamber at 1,100 m.

  The map is painted at runtime by
  [`src/scene/worldTexture.ts`](src/scene/worldTexture.ts) from Natural Earth
  vectors — coastlines at 1:50m, country borders, and the major lakes — into a
  4096×2048 equirectangular canvas, with roughness and bump maps alongside it.
  Nothing is downloaded and no imagery is bundled, so the build stays offline
  and the coastline stays sharp when the camera pushes in on California and on
  Yorkshire. Painting costs about 1.3 s, so it runs off the boot path and the
  globe shows plain ocean until it lands; the globe is not on screen until
  roughly 1:30 into the talk.
- **`none`** — DOM overlays own the frame.

Off-stage scenes stop rendering rather than just fading out, so only one WebGL
scene is doing work at a time.

## Overlays

Under `src/overlay/`:

- `AnchorLayer` — the crystal, mounted once, animating between full frame,
  corner inset and hidden. Separate from the shared photo layer so it can
  crossfade with itself.
- `ZoomStack` — matched-scale crossfades across the four micrographs with a live
  scale bar. Field widths come from the burned-in bars in the source TIFFs
  (3.2 mm, 1.1 mm, 0.42 mm, 0.42 mm).
- `RainShadowDiagram` — inline SVG, revealed in three stages.
- `CompareLayer` — before/after crossfade for the brine bottle.
- `InteractionCue` — the countdown and the reveal flash.

## Assets

`npm run assets` converts the raw drops in `assets/` into what the app loads:
the anchor still, the four zoom JPEGs, and the Mars film as faststart MP4 with a
poster frame. It is idempotent.

Four visuals are still clearly-labelled stand-in SVGs under
`public/assets/stand-ins/` — see the end of the run of show for what to shoot
and how to swap them in.

`npm run world` regenerates [`src/scene/world-data.json`](src/scene/world-data.json),
the globe's coastlines, borders and lakes, from the `world-atlas` package and
Natural Earth. It is already committed, so you only need this if you want
different source data. It is the one script that reaches the network, and it
caches its download under `.cache/`.

## Video and audio

Local MP4s under `public/assets/video/` are preloaded at boot. The Mars film
plays with sound: the presenter keypress that reaches the beat counts as the
user gesture browsers require, and the app falls back to muted by itself if
that is refused. Set `captionsSrc` on a beat to attach a WebVTT track.

`youtubeId` is still supported per beat, but prefer local files — auditorium
wifi is the least reliable thing in the room.
