import { BEATS, BEAT_COUNT, type BeatDefinition } from '../beats/catalog'
import { OverlayManager } from '../overlay/OverlayManager'
import { bindPresenterControls, type PresenterCommand } from '../controls/presenterControls'
import { startHaliteHero } from '../scene/halite/hero-halite.js'

type HeroHandle = {
  setVisible: (visible: boolean) => void
  setPaused: (paused: boolean) => void
  dispose: () => void
}

/**
 * Root coordinator: beat index + next/prev/jump.
 * 3D layer = MineralSciences halite hero (Theatre zoom loop).
 * Overlay layer = DOM photos / video / YouTube / labels.
 */
export class PresentationApp {
  private beatIndex = 0
  private hero: HeroHandle | null = null
  private readonly overlay: OverlayManager
  private readonly canvas: HTMLCanvasElement
  private readonly hudBeat: HTMLElement
  private readonly hudTitle: HTMLElement
  private readonly hudRoot: HTMLElement
  private unbindControls: (() => void) | null = null
  private sceneFailed = false
  private booted = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.hudBeat = must('hud-beat')
    this.hudTitle = must('hud-title')
    this.hudRoot = must('presenter-hud')
    this.overlay = new OverlayManager()
    this.overlay.preloadVideos(BEATS.map((b) => b.videoSrc))
    this.unbindControls = bindPresenterControls((cmd) => this.onCommand(cmd))
    void this.bootHero()
  }

  private async bootHero() {
    try {
      this.hero = (await startHaliteHero(this.canvas, {
        theatreUrl: '/hero/halite-theatre.json',
      })) as HeroHandle
      this.booted = true
    } catch (error) {
      console.error('[app] Halite hero failed — static fallbacks only', error)
      this.sceneFailed = true
      this.hero = null
    }
    this.goToBeat(0)
  }

  private onCommand(command: PresenterCommand) {
    if (!this.booted && !this.sceneFailed) return
    switch (command.type) {
      case 'next':
        this.goToBeat(Math.min(this.beatIndex + 1, BEAT_COUNT - 1))
        break
      case 'prev':
        this.goToBeat(Math.max(this.beatIndex - 1, 0))
        break
      case 'jump':
        this.goToBeat(command.index)
        break
      case 'toggle-hud':
        this.hudRoot.classList.toggle('is-hidden')
        break
      case 'force-fallback':
        this.sceneFailed = true
        this.hero?.setVisible(false)
        this.overlay.enterDegradedMode(BEATS[this.beatIndex])
        break
    }
  }

  goToBeat(index: number) {
    if (index < 0 || index >= BEAT_COUNT) return
    this.beatIndex = index
    const beat = BEATS[index]
    this.updateHud(beat)
    this.applySceneForBeat(beat)

    const needsHeroOnly =
      Boolean(beat.showHero) && !beat.hideScene && !beat.photoSrc && !beat.videoSrc && !beat.youtubeId

    if (this.sceneFailed && needsHeroOnly) {
      this.overlay.enterDegradedMode(beat)
    } else {
      this.overlay.clearDegradedMode()
      this.overlay.showBeat(beat)
    }
  }

  private applySceneForBeat(beat: BeatDefinition) {
    if (this.sceneFailed || !this.hero) {
      this.hero?.setVisible(false)
      return
    }

    this.overlay.clearDegradedMode()
    const show = Boolean(beat.showHero) && !beat.hideScene
    this.hero.setVisible(show)

    const canvas = this.canvas
    if (beat.insetHero && show) {
      canvas.style.zIndex = '3'
      canvas.style.clipPath = 'inset(58% 4% 4% 68% round 4px)'
    } else {
      canvas.style.zIndex = '1'
      canvas.style.clipPath = 'none'
    }
  }

  private updateHud(beat: BeatDefinition) {
    this.hudBeat.textContent = `Beat ${beat.index + 1} of ${BEAT_COUNT}`
    this.hudTitle.textContent = `${beat.title} — ${beat.cue}`
  }

  dispose() {
    this.unbindControls?.()
    this.hero?.dispose()
  }
}

function must(id: string): HTMLElement {
  const node = document.getElementById(id)
  if (!node) throw new Error(`Missing #${id}`)
  return node
}
