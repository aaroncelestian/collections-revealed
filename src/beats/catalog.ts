import { publicAsset } from '../lib/publicAsset'
import type { BeatDefinition, ZoomFrame } from './types'

export * from './types'

const ANCHOR = '/assets/images/anchor-searles-halite.jpg'
const ANCHOR_ALT =
  'A close field of pink halite cubes grown on a pink salt crust, Searles Lake, California'

/**
 * The anchor is a portrait macro on a landscape stage, so every beat that
 * shows it fills the frame rather than letterboxing it. It is a field of
 * crystals, not an object on a backdrop — the crop costs nothing and the
 * full-bleed pink is what the closing line cashes in.
 */
const ANCHOR_FIT = 'cover' as const

/**
 * Zoom ladder, one shared picture.
 *
 * `fieldUm` is the true frame width, measured off the burned-in 100 µm bar.
 * `xUm` / `yUm` place each frame in that same space (origin = top-left of
 * frame 01). Frame 02 is locked to the right-hand side of the crystal in
 * frame 01. Frames 03 and 04 are the same magnification; 04 is the measured
 * shift down and left from 03, into a cleaner inclusion field. 03 itself is
 * not a crop of 02 — the stage moved — so it is parked on the tube field
 * the previous step was already aimed at and marked `crossfade`: the camera
 * keeps pushing on 02 while 03 dissolves over it, because a cut to a different
 * part of the crystal reads as a jump.
 */
const ZOOM_LADDER: ZoomFrame[] = [
  {
    src: '/assets/images/zoom/halite-zoom-01.jpg',
    fieldUm: 3200,
    xUm: 0,
    yUm: 0,
    alt: 'A single halite crystal under the microscope, about three millimetres across',
  },
  {
    src: '/assets/images/zoom/halite-zoom-02.jpg',
    fieldUm: 1107,
    xUm: 1741.6,
    yUm: 1041.6,
    alt: 'Ranks of long tube-shaped fluid inclusions inside the crystal',
  },
  {
    src: '/assets/images/zoom/halite-zoom-03.jpg',
    fieldUm: 432,
    xUm: 2034.8,
    yUm: 1228.3,
    crossfade: true,
    alt: 'Close view of rectangular fluid inclusions in clear salt',
  },
  {
    src: '/assets/images/zoom/halite-zoom-04.jpg',
    fieldUm: 431,
    xUm: 1915.3,
    yUm: 1440.5,
    alt: 'A dense field of tiny rectangular brine pockets sealed in halite',
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
    fit: ANCHOR_FIT,
    titleCard: {
      eyebrow: 'Collections Revealed',
      title: 'Life in Salt',
      byline: 'Aaron Celestian, PhD',
    },
    steps: [
      {
        label: 'Answer the show of hands',
        // The plate clears as the first line lands, so the crystal is alone
        // on screen for the rest of the act.
        titleCard: undefined,
        headline: 'Something in here is alive.',
        supporting: 'And it has been for a very long time.',
        ask: 'SAY: the hands that went up were right.',
      },
    ],
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
    fit: ANCHOR_FIT,
    headline: 'Halite. Rock salt.',
    supporting: 'Searles Lake, California.',
    steps: [
      {
        label: 'What it kept',
        headline: 'Halite. Rock salt.',
        supporting: 'It grew in a lake that dried up, and it kept a little of that lake inside.',
      },
    ],
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
    fit: ANCHOR_FIT,
    headline: 'Where is this from?',
    steps: [
      {
        label: 'Drop the pin',
        scenePhase: 'searles',
        headline: 'Searles Lake, California.',
        supporting: 'Three hours north of where we are standing.',
      },
    ],
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
    fit: ANCHOR_FIT,
    headline: 'Same rock.',
    supporting: 'You have been looking at it this whole time.',
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
  },
  {
    index: 12,
    act: 'depth',
    id: 'salt-world',
    title: 'Salt World',
    cue: 'The drive rolls on arrival, with sound. Two presses cut to the stills. Land hard on the darkness.',
    // Opens on the drive out through the tunnels, then the same two presses as
    // before. The first press ends the clip, so it never runs under the beats
    // that follow. `photoSrc` here is the still the beat falls back to if the
    // clip will not play.
    seconds: 34,
    stage: 'photo',
    anchor: 'hidden',
    scene: 'none',
    fit: 'cover',
    photoSrc: '/assets/images/boulby-stalactites.jpg',
    photoAlt: 'Halite soda-straw stalactites hanging from the mine ceiling',
    videoSrc: '/assets/video/boulby-drive.mp4',
    // Runs with the engine and the tunnel noise. 46 seconds against a 34
    // second beat, so it does not loop — the first press cuts it off long
    // before the end, and a loop seam under the sound would be audible.
    audio: true,
    copyDelayMs: 3000,
    headline: 'Salt grows down here.',
    supporting: 'Even the ceiling is crystal.',
    steps: [
      {
        label: 'Closed tunnels',
        playVideo: false,
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
    // Portrait in a landscape run. Cover was pinning the crop on the black
    // ceiling and cutting off the person and the hole.
    fit: 'contain',
    photoSrc: '/assets/images/boulby-sampling.jpg',
    photoAlt: 'Researchers setting up sampling gear in a salt tunnel',
    videoSrc: '/assets/video/sampling.mp4',
    holdPoster: true,
    headline: 'We went looking for the water.',
    steps: [
      {
        label: 'Roll the drilling clip',
        playVideo: true,
        fit: 'cover',
        caption: 'Drilling into a 250-million-year-old seam.',
        headline: undefined,
        supporting: undefined,
      },
      {
        label: 'Salt in hand',
        playVideo: false,
        // Same portrait problem as the opening photo: cover pinned on the
        // black ceiling and cut the two of them off at the chest.
        fit: 'contain',
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
      afterLabel: 'Hours later',
    },
    comparePhase: 'before',
    headline: 'The brine came out clear.',
    steps: [
      {
        label: 'Crossfade to pink',
        comparePhase: 'after',
        headline: 'Hours later it was pink.',
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
  },

  // ─── Act 7 · The Return ────────────────────────────────────────────────
  {
    index: 15,
    act: 'return',
    id: 'hunt',
    title: 'Drive the Microscope',
    cue: 'Hand the crystal to the room, take directions, then let the last three presses carry the room out.',
    ask: 'ASK: you steer. Drag to turn it, scroll to go in, slide the focus. Shout when you see one move.',
    // The hunt is about a minute of it; the rest is the pull-back, which runs
    // itself once each press starts it.
    seconds: 100,
    stage: 'scene',
    scene: 'hero',
    anchor: 'hidden',
    // The beat opens in the water, with the cells in shot. The scripted camera
    // is a loop that is only inside for part of its run, so without this the
    // opening frame is whichever part of the loop the clock happened to reach.
    inside: true,
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
      // ── The way out. One press each, every move runs on its own. ────────
      {
        // Takes the controls back and walks the camera out over five seconds.
        // The room has been inside this thing for a minute — this is the first
        // time they see it whole.
        label: 'Pull out to the whole crystal (5s)',
        hunt: false,
        // The move starts from wherever the room left the camera, so the hold
        // has to be released before the pull rather than re-armed under it.
        inside: false,
        pullBack: true,
        ask: 'SAY nothing. Let it fall away.',
        headline: 'One crystal.',
        supporting: 'Two millimetres of salt, with a lake still sealed inside it.',
      },
      {
        // Cross-dissolves on to the planet at the size the crystal left, then
        // keeps backing off. Searles is still pinned on it.
        label: 'Out to the planet',
        scene: 'globe',
        scenePhase: 'earth-out',
        headline: 'One planet we know it happens on.',
        supporting: undefined,
      },
      {
        // Aaron: your line. The picture makes the argument — this is the only
        // salt with anything living in it that anyone has ever found.
        label: 'Out to the solar system',
        scene: 'solar',
        scenePhase: 'system',
        headline: 'So we go looking on the others.',
        supporting: 'Same rock. Same salt. Same question.',
      },
    ],
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
    fit: ANCHOR_FIT,
    headline: 'Look again.',
    supporting: 'The pink you saw in the very first picture — that was the life.',
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
    fit: ANCHOR_FIT,
    headline: '35 million specimens.',
    supporting: 'Every single one still has something to say.',
  },
]

function resolvePaths(beat: BeatDefinition): BeatDefinition {
  return {
    ...beat,
    photoSrc: beat.photoSrc ? publicAsset(beat.photoSrc) : undefined,
    videoSrc: beat.videoSrc ? publicAsset(beat.videoSrc) : undefined,
    poster: beat.poster ? publicAsset(beat.poster) : undefined,
    captionsSrc: beat.captionsSrc ? publicAsset(beat.captionsSrc) : undefined,
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

/** Every still the talk can put on screen, so the overlay can warm them all. */
export const IMAGE_SOURCES: string[] = BEATS.flatMap((beat) =>
  [
    beat.photoSrc,
    beat.poster,
    beat.compare?.beforeSrc,
    beat.compare?.afterSrc,
    ...(beat.steps?.map((step) => step.photoSrc) ?? []),
    ...(beat.zoom?.map((frame) => frame.src) ?? []),
  ].filter((src): src is string => Boolean(src))
)

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
