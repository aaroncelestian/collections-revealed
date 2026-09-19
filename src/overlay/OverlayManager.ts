import type { BeatDefinition } from '../beats/catalog'

export class OverlayManager {
  private readonly copyEl: HTMLElement
  private readonly labelsEl: HTMLElement
  private readonly photoLayer: HTMLElement
  private readonly photoImg: HTMLImageElement
  private readonly videoLayer: HTMLElement
  private readonly video: HTMLVideoElement
  private readonly youtubeFrame: HTMLElement
  private readonly captionsEl: HTMLElement
  private readonly fallbackLayer: HTMLElement
  private readonly fallbackImg: HTMLImageElement
  private readonly fallbackCopy: HTMLElement
  private captionTimer: number | null = null
  private labelTimers: number[] = []
  private degraded = false

  constructor() {
    this.copyEl = el('beat-copy')
    this.labelsEl = el('beat-labels')
    this.photoLayer = el('photo-layer')
    this.photoImg = el('photo-image') as HTMLImageElement
    this.videoLayer = el('video-layer')
    this.video = el('bacteria-video') as HTMLVideoElement
    this.youtubeFrame = el('youtube-frame')
    this.captionsEl = el('video-captions')
    this.fallbackLayer = el('fallback-layer')
    this.fallbackImg = el('fallback-image') as HTMLImageElement
    this.fallbackCopy = el('fallback-copy')
  }

  /** Preload local videos at start so reveal/lake never stall in rehearsal. */
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

  enterDegradedMode(beat: BeatDefinition) {
    this.degraded = true
    this.clearTransient()
    this.hideAllRichLayers()
    this.fallbackLayer.hidden = false
    if (beat.fallbackSrc) {
      this.fallbackImg.src = beat.fallbackSrc
      this.fallbackImg.alt = beat.fallbackAlt ?? beat.title
    } else {
      this.fallbackImg.removeAttribute('src')
      this.fallbackImg.alt = ''
    }
    this.fallbackCopy.textContent = beat.headline ?? beat.title
  }

  clearDegradedMode() {
    this.degraded = false
    this.fallbackLayer.hidden = true
  }

  showBeat(beat: BeatDefinition) {
    this.clearTransient()
    if (this.degraded) {
      this.enterDegradedMode(beat)
      return
    }

    this.fallbackLayer.hidden = true
    this.showCopy(beat)
    this.showLabels(beat)
    this.showPhoto(beat)
    void this.showMotion(beat)
  }

  private showCopy(beat: BeatDefinition) {
    if (!beat.headline) {
      this.copyEl.hidden = true
      this.copyEl.classList.remove('is-visible')
      this.copyEl.innerHTML = ''
      return
    }

    const support = beat.supporting
      ? `<span class="supporting">${escapeHtml(beat.supporting)}</span>`
      : ''
    this.copyEl.hidden = false
    this.copyEl.innerHTML = `${escapeHtml(beat.headline)}${support}`
    requestAnimationFrame(() => this.copyEl.classList.add('is-visible'))
  }

  private showLabels(beat: BeatDefinition) {
    this.labelsEl.innerHTML = ''
    if (!beat.labels?.length) {
      this.labelsEl.hidden = true
      return
    }

    this.labelsEl.hidden = false
    for (const label of beat.labels) {
      const node = document.createElement('div')
      node.className = 'beat-label'
      node.textContent = label.text
      node.style.left = `${label.x}%`
      node.style.top = `${label.y}%`
      this.labelsEl.appendChild(node)
      const timer = window.setTimeout(() => node.classList.add('is-visible'), label.delayMs ?? 0)
      this.labelTimers.push(timer)
    }
  }

  private showPhoto(beat: BeatDefinition) {
    const motionTakesOver = Boolean(beat.videoSrc || beat.youtubeId)
    if (!beat.photoSrc || motionTakesOver) {
      this.photoLayer.hidden = true
      this.photoLayer.classList.remove('is-visible')
      return
    }

    this.photoImg.alt = beat.photoAlt ?? ''
    this.photoImg.onerror = () => {
      this.photoLayer.hidden = true
      this.photoLayer.classList.remove('is-visible')
      if (beat.fallbackSrc) this.enterDegradedMode(beat)
    }
    this.photoImg.src = beat.photoSrc
    this.photoLayer.hidden = false
    requestAnimationFrame(() => this.photoLayer.classList.add('is-visible'))
  }

  private async showMotion(beat: BeatDefinition) {
    if (!beat.videoSrc && !beat.youtubeId) {
      this.stopMotion()
      return
    }

    this.videoLayer.hidden = false
    requestAnimationFrame(() => this.videoLayer.classList.add('is-visible'))
    this.cycleCaptions(beat.captions ?? [])

    // Prefer YouTube when an id is set (talk-day path once you upload)
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
    this.video.src = beat.videoSrc!

    try {
      this.video.currentTime = 0
      await this.video.play()
    } catch {
      console.warn('[overlay] Video play failed; using still.')
      this.stopMotion()
      if (beat.photoSrc) {
        this.photoImg.alt = beat.photoAlt ?? ''
        this.photoImg.src = beat.photoSrc
        this.photoLayer.hidden = false
        this.photoLayer.classList.add('is-visible')
      } else {
        this.enterDegradedMode(beat)
      }
    }
  }

  private cycleCaptions(lines: string[]) {
    if (!lines.length) {
      this.captionsEl.textContent = ''
      return
    }
    let i = 0
    this.captionsEl.textContent = lines[0]
    this.captionTimer = window.setInterval(() => {
      i = (i + 1) % lines.length
      this.captionsEl.textContent = lines[i]
    }, 4000)
  }

  private stopMotion() {
    this.video.pause()
    this.youtubeFrame.innerHTML = ''
    this.youtubeFrame.hidden = true
    this.video.hidden = false
    this.videoLayer.classList.remove('is-visible')
    this.videoLayer.hidden = true
  }

  private hideAllRichLayers() {
    this.copyEl.hidden = true
    this.labelsEl.hidden = true
    this.photoLayer.hidden = true
    this.stopMotion()
    this.copyEl.classList.remove('is-visible')
    this.photoLayer.classList.remove('is-visible')
  }

  private clearTransient() {
    if (this.captionTimer !== null) {
      clearInterval(this.captionTimer)
      this.captionTimer = null
    }
    for (const t of this.labelTimers) clearTimeout(t)
    this.labelTimers = []
    this.copyEl.classList.remove('is-visible')
    this.photoLayer.classList.remove('is-visible')
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
