import {
  ACTS,
  BEAT_COUNT,
  BEAT_START_SECONDS,
  BEATS,
  TALK_SECONDS,
  actStartIndex,
  activeAsk,
  resolveFrame,
  stepCount,
  type BeatDefinition,
  type BeatFrame,
  type GlobePhase,
} from '../beats/catalog'
import { OverlayManager } from '../overlay/OverlayManager'
import { bindPresenterControls, type PresenterCommand } from '../controls/presenterControls'
import { startHaliteHero } from '../scene/halite/hero-halite.js'
import { startGlobeDive, type GlobeDiveHandle } from '../scene/GlobeDive'
import { publicAsset } from '../lib/publicAsset'

type HeroHandle = {
  setVisible: (visible: boolean) => void
  setPaused: (paused: boolean) => void
  setPanMode: (on: boolean) => void
  setRendering: (on: boolean) => void
  dispose: () => void
}

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
  private hunting = false

  private readonly overlay: OverlayManager
  private readonly heroCanvas: HTMLCanvasElement
  private readonly globeCanvas: HTMLCanvasElement

  private readonly hud: {
    clock: HTMLElement
    drift: HTMLElement
    beat: HTMLElement
    title: HTMLElement
    cue: HTMLElement
    ask: HTMLElement
    root: HTMLElement
  }

  private unbindControls: (() => void) | null = null
  private sceneFailed = false
  private booted = false

  private timerStart: number | null = null
  private timerPausedAt = 0
  private clockHandle: number | null = null

  constructor(heroCanvas: HTMLCanvasElement, globeCanvas: HTMLCanvasElement) {
    this.heroCanvas = heroCanvas
    this.globeCanvas = globeCanvas
    this.hud = {
      clock: must('hud-clock'),
      drift: must('hud-drift'),
      beat: must('hud-beat'),
      title: must('hud-title'),
      cue: must('hud-cue'),
      ask: must('hud-ask'),
      root: must('presenter-hud'),
    }

    this.overlay = new OverlayManager()
    this.overlay.preloadVideos(BEATS.map((b) => b.videoSrc))
    this.unbindControls = bindPresenterControls((cmd) => this.onCommand(cmd))

    this.clockHandle = window.setInterval(() => this.paintClock(), 250)

    // A backgrounded tab freezes CSS transitions wherever they happened to be,
    // so if the presenter alt-tabs away mid-fade the stage can come back half
    // dissolved. Repaint the current position on return.
    document.addEventListener('visibilitychange', this.onVisibilityChange)

    void this.boot()
  }

  private readonly onVisibilityChange = () => {
    if (document.visibilityState !== 'visible' || !this.booted) return
    this.goTo(this.beatIndex, this.stepIndex, { replayCues: false })
  }

  private async boot() {
    this.globe = startGlobeDive(this.globeCanvas, {
      fadeEl: document.getElementById('scene-fade') ?? undefined,
      onDepth: (m) => this.overlay.setDepth(m),
    })
    this.globe.setVisible(false)
    this.globe.setRendering(false)

    try {
      this.hero = (await startHaliteHero(this.heroCanvas, {
        theatreUrl: publicAsset('/hero/halite-theatre.json'),
      })) as HeroHandle
      this.hero.setVisible(false)
      this.hero.setRendering(false)
      this.booted = true
    } catch (error) {
      console.error('[app] Halite hero failed', error)
      this.sceneFailed = true
      this.hero = null
    }

    this.goTo(0, -1)
  }

  // ── Presenter intents ──────────────────────────────────────────────────

  private onCommand(command: PresenterCommand) {
    if (!this.booted && !this.sceneFailed) return

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
    const beatChanged = beatIndex !== this.beatIndex
    this.beatIndex = beatIndex
    this.stepIndex = stepIndex

    const beat = BEATS[beatIndex]
    const frame = resolveFrame(beat, stepIndex)

    // First advance out of the cold open starts the clock, so the presenter
    // never has to remember to press anything extra.
    if (this.timerStart === null && (beatIndex > 0 || stepIndex > -1)) this.startTimer()

    this.routeScene(beat, frame, beatChanged)
    this.paintOverlay(frame, options.replayCues ?? true)
    this.paintHud(beat, frame)
  }

  // ── Scene routing ──────────────────────────────────────────────────────

  private routeScene(beat: BeatDefinition, frame: BeatFrame, beatChanged: boolean) {
    const wanted = this.sceneFailed ? 'none' : beat.scene ?? 'none'

    document.body.classList.toggle('scene-hero', wanted === 'hero')
    document.body.classList.toggle('scene-globe', wanted === 'globe')

    const heroOn = wanted === 'hero'
    this.hero?.setVisible(heroOn)
    this.hero?.setRendering(heroOn)
    if (!heroOn) this.setHunting(false)

    const globeOn = wanted === 'globe'
    this.globe?.setVisible(globeOn)
    this.globe?.setRendering(globeOn)
    if (!globeOn) this.overlay.setDepth(null)

    if (globeOn && frame.scenePhase) {
      // A countdown step holds its scene change until the room reaches zero.
      if (frame.countFrom === undefined) this.globe?.setPhase(frame.scenePhase)
    }

    if (heroOn) this.setHunting(frame.hunt)

    if (beatChanged && !globeOn) this.globe?.setPhase('world')
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
    if (this.clockHandle !== null) clearInterval(this.clockHandle)
    this.hero?.dispose()
    this.globe?.dispose()
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
