import {
  ACTS,
  BEAT_COUNT,
  BEAT_START_SECONDS,
  BEATS,
  IMAGE_SOURCES,
  TALK_SECONDS,
  actStartIndex,
  activeAsk,
  resolveFrame,
  stepCount,
  type BeatDefinition,
  type BeatFrame,
  type ConstellationPhase,
  type GlobePhase,
  type SceneKind,
  type SolarPhase,
} from '../beats/catalog'
import { OverlayManager } from '../overlay/OverlayManager'
import { bindPresenterControls, type PresenterCommand } from '../controls/presenterControls'
import { startHaliteHero } from '../scene/halite/hero-halite.js'
import { startGlobeDive, type GlobeDiveHandle } from '../scene/GlobeDive'
import { startSolarSystem, type SolarSystemHandle } from '../scene/SolarSystem'
import {
  startConstellation,
  type ConstellationHandle,
} from '../scene/constellation/mountConstellation'
import { publicAsset } from '../lib/publicAsset'
import { isFullscreen, toggleFullscreen } from '../lib/fullscreen'

const CONSTELLATION_PHASES = new Set<string>([
  'peri',
  'sky',
  'reveal',
  'cabinets',
  'instrument',
  'turn',
  'dive',
])

type HeroHandle = {
  setVisible: (visible: boolean) => void
  setPaused: (paused: boolean) => void
  setPanMode: (on: boolean) => void
  setInside: (on: boolean) => void
  setPullBack: (on: boolean) => void
  setRendering: (on: boolean) => void
  dispose: () => void
}

/** Matches the canvas opacity transition in presentation.css. */
const SCENE_FADE_MS = 700

/**
 * Root coordinator.
 *
 * Holds two numbers — which beat, and how far into its reveal steps — and
 * routes three things off them: which WebGL scene renders, what the overlay
 * shows, and what the presenter HUD says.
 */
export class PresentationApp {
  private beatIndex = 0
  /** -1 is the beat's base state, before any reveal has fired. */
  private stepIndex = -1

  private hero: HeroHandle | null = null
  private globe: GlobeDiveHandle | null = null
  private solar: SolarSystemHandle | null = null
  private constellation: ConstellationHandle | null = null
  private hunting = false
  private readonly fadeOutTimers = new Map<SceneKind, number>()

  private readonly overlay: OverlayManager
  private readonly heroCanvas: HTMLCanvasElement
  private readonly globeCanvas: HTMLCanvasElement
  private readonly solarCanvas: HTMLCanvasElement
  private readonly constellationHost: HTMLElement

  private readonly hud: {
    clock: HTMLElement
    drift: HTMLElement
    beat: HTMLElement
    title: HTMLElement
    cue: HTMLElement
    ask: HTMLElement
    build: HTMLElement
    actKeys: HTMLElement
    beatSelect: HTMLSelectElement
    fullscreen: HTMLButtonElement
    root: HTMLElement
  }

  private unbindControls: (() => void) | null = null
  private sceneFailed = false

  private timerStart: number | null = null
  private timerPausedAt = 0
  private clockHandle: number | null = null
  /** Pending auto-fire for a reveal step that carries `autoMs`. */
  private autoAdvanceTimer: number | null = null

  constructor(
    heroCanvas: HTMLCanvasElement,
    globeCanvas: HTMLCanvasElement,
    solarCanvas: HTMLCanvasElement,
    constellationHost: HTMLElement,
  ) {
    this.heroCanvas = heroCanvas
    this.globeCanvas = globeCanvas
    this.solarCanvas = solarCanvas
    this.constellationHost = constellationHost
    this.hud = {
      clock: must('hud-clock'),
      drift: must('hud-drift'),
      beat: must('hud-beat'),
      title: must('hud-title'),
      cue: must('hud-cue'),
      ask: must('hud-ask'),
      build: must('hud-build'),
      actKeys: must('hud-act-keys'),
      beatSelect: must('hud-beat-select') as HTMLSelectElement,
      fullscreen: must('hud-fullscreen') as HTMLButtonElement,
      root: must('presenter-hud'),
    }
    this.hud.build.textContent = `build ${__BUILD_ID__}`
    this.buildJumpControls()

    this.hud.fullscreen.addEventListener('click', this.onFullscreenClick)
    document.addEventListener('fullscreenchange', this.paintFullscreenButton)
    document.addEventListener('webkitfullscreenchange', this.paintFullscreenButton)

    this.overlay = new OverlayManager()
    this.overlay.preloadVideos(BEATS.map((b) => b.videoSrc))
    this.unbindControls = bindPresenterControls((cmd) => this.onCommand(cmd))

    this.clockHandle = window.setInterval(() => this.paintClock(), 250)

    // A backgrounded tab freezes CSS transitions wherever they happened to be,
    // so if the presenter alt-tabs away mid-fade the stage can come back half
    // dissolved. Repaint the current position on return.
    document.addEventListener('visibilitychange', this.onVisibilityChange)

    // The cold open is DOM only, so put it up now rather than behind WebGL boot.
    this.goTo(0, -1)
    void this.boot()
  }

  /** A click is the gesture WebKit always accepts for a fullscreen request. */
  private readonly onFullscreenClick = () => {
    toggleFullscreen()
    // Keeps a stray Space or arrow from re-triggering the button instead of
    // advancing the talk.
    this.hud.fullscreen.blur()
  }

  private readonly paintFullscreenButton = () => {
    this.hud.fullscreen.textContent = isFullscreen() ? 'Exit full screen (F)' : 'Full screen (F)'
  }

  private readonly onVisibilityChange = () => {
    if (document.visibilityState !== 'visible') return
    this.goTo(this.beatIndex, this.stepIndex, { replayCues: false })
  }

  private async boot() {
    this.globe = startGlobeDive(this.globeCanvas, {
      fadeEl: document.getElementById('scene-fade') ?? undefined,
      onDepth: (m) => this.overlay.setDepth(m),
    })
    this.globe.setVisible(false)
    this.globe.setRendering(false)

    this.solar = startSolarSystem(this.solarCanvas)
    this.solar.setVisible(false)
    this.solar.setRendering(false)

    this.constellation = startConstellation(this.constellationHost, {
      onDiveComplete: () => this.onConstellationDiveComplete(),
    })
    this.constellation.setVisible(false)
    this.constellation.setRendering(false)

    try {
      this.hero = (await startHaliteHero(this.heroCanvas, {
        theatreUrl: publicAsset('/hero/halite-theatre.json'),
      })) as HeroHandle
      this.hero.setVisible(false)
      this.hero.setRendering(false)
    } catch (error) {
      console.error('[app] Halite hero failed', error)
      this.sceneFailed = true
      this.hero = null
    }

    this.overlay.preloadImages(IMAGE_SOURCES)

    // Route the scene for wherever the presenter has got to. Boot is slow enough
    // that they may already have moved, and snapping back to beat 1 loses them.
    this.goTo(this.beatIndex, this.stepIndex, { replayCues: false })
  }

  /** Drawer plunge finished — land on Name the Object without replaying cold open. */
  private onConstellationDiveComplete() {
    const claim = BEATS.findIndex((b) => b.id === 'the-claim')
    if (claim < 0) return
    this.goTo(claim, -1)
  }

  // ── Presenter intents ──────────────────────────────────────────────────

  private onCommand(command: PresenterCommand) {
    switch (command.type) {
      case 'next':
        this.advance(1)
        break
      case 'prev':
        this.advance(-1)
        break
      case 'jump-act':
        this.goTo(actStartIndex(command.actKey), -1)
        break
      case 'toggle-hud':
        this.hud.root.classList.toggle('is-hidden')
        break
      case 'toggle-timer':
        this.toggleTimer()
        break
      case 'reset-timer':
        this.timerStart = null
        this.timerPausedAt = 0
        this.paintClock()
        break
      case 'toggle-fullscreen':
        toggleFullscreen()
        break
    }
  }

  /**
   * One press. Reveal steps inside the current beat are consumed before the
   * beat itself moves, in both directions.
   */
  private advance(direction: 1 | -1) {
    const beat = BEATS[this.beatIndex]
    const last = stepCount(beat) - 1

    if (direction === 1) {
      if (this.stepIndex < last) {
        this.goTo(this.beatIndex, this.stepIndex + 1)
        return
      }
      if (this.beatIndex < BEAT_COUNT - 1) this.goTo(this.beatIndex + 1, -1)
      return
    }

    if (this.stepIndex > -1) {
      this.goTo(this.beatIndex, this.stepIndex - 1)
      return
    }
    if (this.beatIndex > 0) {
      const prev = BEATS[this.beatIndex - 1]
      this.goTo(this.beatIndex - 1, stepCount(prev) - 1)
    }
  }

  private goTo(beatIndex: number, stepIndex: number, options: { replayCues?: boolean } = {}) {
    if (beatIndex < 0 || beatIndex >= BEAT_COUNT) return
    const samePlace = this.beatIndex === beatIndex && this.stepIndex === stepIndex
    const replayCues = options.replayCues ?? true
    // A silent same-place repaint (tab return) must leave a running wait alone.
    if (!samePlace || replayCues) this.clearAutoAdvance()

    this.beatIndex = beatIndex
    this.stepIndex = stepIndex

    const beat = BEATS[beatIndex]
    const frame = resolveFrame(beat, stepIndex)

    // First advance out of the cold open starts the clock, so the presenter
    // never has to remember to press anything extra.
    if (this.timerStart === null && (beatIndex > 0 || stepIndex > -1)) this.startTimer()

    this.routeScene(frame)
    this.paintOverlay(frame, replayCues)
    this.paintHud(beat, frame)
    if (!samePlace || replayCues) this.scheduleAutoAdvance(beat, stepIndex)
  }

  /** Cancel a waiting auto-reveal so a press or jump does not double-fire. */
  private clearAutoAdvance() {
    if (this.autoAdvanceTimer === null) return
    clearTimeout(this.autoAdvanceTimer)
    this.autoAdvanceTimer = null
  }

  /** If the next reveal step asks to fire itself, wait and then advance once. */
  private scheduleAutoAdvance(beat: BeatDefinition, stepIndex: number) {
    const next = beat.steps?.[stepIndex + 1]
    const delay = next?.autoMs
    if (delay === undefined) return

    const targetBeat = this.beatIndex
    const targetStep = stepIndex + 1
    this.autoAdvanceTimer = window.setTimeout(() => {
      this.autoAdvanceTimer = null
      if (this.beatIndex !== targetBeat || this.stepIndex !== stepIndex) return
      this.goTo(targetBeat, targetStep)
    }, delay)
  }

  // ── Scene routing ──────────────────────────────────────────────────────

  private routeScene(frame: BeatFrame) {
    const wanted = this.sceneFailed ? 'none' : frame.scene

    document.body.classList.toggle('scene-hero', wanted === 'hero')
    document.body.classList.toggle('scene-globe', wanted === 'globe')
    document.body.classList.toggle('scene-solar', wanted === 'solar')
    document.body.classList.toggle('scene-constellation', wanted === 'constellation')

    const heroOn = wanted === 'hero'
    // Hand the crystal back before the frames stop, so the scripted camera has
    // a chance to pick up where the room left off.
    if (!heroOn) {
      this.setHunting(false)
      this.hero?.setInside(false)
    }
    this.hero?.setVisible(heroOn)
    this.holdThroughFade('hero', heroOn, (on) => this.hero?.setRendering(on))

    const globeOn = wanted === 'globe'
    this.globe?.setVisible(globeOn)
    this.globe?.setRendering(globeOn)
    if (!globeOn) this.overlay.setDepth(null)

    const solarOn = wanted === 'solar'
    // Sized off the globe's live altitude rather than where its pull-back was
    // meant to finish: the press can land while it is still easing out.
    if (solarOn) this.solar?.matchEarth(this.globe?.cameraDistance() ?? 14)
    this.solar?.setVisible(solarOn)
    this.holdThroughFade('solar', solarOn, (on) => this.solar?.setRendering(on))

    const constellationOn = wanted === 'constellation'
    this.constellation?.setVisible(constellationOn)
    this.holdThroughFade('constellation', constellationOn, (on) =>
      this.constellation?.setRendering(on),
    )

    if (globeOn && frame.scenePhase) {
      // A countdown step holds its scene change until the room reaches zero.
      if (frame.countFrom === undefined) this.globe?.setPhase(frame.scenePhase as GlobePhase)
    }
    if (solarOn && frame.scenePhase) this.solar?.setPhase(frame.scenePhase as SolarPhase)
    if (
      constellationOn &&
      frame.scenePhase &&
      CONSTELLATION_PHASES.has(frame.scenePhase)
    ) {
      this.constellation?.setPhase(frame.scenePhase as ConstellationPhase)
    }

    if (heroOn) {
      // Hunting first: it pauses the scripted camera, and the inside hold has
      // to see that it is already parked before deciding whether to cut.
      this.setHunting(frame.hunt)
      this.hero?.setInside(frame.inside)
      this.hero?.setPullBack(frame.pullBack)
    }

    // Leaving the globe rewinds it. Without this a step that hands over to
    // another scene and steps back again finds the globe already arrived, and
    // the move plays once per page load instead of once per press.
    if (!globeOn) this.globe?.setPhase('world')
  }

  /**
   * The scene canvases cross-dissolve in CSS, so a scene that has just been
   * routed away from has to keep drawing until it is invisible. Cutting its
   * frames on the keypress freezes the picture halfway through its own fade,
   * which is exactly where the closing pull-back needs both scenes moving.
   */
  private holdThroughFade(scene: SceneKind, on: boolean, apply: (on: boolean) => void) {
    const pending = this.fadeOutTimers.get(scene)
    if (pending !== undefined) {
      clearTimeout(pending)
      this.fadeOutTimers.delete(scene)
    }
    if (on) {
      apply(true)
      return
    }
    this.fadeOutTimers.set(
      scene,
      window.setTimeout(() => {
        this.fadeOutTimers.delete(scene)
        apply(false)
      }, SCENE_FADE_MS)
    )
  }

  /**
   * Hand the live crystal to the room: stop the scripted camera, let the
   * focus rack and drag-orbit take over, and scale the controls up so they
   * are usable from the stage.
   */
  private setHunting(on: boolean) {
    if (on === this.hunting) return
    this.hunting = on
    document.body.classList.toggle('is-hunting', on)
    this.hero?.setPaused(on)
    this.heroCanvas.style.pointerEvents = on ? 'auto' : 'none'
  }

  // ── Overlay + interaction ──────────────────────────────────────────────

  private paintOverlay(frame: BeatFrame, replayCues: boolean) {
    this.overlay.render(frame)

    if (!replayCues) {
      // A repaint after the tab comes back must not restart the countdown,
      // so jump straight to where it would have left the scene.
      if (frame.countFrom !== undefined && frame.scenePhase) {
        this.globe?.setPhase(frame.scenePhase as GlobePhase)
      }
      return
    }

    // Countdown runs after render, because render cancels any live cue.
    if (frame.countFrom !== undefined) {
      const phase = frame.scenePhase
      this.overlay.cue.countdown(frame.countFrom, () => {
        this.overlay.cue.flash()
        if (phase) this.globe?.setPhase(phase as GlobePhase)
      })
    }

    if (frame.beat.steps?.[frame.stepIndex]?.flash) this.overlay.cue.flash()
  }

  // ── Presenter HUD ──────────────────────────────────────────────────────

  /** Act chips + beat menu for rehearsal jumps. Built once from the catalog. */
  private buildJumpControls() {
    for (const act of ACTS) {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = String(act.key)
      button.title = `Act ${act.key} · ${act.title}`
      button.dataset.actKey = String(act.key)
      button.addEventListener('click', (event) => {
        event.preventDefault()
        this.goTo(actStartIndex(act.key), -1)
      })
      this.hud.actKeys.append(button)
    }

    for (const act of ACTS) {
      const group = document.createElement('optgroup')
      group.label = `${act.key} · ${act.title}`
      for (const beat of BEATS.filter((b) => b.act === act.id)) {
        const option = document.createElement('option')
        option.value = String(beat.index)
        option.textContent = `${beat.index + 1}. ${beat.title}`
        group.append(option)
      }
      this.hud.beatSelect.append(group)
    }

    this.hud.beatSelect.addEventListener('change', () => {
      const index = Number(this.hud.beatSelect.value)
      if (!Number.isFinite(index)) return
      this.goTo(index, -1)
      this.hud.beatSelect.blur()
    })
  }

  private paintHud(beat: BeatDefinition, frame: BeatFrame) {
    const act = ACTS.find((a) => a.id === beat.act)
    const steps = stepCount(beat)
    const stepNote = steps
      ? ` · reveal ${this.stepIndex + 1}/${steps}${
          frame.stepIndex >= 0 ? ` (${beat.steps![frame.stepIndex].label})` : ''
        }`
      : ''

    this.hud.beat.textContent = `Act ${act?.key ?? '?'} ${act?.title ?? ''} · beat ${
      beat.index + 1
    } of ${BEAT_COUNT}${stepNote}`
    this.hud.title.textContent = beat.title
    this.hud.cue.textContent = beat.cue

    const ask = activeAsk(beat, this.stepIndex)
    this.hud.ask.textContent = ask ?? ''
    this.hud.ask.hidden = !ask

    this.hud.beatSelect.value = String(beat.index)
    for (const button of this.hud.actKeys.querySelectorAll('button')) {
      button.classList.toggle('is-current', button.dataset.actKey === String(act?.key))
    }

    this.paintClock()
  }

  // ── Clock + pace ───────────────────────────────────────────────────────

  private startTimer() {
    this.timerStart = performance.now() - this.timerPausedAt
  }

  private toggleTimer() {
    if (this.timerStart === null) {
      this.startTimer()
      return
    }
    this.timerPausedAt = performance.now() - this.timerStart
    this.timerStart = null
  }

  private elapsedSeconds(): number {
    if (this.timerStart === null) return this.timerPausedAt / 1000
    return (performance.now() - this.timerStart) / 1000
  }

  private paintClock() {
    const elapsed = this.elapsedSeconds()
    this.hud.clock.textContent = `${formatClock(elapsed)} / ${formatClock(TALK_SECONDS)}`

    if (this.timerStart === null && this.timerPausedAt === 0) {
      this.hud.drift.textContent = 'timer idle'
      this.hud.drift.className = 'hud-drift is-idle'
      return
    }

    // Compare against where this beat should have started.
    const target = BEAT_START_SECONDS[this.beatIndex]
    const drift = Math.round(elapsed - target)
    if (Math.abs(drift) <= 15) {
      this.hud.drift.textContent = 'on pace'
      this.hud.drift.className = 'hud-drift'
      return
    }
    const behind = drift > 0
    this.hud.drift.textContent = `${formatClock(Math.abs(drift))} ${behind ? 'behind' : 'ahead'}`
    this.hud.drift.className = `hud-drift ${behind ? 'is-behind' : 'is-ahead'}`
  }

  dispose() {
    this.unbindControls?.()
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    this.hud.fullscreen.removeEventListener('click', this.onFullscreenClick)
    document.removeEventListener('fullscreenchange', this.paintFullscreenButton)
    document.removeEventListener('webkitfullscreenchange', this.paintFullscreenButton)
    if (this.clockHandle !== null) clearInterval(this.clockHandle)
    this.clearAutoAdvance()
    for (const timer of this.fadeOutTimers.values()) clearTimeout(timer)
    this.fadeOutTimers.clear()
    this.hero?.dispose()
    this.globe?.dispose()
    this.solar?.dispose()
    this.constellation?.dispose()
  }
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function must(id: string): HTMLElement {
  const node = document.getElementById(id)
  if (!node) throw new Error(`Missing #${id}`)
  return node
}
