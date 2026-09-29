import { ANCHOR_ALT_TEXT, ANCHOR_SRC } from '../beats/catalog'
import type { BeatDefinition, BeatFrame } from '../beats/types'
import { AnchorLayer } from './AnchorLayer'
import { CompareLayer } from './CompareLayer'
import { InteractionCue } from './InteractionCue'
import { RainShadowDiagram } from './RainShadowDiagram'
import { ZoomStack } from './ZoomStack'
import { setLayerVisible } from './layerVisibility'

/**
 * The DOM half of the stage. Takes a resolved `BeatFrame` — the beat's base
 * state with its reveal steps already folded in — and makes the screen match
 * it. Nothing here decides what comes next; that is the app's job.
 */
export class OverlayManager {
  readonly anchor: AnchorLayer
  readonly cue: InteractionCue

  private readonly copyEl: HTMLElement
  private readonly titleEl: HTMLElement
  private readonly labelsEl: HTMLElement
  private readonly photoLayer: HTMLElement
  private readonly photoImg: HTMLImageElement
  private readonly videoLayer: HTMLElement
  private readonly video: HTMLVideoElement
  private readonly youtubeFrame: HTMLElement
  private readonly captionsEl: HTMLElement
  private readonly depthEl: HTMLElement
  private readonly depthValue: HTMLElement
  private readonly zoom: ZoomStack
  private readonly compare: CompareLayer
  private readonly diagram: RainShadowDiagram

  private labelTimers: number[] = []
  /** Bumped on every render, so work that had to await can tell it is stale. */
  private renderToken = 0
  private currentVideoSrc: string | null = null
  private copyTimer: number | null = null
  private copyKey = ''
  private copyShown = false
  private titleKey = ''
  private titleShown = false

  constructor() {
    this.copyEl = el('beat-copy')
    this.titleEl = el('title-card')
    this.labelsEl = el('beat-labels')
    this.photoLayer = el('photo-layer')
    this.photoImg = el('photo-image') as HTMLImageElement
    this.videoLayer = el('video-layer')
    this.video = el('beat-video') as HTMLVideoElement
    this.youtubeFrame = el('youtube-frame')
    this.captionsEl = el('video-captions')
    this.depthEl = el('depth-readout')
    this.depthValue = this.depthEl.querySelector('.depth-value') as HTMLElement

    this.anchor = new AnchorLayer(el('anchor-layer'), ANCHOR_SRC, ANCHOR_ALT_TEXT)
    this.zoom = new ZoomStack(el('zoom-layer'))
    this.compare = new CompareLayer(el('compare-layer'))
    this.diagram = new RainShadowDiagram(el('diagram-layer'))
    this.cue = new InteractionCue(el('countdown-layer'), el('reveal-flash'))
  }

  /** Warm every local clip at boot so nothing stalls at the emotional peak. */
  preloadVideos(srcs: Array<string | undefined>) {
    const unique = [...new Set(srcs.filter((s): s is string => Boolean(s)))]
    for (const src of unique) {
      const probe = document.createElement('video')
      probe.preload = 'auto'
      probe.muted = true
      probe.src = src
      probe.load()
    }
  }

  /**
   * Same for the stills. A layer is shown as soon as its `src` is set, so a
   * picture fetched on the keypress that needs it shows as an empty stage
   * until it arrives — which is exactly what a fast advance does.
   */
  preloadImages(srcs: Array<string | undefined>) {
    for (const src of new Set(srcs.filter((s): s is string => Boolean(s)))) {
      const probe = new Image()
      probe.decoding = 'async'
      probe.src = src
    }
  }

  render(frame: BeatFrame) {
    const { beat } = frame
    this.clearTransient()
    const token = ++this.renderToken

    const videoActive = Boolean(beat.videoSrc || beat.youtubeId) && frame.playVideo
    const stage = beat.stage

    this.anchor.set(beat.anchor ?? 'hidden', beat.fit ?? 'contain')

    this.setPhoto(frame, stage === 'photo' && !videoActive)
    this.setZoom(frame, stage === 'zoom')
    this.setDiagram(frame, stage === 'diagram')
    this.setCompare(frame, stage === 'compare')
    void this.setVideo(frame, videoActive, token)

    this.setTitleCard(frame)
    this.setCopy(frame)
    this.setLabels(frame)
  }

  // ── Layers ────────────────────────────────────────────────────────────

  private setTitleCard(frame: BeatFrame) {
    const card = frame.titleCard
    if (!card) {
      this.titleKey = ''
      this.titleShown = false
      this.titleEl.hidden = true
      this.titleEl.classList.remove('is-visible')
      this.titleEl.innerHTML = ''
      return
    }

    const eyebrow = card.eyebrow
      ? `<span class="title-eyebrow">${escapeHtml(card.eyebrow)}</span>`
      : ''
    const html = `${eyebrow}<span class="title-name">${escapeHtml(card.title)}</span><span class="title-byline">${escapeHtml(card.byline)}</span>`

    this.titleEl.hidden = false
    this.titleEl.innerHTML = html

    // Same contract as the copy line: a repaint of the plate already on
    // screen must not replay its fade.
    if (html === this.titleKey) {
      if (this.titleShown) this.titleEl.classList.add('is-visible')
      return
    }

    this.titleKey = html
    this.titleShown = false
    this.titleEl.classList.remove('is-visible')
    requestAnimationFrame(() => {
      this.titleShown = true
      this.titleEl.classList.add('is-visible')
    })
  }

  private setCopy(frame: BeatFrame) {
    if (!frame.headline) {
      this.clearCopyTimer()
      this.copyKey = ''
      this.copyShown = false
      this.copyEl.hidden = true
      this.copyEl.classList.remove('is-visible')
      this.copyEl.innerHTML = ''
      return
    }

    const support = frame.supporting
      ? `<span class="supporting">${escapeHtml(frame.supporting)}</span>`
      : ''
    const html = `${escapeHtml(frame.headline)}${support}`
    const delay = frame.copyDelayMs ?? 0
    const key = `${delay}\0${html}`

    this.copyEl.hidden = false
    this.copyEl.innerHTML = html

    // A repaint of the line already on screen must not restart the wait.
    if (key === this.copyKey) {
      if (this.copyShown) this.copyEl.classList.add('is-visible')
      return
    }

    this.clearCopyTimer()
    this.copyKey = key
    this.copyShown = false
    this.copyEl.classList.remove('is-visible')

    const show = () => {
      this.copyShown = true
      this.copyTimer = null
      this.copyEl.classList.add('is-visible')
    }
    if (delay > 0) {
      this.copyTimer = window.setTimeout(show, delay)
      return
    }
    requestAnimationFrame(show)
  }

  private clearCopyTimer() {
    if (this.copyTimer === null) return
    window.clearTimeout(this.copyTimer)
    this.copyTimer = null
  }

  private setLabels(frame: BeatFrame) {
    this.labelsEl.innerHTML = ''
    if (!frame.labels?.length) {
      this.labelsEl.hidden = true
      return
    }

    this.labelsEl.hidden = false
    for (const label of frame.labels) {
      const node = document.createElement('div')
      node.className = 'beat-label'
      node.textContent = label.text
      node.style.left = `${label.x}%`
      node.style.top = `${label.y}%`
      this.labelsEl.appendChild(node)
      this.labelTimers.push(
        window.setTimeout(() => node.classList.add('is-visible'), label.delayMs ?? 0)
      )
    }
  }

  private setPhoto(frame: BeatFrame, active: boolean) {
    if (!active || !frame.photoSrc) {
      setLayerVisible(this.photoLayer, false)
      return
    }

    this.photoLayer.dataset.fit = frame.fit
    this.photoImg.alt = frame.photoAlt ?? ''
    this.photoImg.onerror = () => {
      setLayerVisible(this.photoLayer, false)
    }
    if (this.photoImg.getAttribute('src') !== frame.photoSrc) {
      this.photoImg.src = frame.photoSrc
    }
    setLayerVisible(this.photoLayer, true)
  }

  private setZoom(frame: BeatFrame, active: boolean) {
    this.zoom.setVisible(active)
    if (!active || !frame.beat.zoom) return
    this.zoom.load(frame.beat.zoom)
    this.zoom.show(frame.zoomIndex, frame.showScale)
  }

  private setDiagram(frame: BeatFrame, active: boolean) {
    this.diagram.setVisible(active)
    if (active) this.diagram.show(frame.diagramStage)
  }

  private setCompare(frame: BeatFrame, active: boolean) {
    this.compare.setVisible(active)
    if (!active || !frame.beat.compare) return
    this.compare.load(frame.beat.compare)
    this.compare.show(frame.comparePhase)
  }

  private async setVideo(frame: BeatFrame, active: boolean, token: number) {
    const { beat } = frame

    if (!active) {
      this.stopVideo()
      return
    }

    this.videoLayer.dataset.fit = frame.fit
    setLayerVisible(this.videoLayer, true)
    this.setCaption(frame.caption)

    if (beat.youtubeId) {
      this.video.hidden = true
      this.video.pause()
      this.youtubeFrame.hidden = false
      this.youtubeFrame.innerHTML = `<iframe
        src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(beat.youtubeId)}?autoplay=1&mute=1&controls=0&loop=1&playlist=${encodeURIComponent(beat.youtubeId)}&rel=0"
        title="${escapeHtml(beat.title)}"
        allow="autoplay; encrypted-media"
        allowfullscreen
      ></iframe>`
      return
    }

    this.youtubeFrame.hidden = true
    this.youtubeFrame.innerHTML = ''
    this.video.hidden = false

    // Only reload when the clip actually changes, so a caption step does not
    // restart the film from the top.
    if (this.currentVideoSrc !== beat.videoSrc) {
      this.currentVideoSrc = beat.videoSrc ?? null
      this.video.src = beat.videoSrc!
      this.video.poster = beat.poster ?? ''
      this.video.loop = !beat.audio
      this.setCaptionTrack(beat)
      this.video.currentTime = 0
    }

    // The keypress that got us here is the user gesture browsers require
    // before a clip may play with sound.
    this.video.muted = !beat.audio
    this.video.volume = 1

    try {
      await this.video.play()
      return
    } catch {
      // A press lands while the clip is still opening: the next beat's render
      // aborts this play(), and everything below would tear down the picture
      // that render just put up — including a clip it had started itself.
      if (token !== this.renderToken) return
    }

    if (!this.video.muted) {
      console.warn('[overlay] Sound blocked; retrying muted.')
      this.video.muted = true
      try {
        await this.video.play()
        return
      } catch {
        if (token !== this.renderToken) return
      }
    }

    console.warn('[overlay] Video would not play.')
    this.stopVideo()
    if (frame.photoSrc) this.setPhoto(frame, true)
  }

  private setCaptionTrack(beat: BeatDefinition) {
    this.video.querySelectorAll('track').forEach((t) => t.remove())
    if (!beat.captionsSrc) return
    const track = document.createElement('track')
    track.kind = 'captions'
    track.srclang = 'en'
    track.label = 'English'
    track.default = true
    track.src = beat.captionsSrc
    this.video.appendChild(track)
  }

  private setCaption(text: string | undefined) {
    this.captionsEl.textContent = text ?? ''
    this.captionsEl.hidden = !text
  }

  private stopVideo() {
    if (this.currentVideoSrc === null && this.videoLayer.hidden) return
    this.video.pause()
    this.video.removeAttribute('src')
    this.video.load()
    this.currentVideoSrc = null
    this.youtubeFrame.innerHTML = ''
    this.youtubeFrame.hidden = true
    this.video.hidden = false
    this.setCaption(undefined)
    setLayerVisible(this.videoLayer, false)
  }

  // ── Depth readout ─────────────────────────────────────────────────────

  setDepth(metres: number | null) {
    if (metres === null) {
      this.depthEl.hidden = true
      return
    }
    this.depthEl.hidden = false
    this.depthValue.textContent = Math.round(metres).toLocaleString('en-US')
  }

  private clearTransient() {
    this.cue.cancel()
    for (const t of this.labelTimers) clearTimeout(t)
    this.labelTimers = []
    this.copyEl.classList.remove('is-visible')
    this.titleEl.classList.remove('is-visible')
  }
}

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id)
  if (!node) throw new Error(`Missing #${id}`)
  return node as T
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
