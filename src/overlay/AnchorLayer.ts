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
    // The inset takes the same fit as the full frame: a different crop would
    // stop it reading as the picture the talk opened on.
    this.img.style.objectFit = fit
    if (placement === this.placement) return

    // Snap off when hiding. A fade-out under a video/photo layer that is itself
    // fading in leaves the crystal ghosting through for a beat — the flash on
    // the Act 4 → Act 5 cut. Fade-in to full/inset stays soft on purpose.
    const snap = placement === 'hidden'
    if (snap) this.root.style.transition = 'none'

    this.placement = placement
    this.apply()

    if (snap) {
      void this.root.offsetWidth
      this.root.style.transition = ''
    }
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
