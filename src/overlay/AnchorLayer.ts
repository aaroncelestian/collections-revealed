import type { AnchorPlacement } from '../beats/types'

/**
 * The Searles Lake crystal. It mounts once and never unmounts — it only moves
 * between full frame, a corner inset, and hidden. Keeping one element (rather
 * than swapping `src` on the shared photo layer) is what lets the audience read
 * it as the same object returning, and lets it crossfade with itself.
 */
export class AnchorLayer {
  private readonly root: HTMLElement
  private readonly img: HTMLImageElement
  private placement: AnchorPlacement = 'hidden'

  constructor(root: HTMLElement, src: string, alt: string) {
    this.root = root
    this.img = root.querySelector('img') as HTMLImageElement
    this.img.src = src
    this.img.alt = alt
    this.apply()
  }

  set(placement: AnchorPlacement, fit: 'cover' | 'contain' = 'contain') {
    // The inset stays `contain` too: cropping it would stop it reading as the
    // same picture the talk opened on.
    this.img.style.objectFit = fit
    if (placement === this.placement) return
    this.placement = placement
    this.apply()
  }

  get current(): AnchorPlacement {
    return this.placement
  }

  private apply() {
    this.root.classList.toggle('is-full', this.placement === 'full')
    this.root.classList.toggle('is-inset', this.placement === 'inset')
    this.root.classList.toggle('is-hidden', this.placement === 'hidden')
    // Inset rides above the picture it comments on; full frame sits behind copy.
    this.root.style.zIndex = this.placement === 'inset' ? '6' : '2'
    this.img.setAttribute('aria-hidden', this.placement === 'hidden' ? 'true' : 'false')
  }
}
