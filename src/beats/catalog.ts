import { publicAsset } from '../lib/publicAsset'
import type { BeatDefinition, ZoomFrame } from './types'

export * from './types'

const ANCHOR = '/assets/images/anchor-searles-halite.jpg'
const ANCHOR_ALT =
  'Pink halite cubes perched on a pink salt crust, Searles Lake, California'

/**
 * Zoom ladder. `fieldUm` is the true frame width in micrometres, derived from
 * the burned-in 100 um bar in each source micrograph — 01 is 3.2 mm across,
 * 04 is 424 um. Frames 03 and 04 are the same magnification (04 is a lateral
 * move to a cleaner inclusion field), so the ladder pushes 01 -> 02 -> 03 and
 * then holds.
 */
const ZOOM_LADDER: ZoomFrame[] = [
  {
    src: '/assets/images/zoom/halite-zoom-01.jpg',
    fieldUm: 3200,
    alt: 'A single halite crystal under the microscope, about three millimetres across',
    originX: 52,
    originY: 46,
  },
  {
    src: '/assets/images/zoom/halite-zoom-02.jpg',
    fieldUm: 1111,
    alt: 'Ranks of long tube-shaped fluid inclusions inside the crystal',
    originX: 46,
    originY: 42,
  },
  {
    src: '/assets/images/zoom/halite-zoom-03.jpg',
    fieldUm: 424,
    alt: 'Close view of rectangular fluid inclusions in clear salt',
    originX: 58,
    originY: 44,
  },
  {
    src: '/assets/images/zoom/halite-zoom-04.jpg',
    fieldUm: 424,
    alt: 'A dense field of tiny rectangular brine pockets sealed in halite',
    originX: 62,
    originY: 52,
  },
]

/**
 * 18 beats, 7 acts, ~14:45 of stage time.
 *
 * The Searles Lake crystal is the hub: it opens the talk, returns at every act
 * break, and closes it. Everything else is a departure from that one object.
 */
const BEATS_RAW: BeatDefinition[] = [
  // ─── Act 1 · The Object ────────────────────────────────────────────────
  {
    index: 0,
    act: 'object',
    id: 'cold-open',
    title: 'Cold Open',
    cue: 'Say nothing for five seconds. Let them look.',
    ask: 'ASK: Something in this rock is alive. Hands up if you believe me. Count the room out loud.',
    seconds: 55,
    stage: 'anchor',
    anchor: 'full',
    scene: 'none',
    fit: 'contain',
    steps: [
      {
        label: 'Answer the show of hands',
        headline: 'Something in here is alive.',
        supporting: 'And it has been for a very long time.',
        ask: 'SAY: the hands that went up were right.',
      },
    ],
    fallbackSrc: ANCHOR,
    fallbackAlt: ANCHOR_ALT,
  },
  {
    index: 1,
    act: 'object',
    id: 'the-claim',
    title: 'Name the Object',
    cue: 'Name it plainly. Halite. Rock salt. From a lake in California.',
    seconds: 35,
    stage: 'anchor',
    anchor: 'full',
    scene: 'none',
    fit: 'contain',
    headline: 'Halite. Rock salt.',
    supporting: 'Searles Lake, California.',
    steps: [
      {
        label: 'What it kept',
        headline: 'Halite. Rock salt.',
        supporting: 'It grew in a lake that dried up, and it kept a little of that lake inside.',
      },
    ],
    fallbackSrc: ANCHOR,
    fallbackAlt: ANCHOR_ALT,
  },

  // ─── Act 2 · The Place ─────────────────────────────────────────────────
  {
    index: 2,
    act: 'place',
    id: 'where',
    title: 'Where is Searles Lake?',
    cue: 'Globe spins to North America, pin drops in the Mojave.',
    seconds: 45,
    stage: 'scene',
    scene: 'globe',
    scenePhase: 'world',
    anchor: 'inset',
    headline: 'Where is this from?',
    steps: [
      {
        label: 'Drop the pin',
        scenePhase: 'searles',
        headline: 'Searles Lake, California.',
        supporting: 'Three hours north of where we are standing.',
      },
    ],
    fallbackSrc: '/assets/stand-ins/searles-lakebed.svg',
    fallbackAlt: 'Dry cracked lakebed below desert mountains',
  },
  {
    index: 3,
    act: 'place',
    id: 'why-dry',
    title: 'Why is it dry?',
    cue: 'Three beats: storms arrive, mountains take the rain, lake evaporates.',
    seconds: 40,
    stage: 'diagram',
    diagram: 'rain-shadow',
    diagramStage: 0,
    // The diagram is dense enough on its own; the anchor inset fights its
    // upper-right labels. Continuity is already carried by the beat before.
    anchor: 'hidden',
    scene: 'none',
    headline: 'Why is it dry?',
    steps: [
      {
        label: 'Storms arrive',
        diagramStage: 1,
        headline: 'Why is it dry?',
        supporting: 'Storms roll in off the Pacific.',
      },
      {
        label: 'Mountains take the rain',
        diagramStage: 2,
        headline: 'Why is it dry?',
        supporting: 'The Sierra Nevada takes the rain before it ever gets there.',
      },
      {
        label: 'Lake evaporates',
        diagramStage: 3,
        headline: 'So the lake dried up.',
        supporting: 'What it left behind was salt. A lot of salt.',
      },
    ],
    fallbackSrc: '/assets/stand-ins/searles-lakebed.svg',
    fallbackAlt: 'Dry cracked lakebed below desert mountains',
  },
  {
    index: 4,
    act: 'place',
    id: 'pink-brine',
    title: 'The Pink Water',
    cue: 'Plant the colour. Do not explain it yet — the ending needs it.',
    seconds: 35,
    stage: 'photo',
    anchor: 'hidden',
    scene: 'none',
    fit: 'cover',
    photoSrc: '/assets/stand-ins/pink-brine-field.svg',
    photoAlt: 'A vivid pink brine pool sitting on a white salt flat',
    headline: 'The water that is left is pink.',
    steps: [
      {
        label: 'Park the mystery',
        headline: 'The water that is left is pink.',
        supporting: 'Hold on to that colour. We come back to it.',
      },
    ],
    fallbackSrc: '/assets/stand-ins/pink-brine-field.svg',
    fallbackAlt: 'A vivid pink brine pool sitting on a white salt flat',
  },

  // ─── Act 3 · The Zoom ──────────────────────────────────────────────────
  {
    index: 5,
    act: 'zoom',
    id: 'zoom-ladder',
    title: 'Zoom Ladder',
    cue: 'Never cut. Keep saying: this is still the same rock.',
    seconds: 60,
    stage: 'zoom',
    anchor: 'hidden',
    scene: 'none',
    zoom: ZOOM_LADDER,
    zoomIndex: 0,
    showScale: true,
    headline: 'Closer.',
    steps: [
      {
        label: 'Push to 1.1 mm',
        zoomIndex: 1,
        showScale: true,
        headline: 'Closer.',
        supporting: 'Still the same crystal.',
      },
      {
        label: 'Push to 0.42 mm, hide the scale',
        zoomIndex: 2,
        showScale: false,
        headline: undefined,
        supporting: undefined,
        ask: 'ASK: how wide is this picture, really? Take three guesses out loud.',
      },
      {
        label: 'Reveal the scale',
        showScale: true,
        flash: true,
        headline: 'Four tenths of a millimetre.',
        supporting: 'About one and a half grains of table salt, side by side.',
      },
    ],
    fallbackSrc: '/assets/images/zoom/halite-zoom-03.jpg',
    fallbackAlt: 'Close view of rectangular fluid inclusions in clear salt',
  },
  {
    index: 6,
    act: 'zoom',
    id: 'inclusions',
    title: 'Fluid Inclusions',
    cue: 'Name the pockets. Every rectangle is a drop of the old lake.',
    seconds: 30,
    stage: 'zoom',
    anchor: 'hidden',
    scene: 'none',
    zoom: ZOOM_LADDER,
    zoomIndex: 3,
    showScale: true,
    headline: 'Fluid inclusions.',
    supporting: 'Every little box is a drop of that lake, sealed in salt.',
    steps: [
      {
        label: 'Label the pockets',
        labels: [
          { text: 'trapped lake water', x: 22, y: 30, delayMs: 300 },
          { text: 'sealed for thousands of years', x: 58, y: 68, delayMs: 1100 },
        ],
      },
    ],
    fallbackSrc: '/assets/images/zoom/halite-zoom-04.jpg',
    fallbackAlt: 'A dense field of tiny rectangular brine pockets sealed in halite',
  },

  // ─── Act 4 · The Life ──────────────────────────────────────────────────
  {
    index: 7,
    act: 'life',
    id: 'reveal',
    title: 'Something Moves',
    cue: 'Silence. No caption, no headline. Let the room find it themselves.',
    seconds: 55,
    stage: 'video',
    anchor: 'hidden',
    scene: 'none',
    fit: 'contain',
    videoSrc: '/assets/video/bacteria.mp4',
    steps: [
      {
        label: 'First caption',
        caption: 'Something in there is moving.',
      },
      {
        label: 'Name it',
        caption: 'That is a living cell, inside the salt.',
      },
    ],
    fallbackSrc: '/assets/fallbacks/bacteria.jpg',
    fallbackAlt: 'Fluid inclusions in halite under the microscope',
  },
  {
    index: 8,
    act: 'life',
    id: 'still-the-same-rock',
    title: 'Back to the Rock',
    cue: 'Anchor returns full frame. Point at it.',
    seconds: 35,
    stage: 'anchor',
    anchor: 'full',
    scene: 'none',
    fit: 'contain',
    headline: 'Same rock.',
    supporting: 'You have been looking at it this whole time.',
    fallbackSrc: ANCHOR,
    fallbackAlt: ANCHOR_ALT,
  },

  // ─── Act 5 · The Reach ─────────────────────────────────────────────────
  {
    index: 9,
    act: 'reach',
    id: 'mars-film',
    title: 'Searching for Life in Salt Crystals',
    cue: 'Set it up in one line, then stop talking for two minutes.',
    seconds: 135,
    stage: 'video',
    anchor: 'hidden',
    scene: 'none',
    // Burned-in narration text sits close to frame edges — never crop this one.
    fit: 'contain',
    videoSrc: '/assets/video/searching-for-life.mp4',
    poster: '/assets/images/searching-for-life-poster.jpg',
    audio: true,
    fallbackSrc: '/assets/images/searching-for-life-poster.jpg',
    fallbackAlt: 'Title card reading Searching for Life in Salt Crystals',
  },

  // ─── Act 6 · The Depth ─────────────────────────────────────────────────
  {
    index: 10,
    act: 'depth',
    id: 'the-dive',
    title: 'California to the North Sea',
    cue: 'Reset the room after the film. Get them counting.',
    ask: 'ASK: count me down from five, out loud, everybody.',
    seconds: 45,
    stage: 'scene',
    scene: 'globe',
    scenePhase: 'searles',
    anchor: 'hidden',
    headline: 'We found the same thing somewhere else.',
    steps: [
      {
        label: 'Countdown, then launch the arc',
        countFrom: 5,
        scenePhase: 'arc',
        headline: undefined,
        supporting: undefined,
      },
      {
        label: 'Land at Boulby',
        scenePhase: 'boulby-surface',
        headline: 'Boulby Mine, England.',
        supporting: 'The tunnels run out under the North Sea.',
      },
    ],
    fallbackSrc: '/assets/images/boulby-surface.jpg',
    fallbackAlt: 'Surface works of Boulby Mine in the English countryside',
  },
  {
    index: 11,
    act: 'depth',
    id: 'descent',
    title: 'Descent',
    cue: 'BRING THE HOUSE LIGHTS DOWN. Say nothing. Let the counter run.',
    // One press, then about 35 seconds of unbroken falling: out of orbit, into
    // the ground, down the shaft. Long on purpose — the room goes dark over it.
    seconds: 58,
    stage: 'scene',
    scene: 'globe',
    scenePhase: 'shaft',
    anchor: 'hidden',
    headline: 'Down.',
    supporting: 'Eleven hundred metres. More than three Eiffel Towers, stacked.',
    steps: [
      {
        label: 'Reach the salt seam',
        scenePhase: 'seam',
        headline: 'Into a sea that dried up 250 million years ago.',
        supporting: 'Now it is a layer of salt, a kilometre down.',
      },
    ],
    fallbackSrc: '/assets/images/boulby-tunnel.jpg',
    fallbackAlt: 'Researchers walking a lit tunnel deep in Boulby Mine',
  },
  {
    index: 12,
    act: 'depth',
    id: 'salt-world',
    title: 'Salt World',
    cue: 'Three photos, two presses. Land hard on the darkness.',
    // Trimmed to help pay for the longer descent. The room is already dark and
    // already underground by now, so these land faster than they used to.
    seconds: 34,
    stage: 'photo',
    anchor: 'hidden',
    scene: 'none',
    fit: 'cover',
    photoSrc: '/assets/images/boulby-stalactites.jpg',
    photoAlt: 'Halite soda-straw stalactites hanging from the mine ceiling',
    headline: 'Salt grows down here.',
    supporting: 'Even the ceiling is crystal.',
    steps: [
      {
        label: 'Closed tunnels',
        photoSrc: '/assets/images/boulby-wood-cribs.jpg',
        photoAlt: 'Wooden crib supports and mesh in a damaged mine tunnel',
        headline: 'Some tunnels are closed off.',
        supporting: 'Ancient water is eating the rock from the inside.',
      },
      {
        label: 'Lights off',
        photoSrc: '/assets/images/boulby-aaron-scott.jpg',
        photoAlt: 'Two researchers with headlamps in a dark salt tunnel',
        headline: 'Lights off.',
        supporting: 'Close your eyes. Open them. No difference.',
      },
    ],
    fallbackSrc: '/assets/images/boulby-darkness.jpg',
    fallbackAlt: 'Absolute darkness broken only by headlamps',
  },
  {
    index: 13,
    act: 'depth',
    id: 'finding-salt',
    title: 'Finding the Water',
    cue: 'Photo, roll the drilling clip, the specimen in hand, then the bottle.',
    seconds: 52,
    stage: 'photo',
    anchor: 'hidden',
    scene: 'none',
    fit: 'cover',
    photoSrc: '/assets/images/boulby-sampling.jpg',
    photoAlt: 'Researchers setting up sampling gear in a salt tunnel',
    videoSrc: '/assets/video/sampling.mp4',
    holdPoster: true,
    headline: 'We went looking for the water.',
    steps: [
      {
        label: 'Roll the drilling clip',
        playVideo: true,
        caption: 'Drilling into a 250-million-year-old seam.',
        headline: undefined,
        supporting: undefined,
      },
      {
        label: 'Salt in hand',
        playVideo: false,
        photoSrc: '/assets/images/boulby-specimen.jpg',
        photoAlt: 'A hand holding a block of clear salt from deep in the mine',
        headline: 'Salt, a mile down.',
        supporting: 'Sealed away since long before the dinosaurs.',
      },
      {
        // The real sample bottle. Sets up the thesis beat that follows.
        label: 'The bottle we carried out',
        // Portrait shot in a landscape run — letterbox rather than crop it.
        fit: 'contain',
        photoSrc: '/assets/images/boulby-brine-bottle.jpg',
        photoAlt: 'A labelled sample bottle of cloudy brine from Boulby mine',
        headline: 'And we carried the water out.',
        supporting: 'Brine from the seam, in a bottle, on a bench.',
      },
    ],
    fallbackSrc: '/assets/images/boulby-specimen.jpg',
    fallbackAlt: 'A hand holding a block of clear salt from deep in the mine',
  },
  {
    index: 14,
    act: 'depth',
    id: 'brine-turns-pink',
    title: 'The Brine Turns Pink',
    cue: 'This is the thesis. Slow down. Let the colour change land.',
    ask: 'ASK: nothing was added to this bottle. What do you think happened?',
    seconds: 60,
    stage: 'compare',
    anchor: 'hidden',
    scene: 'none',
    fit: 'contain',
    compare: {
      beforeSrc: '/assets/stand-ins/brine-bottle-field.svg',
      beforeLabel: 'Out of the mine',
      afterSrc: '/assets/stand-ins/brine-bottle-lab.svg',
      afterLabel: 'Weeks later',
    },
    comparePhase: 'before',
    headline: 'The brine came out clear.',
    steps: [
      {
        label: 'Crossfade to pink',
        comparePhase: 'after',
        headline: 'Weeks later it was pink.',
        supporting: 'Nothing was added. Something grew.',
      },
      {
        // Aaron: confirm the exact wording you want here. The ending hangs on
        // this line, and it is the claim the cold-open image cashes in.
        label: 'Name the colour',
        comparePhase: 'after',
        flash: true,
        headline: 'The pink is alive.',
        supporting: 'That colour is made by microbes that can only live in salt.',
      },
    ],
    fallbackSrc: '/assets/stand-ins/brine-bottle-lab.svg',
    fallbackAlt: 'A sample bottle of brine, now vivid pink',
  },

  // ─── Act 7 · The Return ────────────────────────────────────────────────
  {
    index: 15,
    act: 'return',
    id: 'hunt',
    title: 'Drive the Microscope',
    cue: 'Hand the crystal to the room. Take directions. Do not rush this.',
    ask: 'ASK: you steer. Drag to turn it, scroll to go in, slide the focus. Shout when you see one move.',
    seconds: 60,
    stage: 'scene',
    scene: 'hero',
    anchor: 'hidden',
    headline: 'Here is what that looks like from inside.',
    steps: [
      {
        label: 'Hand over the controls',
        hunt: true,
        headline: undefined,
        supporting: undefined,
      },
      {
        label: 'Found one',
        hunt: true,
        headline: 'Found one.',
        supporting: 'One cell, in one drop, in one crystal.',
      },
    ],
    fallbackSrc: '/assets/fallbacks/halite.jpg',
    fallbackAlt: 'Fluid inclusions inside a halite crystal',
  },
  {
    index: 16,
    act: 'return',
    id: 'the-reread',
    title: 'Look Again',
    cue: 'The first picture of the talk, unchanged. Say the last line slowly.',
    seconds: 30,
    stage: 'anchor',
    anchor: 'full',
    scene: 'none',
    fit: 'contain',
    headline: 'Look again.',
    supporting: 'The pink you saw in the very first picture — that was the life.',
    fallbackSrc: ANCHOR,
    fallbackAlt: ANCHOR_ALT,
  },
  {
    index: 17,
    act: 'return',
    id: 'send-off',
    title: 'Send-off',
    cue: 'Thank you, then hand to the moderator.',
    seconds: 30,
    stage: 'anchor',
    anchor: 'full',
    scene: 'none',
    fit: 'contain',
    headline: '35 million specimens.',
    supporting: 'Every single one still has something to say.',
    fallbackSrc: ANCHOR,
    fallbackAlt: ANCHOR_ALT,
  },
]

function resolvePaths(beat: BeatDefinition): BeatDefinition {
  return {
    ...beat,
    photoSrc: beat.photoSrc ? publicAsset(beat.photoSrc) : undefined,
    videoSrc: beat.videoSrc ? publicAsset(beat.videoSrc) : undefined,
    poster: beat.poster ? publicAsset(beat.poster) : undefined,
    captionsSrc: beat.captionsSrc ? publicAsset(beat.captionsSrc) : undefined,
    fallbackSrc: beat.fallbackSrc ? publicAsset(beat.fallbackSrc) : undefined,
    zoom: beat.zoom?.map((f) => ({ ...f, src: publicAsset(f.src) })),
    compare: beat.compare
      ? {
          ...beat.compare,
          beforeSrc: publicAsset(beat.compare.beforeSrc),
          afterSrc: publicAsset(beat.compare.afterSrc),
        }
      : undefined,
    // Only rewrite steps that actually carry a photo: spreading a `photoSrc`
    // key onto every step would make each one clear the picture.
    steps: beat.steps?.map((step) =>
      step.photoSrc ? { ...step, photoSrc: publicAsset(step.photoSrc) } : step
    ),
  }
}

export const BEATS: BeatDefinition[] = BEATS_RAW.map(resolvePaths)
export const BEAT_COUNT = BEATS.length

export const ANCHOR_SRC = publicAsset(ANCHOR)
export const ANCHOR_ALT_TEXT = ANCHOR_ALT

/** Total stage budget in seconds, used by the HUD pace indicator. */
export const TALK_SECONDS = BEATS.reduce((sum, b) => sum + b.seconds, 0)

/** Cumulative seconds elapsed before each beat starts, for drift maths. */
export const BEAT_START_SECONDS: number[] = (() => {
  const out: number[] = []
  let running = 0
  for (const beat of BEATS) {
    out.push(running)
    running += beat.seconds
  }
  return out
})()

/** First beat of each act, for the 1-7 jump keys. */
export function actStartIndex(actKey: number): number {
  const order = ['object', 'place', 'zoom', 'life', 'reach', 'depth', 'return']
  const actId = order[actKey - 1]
  const found = BEATS.findIndex((b) => b.act === actId)
  return found === -1 ? 0 : found
}
