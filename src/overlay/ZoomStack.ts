import type { ZoomFrame } from '../beats/types'
import { formatScale, niceScaleUm } from '../lib/scale'
import { setLayerVisible } from './layerVisibility'

/**
 * The zoom ladder.
 *
 * The trick that sells "we never left the rock" is matched-scale crossfading:
 * when we step from a 3.2 mm frame to a 1.1 mm frame, the outgoing image scales
 * up by 2.9x while the incoming image starts at 1/2.9 and settles at 1. Features
 * common to both frames stay the same size on screen through the dissolve, so
 * the room reads it as one continuous push instead of a cut.
 *
 * Frames are letterboxed to their true 4:3 aspect inside a sized box, so the
 * box width is exactly `fieldUm` across and the scale bar maths stay honest.
 */
export class ZoomStack {
  private readonly root: HTMLElement
  private readonly box: HTMLElement
  private readonly bar: HTMLElement
  private readonly barLine: HTMLElement
  private readonly barLabel: HTMLElement
  private frames: ZoomFrame[] = []
  private nodes: HTMLImageElement[] = []
  private current = -1
  private scaleVisible = false

  constructor(root: HTMLElement) {
    this.root = root
    this.box = root.querySelector('.zoom-box') as HTMLElement
    this.bar = root.querySelector('.zoom-scalebar') as HTMLElement
    this.barLine = root.querySelector('.zoom-scalebar-line') as HTMLElement
    this.barLabel = root.querySelector('.zoom-scalebar-label') as HTMLElement
    window.addEventListener('resize', () => this.layoutBar())
  }

  /** Swap in a ladder. Re-mounting the same ladder is a no-op. */
  load(frames: ZoomFrame[]) {
    if (this.frames === frames) return
    this.frames = frames
    this.current = -1
    this.box.querySelectorAll('img').forEach((n) => n.remove())
    this.nodes = frames.map((frame) => {
      const img = document.createElement('img')
      img.className = 'zoom-frame'
      img.src = frame.src
      img.alt = frame.alt
      img.style.transformOrigin = `${frame.originX ?? 50}% ${frame.originY ?? 50}%`
      this.box.appendChild(img)
      return img
    })
  }

  show(index: number, showScale: boolean) {
    const next = Math.max(0, Math.min(index, this.frames.length - 1))
    if (next !== this.current) this.transitionTo(next)
    this.setScaleVisible(showScale)
  }

  setVisible(visible: boolean) {
    setLayerVisible(this.root, visible)
  }

  private transitionTo(next: number) {
    const from = this.current
    this.current = next

    if (from === -1) {
      this.nodes.forEach((node, i) => {
        node.style.transition = 'none'
        node.style.transform = 'scale(1)'
        node.style.opacity = i === next ? '1' : '0'
      })
      // Force a reflow so the next transition actually animates.
      void this.box.offsetWidth
      this.nodes.forEach((n) => {
        n.style.transition = ''
      })
      this.layoutBar()
      return
    }

    // Ratio > 1 means we are pushing in (the new frame covers less ground).
    const ratio = this.frames[from].fieldUm / this.frames[next].fieldUm

    const outgoing = this.nodes[from]
    const incoming = this.nodes[next]

    outgoing.style.transition = ''
    outgoing.style.transform = `scale(${ratio})`
    outgoing.style.opacity = '0'

    incoming.style.transition = 'none'
    incoming.style.transform = `scale(${1 / ratio})`
    incoming.style.opacity = '0'
    void incoming.offsetWidth
    incoming.style.transition = ''
    incoming.style.transform = 'scale(1)'
    incoming.style.opacity = '1'

    // Anything that is neither end of this move gets parked silently.
    this.nodes.forEach((node, i) => {
      if (i === from || i === next) return
      node.style.transition = 'none'
      node.style.opacity = '0'
      node.style.transform = 'scale(1)'
    })

    this.layoutBar()
  }

  private setScaleVisible(visible: boolean) {
    this.scaleVisible = visible
    this.bar.classList.toggle('is-visible', visible)
    this.bar.setAttribute('aria-hidden', visible ? 'false' : 'true')
    if (visible) this.layoutBar()
  }

  /**
   * Size the bar against the micrograph's *rendered* width under `cover`,
   * which is the box width on anything wider than 4:3 and grows beyond it on
   * narrower displays. Target roughly a quarter of the frame, then snap to a
   * readable length.
   */
  private layoutBar() {
    if (this.current < 0 || !this.scaleVisible) return
    const frame = this.frames[this.current]
    const rect = this.box.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return

    const node = this.nodes[this.current]
    const imgAspect =
      node?.naturalWidth && node.naturalHeight ? node.naturalWidth / node.naturalHeight : 4 / 3
    const boxAspect = rect.width / rect.height
    const renderedWidth = boxAspect >= imgAspect ? rect.width : rect.height * imgAspect

    const barUm = niceScaleUm(frame.fieldUm * 0.25)
    const barPx = (barUm / frame.fieldUm) * renderedWidth
    this.barLine.style.width = `${barPx.toFixed(1)}px`
    this.barLabel.textContent = formatScale(barUm)
  }
}
