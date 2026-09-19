export type BeatId =
  | 'cold-open'
  | 'team'
  | 'surface'
  | 'descent'
  | 'salt-ceiling'
  | 'closed-section'
  | 'darkness'
  | 'lake'
  | 'reveal'
  | 'explainer'
  | 'bridge'
  | 'so-what'
  | 'send-off'

export interface BeatLabel {
  text: string
  x: number
  y: number
  delayMs?: number
}

export interface BeatDefinition {
  index: number
  id: BeatId
  title: string
  cue: string
  headline?: string
  supporting?: string
  labels?: BeatLabel[]
  photoSrc?: string
  photoAlt?: string
  /** Local bundled video (optional rehearsal fallback) */
  videoSrc?: string
  /** YouTube id when you upload the talk clips */
  youtubeId?: string
  captions?: string[]
  fallbackSrc?: string
  fallbackAlt?: string
  hideScene?: boolean
  insetHero?: boolean
  /** Show the live MineralSciences halite hero */
  showHero?: boolean
}

/**
 * Boulby / "What Woke Up" stage sequence.
 * https://aaroncelestian.substack.com/p/what-woke-up
 *
 * Movies: drop YouTube ids into `youtubeId` when ready; local mp4 paths remain as rehearsal fallbacks.
 */
export const BEATS: BeatDefinition[] = [
  {
    index: 0,
    id: 'cold-open',
    title: 'Cold Open',
    cue: 'Show of hands — what’s alive in here?',
    showHero: true,
  },
  {
    index: 1,
    id: 'team',
    title: 'The Team',
    cue: 'NASA Origins & Habitability — four of us',
    headline: 'A NASA team.',
    supporting: 'Looking for life where nobody had found it.',
    photoSrc: '/assets/images/boulby-team-surface.jpg',
    photoAlt: 'Four researchers in orange Boulby uniforms at the surface',
    fallbackSrc: '/assets/images/boulby-team-surface.jpg',
    hideScene: true,
  },
  {
    index: 2,
    id: 'surface',
    title: 'Boulby Surface',
    cue: 'Six hundred miles of tunnels under the North Sea',
    headline: 'Boulby Mine',
    supporting: 'A mile underground. Beneath the North Sea.',
    photoSrc: '/assets/images/boulby-surface.jpg',
    photoAlt: 'Surface works of Boulby Mine in the English countryside',
    fallbackSrc: '/assets/images/boulby-surface.jpg',
    hideScene: true,
  },
  {
    index: 3,
    id: 'descent',
    title: 'Descent',
    cue: 'Into the working mine — then past the steel doors',
    headline: 'Down.',
    supporting: 'Past locked doors. Into air that barely breathes.',
    photoSrc: '/assets/images/boulby-tunnel.jpg',
    photoAlt: 'Researchers walking a lit tunnel deep in Boulby Mine',
    fallbackSrc: '/assets/fallbacks/field.jpg',
    hideScene: true,
  },
  {
    index: 4,
    id: 'salt-ceiling',
    title: 'Salt World',
    cue: 'Halite growing from the ceiling — this place is salt',
    headline: 'Salt grows here.',
    supporting: 'Even the ceiling is crystal.',
    photoSrc: '/assets/images/boulby-stalactites.jpg',
    photoAlt: 'Halite soda-straw stalactites hanging from the mine ceiling',
    fallbackSrc: '/assets/images/boulby-stalactites.jpg',
    hideScene: true,
  },
  {
    index: 5,
    id: 'closed-section',
    title: 'Closed Section',
    cue: 'Caved tunnels — the lake was dissolving the walls',
    headline: 'Closed for a reason.',
    supporting: 'Ancient water was eating the rock.',
    photoSrc: '/assets/images/boulby-wood-cribs.jpg',
    photoAlt: 'Wooden crib supports and mesh in a damaged mine tunnel',
    fallbackSrc: '/assets/images/boulby-wood-cribs.jpg',
    hideScene: true,
  },
  {
    index: 6,
    id: 'darkness',
    title: 'Darkness',
    cue: 'Headlamps off — you can hear the Earth move',
    headline: 'Total dark.',
    supporting: 'Close your eyes. Open them. No difference.',
    photoSrc: '/assets/images/boulby-aaron-scott.jpg',
    photoAlt: 'Two researchers with headlamps in a dark salt tunnel',
    fallbackSrc: '/assets/images/boulby-darkness.jpg',
    hideScene: true,
  },
  {
    index: 7,
    id: 'lake',
    title: 'The Lake',
    cue: 'Brine sealed ~250 million years — fill the bottles',
    headline: 'An underground lake.',
    supporting: 'Water sealed away since before the dinosaurs.',
    photoSrc: '/assets/images/boulby-green-chamber.jpg',
    photoAlt: 'Green-lit chamber deep in the mine near research gear',
    videoSrc: '/assets/video/brine-lake.mp4',
    // youtubeId: 'PASTE_ID',
    captions: [
      'Sealed brine. Hundreds of millions of years old.',
      'We filled our bottles. Then we got out.',
    ],
    fallbackSrc: '/assets/images/boulby-brine-bottle.jpg',
    hideScene: true,
  },
  {
    index: 8,
    id: 'reveal',
    title: 'The Reveal',
    cue: 'Shamu / the movie — let it land',
    videoSrc: '/assets/video/bacteria.mp4',
    // youtubeId: 'PASTE_ID',
    captions: [
      'Something is moving inside the salt.',
      'Tiny life. Still alive.',
    ],
    fallbackSrc: '/assets/fallbacks/bacteria.jpg',
    fallbackAlt: 'Fluid inclusions in halite under the microscope',
    hideScene: true,
  },
  {
    index: 9,
    id: 'explainer',
    title: 'Explainer',
    cue: 'Dive the hero — brine pocket + salt-loving microbes',
    labels: [
      { text: 'salt-loving microbe', x: 66, y: 28, delayMs: 500 },
      { text: 'ancient trapped water', x: 16, y: 58, delayMs: 1200 },
    ],
    fallbackSrc: '/assets/fallbacks/halite.jpg',
    showHero: true,
  },
  {
    index: 10,
    id: 'bridge',
    title: 'The Bridge',
    cue: 'Heat · tides · radiation — Europa / Enceladus',
    headline: 'Life hides in salt here.',
    supporting: 'So we look for it in salt out there.',
    photoSrc: '/assets/images/boulby-darkness.jpg',
    photoAlt: 'Absolute darkness broken only by headlamps',
    fallbackSrc: '/assets/fallbacks/mars.jpg',
    hideScene: true,
  },
  {
    index: 11,
    id: 'so-what',
    title: 'So-What',
    cue: 'DNA new to science — you hold the room',
    headline: 'One crystal.',
    supporting: 'One thread of life, 250 million years long.',
    photoSrc: '/assets/images/boulby-halite-lab.jpg',
    photoAlt: 'Hand holding salt in front of the Boulby Underground Laboratory sign',
    fallbackSrc: '/assets/fallbacks/collection.jpg',
    showHero: true,
    insetHero: true,
  },
  {
    index: 12,
    id: 'send-off',
    title: 'Send-off',
    cue: 'Thank you → moderated Q&A',
    headline: '35 million specimens.',
    supporting: 'Each one still has a story.',
    photoSrc: '/assets/images/hopper-crystal.jpg',
    photoAlt: 'Hopper-grown salt crystal with fluid inclusions',
    fallbackSrc: '/assets/fallbacks/halite.jpg',
    showHero: true,
  },
]

export const BEAT_COUNT = BEATS.length
