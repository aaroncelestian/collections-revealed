import type { ComparePair } from '../beats/types'
import { setLayerVisible } from './layerVisibility'

/**
 * Two photographs of the same subject, crossfaded in place. Used for the brine
 * bottle: identical framing, identical fill line, only the colour changes — so
 * the change is unmistakable and nothing else draws the eye.
 */
export class CompareLayer {
  private readonly root: HTMLElement
  private readonly beforeImg: HTMLImageElement
  private readonly afterImg: HTMLImageElement
  private readonly caption: HTMLElement
  private pair: ComparePair | null = null

  constructor(root: HTMLElement) {
    this.root = root
    this.beforeImg = root.querySelector('.compare-before') as HTMLImageElement
    this.afterImg = root.querySelector('.compare-after') as HTMLImageElement
    this.caption = root.querySelector('.compare-caption') as HTMLElement
  }

  load(pair: ComparePair) {
    if (this.pair === pair) return
    this.pair = pair
    this.beforeImg.src = pair.beforeSrc
    this.beforeImg.alt = pair.beforeLabel
    this.afterImg.src = pair.afterSrc
    this.afterImg.alt = pair.afterLabel
  }

  show(phase: 'before' | 'after') {
    if (!this.pair) return
    const after = phase === 'after'
    this.afterImg.classList.toggle('is-visible', after)
    this.caption.textContent = after ? this.pair.afterLabel : this.pair.beforeLabel
  }

  setVisible(visible: boolean) {
    setLayerVisible(this.root, visible)
  }
}
