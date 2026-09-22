/**
 * Beat + reveal-step vocabulary for the anchored scale journey.
 *
 * A beat is a stage state. A step is a patch applied on top of that state by a
 * presenter keypress, so a single beat can hold a question, a pause, and its
 * answer without cutting the picture.
 */

export type ActId = 'object' | 'place' | 'zoom' | 'life' | 'reach' | 'depth' | 'return'

export interface ActDefinition {
  id: ActId
  /** 1-based act number; doubles as the jump key. */
  key: number
  title: string
}

export const ACTS: ActDefinition[] = [
  { id: 'object', key: 1, title: 'The Object' },
  { id: 'place', key: 2, title: 'The Place' },
  { id: 'zoom', key: 3, title: 'The Zoom' },
  { id: 'life', key: 4, title: 'The Life' },
  { id: 'reach', key: 5, title: 'The Reach' },
  { id: 'depth', key: 6, title: 'The Depth' },
  { id: 'return', key: 7, title: 'The Return' },
]

/** Which full-viewport visual owns the frame. */
export type StageKind =
  | 'anchor'
  | 'photo'
  | 'video'
  | 'zoom'
  | 'diagram'
  | 'compare'
  | 'scene'

/** Which WebGL scene the canvas renders, if any. */
export type SceneKind = 'none' | 'hero' | 'globe'

/** Where the Searles Lake crystal sits. It never unmounts, it only moves. */
export type AnchorPlacement = 'hidden' | 'full' | 'inset'

/** Named camera state inside GlobeDive. */
export type GlobePhase =
  | 'world'
  | 'searles'
  | 'arc'
  | 'boulby-surface'
  | 'shaft'
  | 'seam'

export interface BeatLabel {
  text: string
  /** Percent of viewport width / height. */
  x: number
  y: number
  delayMs?: number
}

export interface ComparePair {
  beforeSrc: string
  beforeLabel: string
  afterSrc: string
  afterLabel: string
}

/**
 * One presenter keypress inside a beat. Every field is an override on the
 * beat's base state, so replaying steps 0..n from scratch always reproduces
 * the same screen — that is what makes stepping backwards safe.
 */
export interface RevealStep {
  /** Presenter-facing name for the HUD. */
  label: string
  /** Imperative instruction shown in the HUD before this step fires. */
  ask?: string
  headline?: string
  supporting?: string
  labels?: BeatLabel[]
  photoSrc?: string
  photoAlt?: string
  /** Override the beat's framing, e.g. for a portrait photo in a landscape run. */
  fit?: 'cover' | 'contain'
  caption?: string
  /** Index into the beat's zoom ladder. */
  zoomIndex?: number
  /** Reveal the big scale readout over the current zoom frame. */
  showScale?: boolean
  /** Big on-screen countdown; fires the scene's next phase on zero. */
  countFrom?: number
  /** Stage of a multi-part diagram. */
  diagramStage?: number
  comparePhase?: 'before' | 'after'
  scenePhase?: GlobePhase
  /** Hand the live crystal to the room. */
  hunt?: boolean
  /** Start the beat's video (used when a beat opens on a poster frame). */
  playVideo?: boolean
  /** Pulse the screen as this reveal lands. */
  flash?: boolean
}

export interface ZoomFrame {
  src: string
  /** True width of the frame in micrometres, read off the burned-in bar. */
  fieldUm: number
  alt: string
  /** Ken Burns focus point, percent of frame. */
  originX?: number
  originY?: number
}

export interface BeatDefinition {
  index: number
  act: ActId
  id: string
  title: string
  /** What the presenter says or does here. */
  cue: string
  /** Imperative audience-interaction instruction, if this beat has one. */
  ask?: string
  /** Pace budget in seconds; drives the HUD drift indicator. */
  seconds: number

  stage: StageKind
  scene?: SceneKind
  anchor?: AnchorPlacement

  headline?: string
  supporting?: string
  labels?: BeatLabel[]

  photoSrc?: string
  photoAlt?: string

  videoSrc?: string
  youtubeId?: string
  poster?: string
  /** `contain` for anything with burned-in text or a specimen that must not crop. */
  fit?: 'cover' | 'contain'
  /** Play with sound. Unmuting happens inside the presenter keypress. */
  audio?: boolean
  /** WebVTT track path. Optional — drop a file in and set this. */
  captionsSrc?: string
  /** Hold on the poster until a step sets playVideo. */
  holdPoster?: boolean

  zoom?: ZoomFrame[]
  zoomIndex?: number
  showScale?: boolean

  diagram?: 'rain-shadow'
  diagramStage?: number

  compare?: ComparePair
  comparePhase?: 'before' | 'after'

  scenePhase?: GlobePhase
  countFrom?: number
  hunt?: boolean

  steps?: RevealStep[]

  fallbackSrc?: string
  fallbackAlt?: string
}

/** Flattened state the overlay renders: beat base with steps 0..n applied. */
export interface BeatFrame {
  beat: BeatDefinition
  stepIndex: number
  headline?: string
  supporting?: string
  labels?: BeatLabel[]
  photoSrc?: string
  photoAlt?: string
  fit: 'cover' | 'contain'
  caption?: string
  zoomIndex: number
  showScale: boolean
  countFrom?: number
  diagramStage: number
  comparePhase: 'before' | 'after'
  scenePhase?: GlobePhase
  hunt: boolean
  playVideo: boolean
}

/**
 * Deterministic replay: base state plus every step up to and including
 * `stepIndex`. Stepping backwards re-renders rather than undoing.
 */
export function resolveFrame(beat: BeatDefinition, stepIndex: number): BeatFrame {
  const frame: BeatFrame = {
    beat,
    stepIndex,
    headline: beat.headline,
    supporting: beat.supporting,
    labels: beat.labels,
    photoSrc: beat.photoSrc,
    photoAlt: beat.photoAlt,
    fit: beat.fit ?? 'cover',
    caption: undefined,
    zoomIndex: beat.zoomIndex ?? 0,
    showScale: beat.showScale ?? false,
    countFrom: undefined,
    diagramStage: beat.diagramStage ?? 0,
    comparePhase: beat.comparePhase ?? 'before',
    scenePhase: beat.scenePhase,
    hunt: beat.hunt ?? false,
    playVideo: !beat.holdPoster,
  }

  const steps = beat.steps ?? []
  for (let i = 0; i <= stepIndex && i < steps.length; i++) {
    const step = steps[i]
    // Presence of the key, not its value, decides whether a step overrides —
    // so writing `headline: undefined` in a step clears the headline rather
    // than being silently ignored.
    const has = (k: keyof RevealStep) => Object.prototype.hasOwnProperty.call(step, k)

    if (has('headline')) frame.headline = step.headline
    if (has('supporting')) frame.supporting = step.supporting
    if (has('labels')) frame.labels = step.labels
    if (has('photoSrc')) frame.photoSrc = step.photoSrc
    if (has('photoAlt')) frame.photoAlt = step.photoAlt
    if (has('fit')) frame.fit = step.fit!
    if (has('caption')) frame.caption = step.caption
    if (has('zoomIndex')) frame.zoomIndex = step.zoomIndex!
    if (has('showScale')) frame.showScale = step.showScale!
    if (has('diagramStage')) frame.diagramStage = step.diagramStage!
    if (has('comparePhase')) frame.comparePhase = step.comparePhase!
    if (has('scenePhase')) frame.scenePhase = step.scenePhase
    if (has('hunt')) frame.hunt = step.hunt!
    if (has('playVideo')) frame.playVideo = step.playVideo!
    // Countdown only belongs to the step that fired it, never to later ones.
    frame.countFrom = i === stepIndex ? step.countFrom : undefined
  }

  return frame
}

export function stepCount(beat: BeatDefinition): number {
  return beat.steps?.length ?? 0
}

/**
 * What the presenter should do right now. `stepIndex` of -1 is the beat's
 * base state, before any reveal has fired.
 */
export function activeAsk(beat: BeatDefinition, stepIndex: number): string | undefined {
  if (stepIndex < 0) return beat.ask
  return beat.steps?.[stepIndex]?.ask
}
