import type { ZoomFrame } from '../beats/types'
import { formatScale, niceScaleUm } from '../lib/scale'
import { setLayerVisible } from './layerVisibility'

/** How long one push takes before the picture holds. */
const PUSH_MS = 1700

interface Plate {
  frame: ZoomFrame
  /** Decoded source. Kept out of the layout so Chrome never textures a giant bitmap. */
  img: HTMLImageElement
  canvas: HTMLCanvasElement
  /** Height in the shared micrometre space. */
  hUm: number
}

interface View {
  x: number
  y: number
  w: number
  h: number
}

/**
 * The zoom ladder as one picture.
 *
 * Every frame is placed in a shared micrometre space. A press moves the
 * camera from the current view to the next frame and then holds there —
 * there is no crossfade. A finer frame is drawn only once the camera has
 * arrived at its scale, so a wide view never shows a little rectangle of
 * the next photo sitting inside it.
 *
 * Each frame is painted into a canvas the size of the stage. Scaling the
 * photograph itself with CSS makes a layer tens of thousands of pixels wide
 * once the camera pushes in, and Chrome throws that layer away.
 */
export class ZoomStack {
  private readonly root: HTMLElement
  private readonly box: HTMLElement
  private readonly world: HTMLElement
  private readonly bar: HTMLElement
  private readonly barLine: HTMLElement
  private readonly barLabel: HTMLElement
  private frames: ZoomFrame[] = []
  private plates: Plate[] = []
  private current = -1
  private view: View = { x: 0, y: 0, w: 1, h: 1 }
  private scaleVisible = false
  private onStage = false
  private snapOnShow = true
  private raf = 0
  private reducedMotion: boolean

  constructor(root: HTMLElement) {
    this.root = root
    this.box = root.querySelector('.zoom-box') as HTMLElement
    this.world = document.createElement('div')
    this.world.className = 'zoom-world'
    this.box.prepend(this.world)
    this.bar = root.querySelector('.zoom-scalebar') as HTMLElement
    this.barLine = root.querySelector('.zoom-scalebar-line') as HTMLElement
    this.barLabel = root.querySelector('.zoom-scalebar-label') as HTMLElement
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.addEventListener('resize', () => {
      if (this.current < 0) return
      cancelAnimationFrame(this.raf)
      this.view = this.coverView(this.frameRect(this.current))
      this.apply()
    })
  }

  /** Swap in a ladder. The same pictures (even a new array) keep the camera. */
  load(frames: ZoomFrame[]) {
    const same =
      this.frames.length === frames.length &&
      this.frames.every((frame, i) => frame.src === frames[i].src)
    this.frames = frames
    if (same) return

    cancelAnimationFrame(this.raf)
    this.current = -1
    this.world.replaceChildren()
    this.plates = frames.map((frame, index) => {
      const img = new Image()
      img.src = frame.src
      img.alt = frame.alt
      const canvas = document.createElement('canvas')
      canvas.className = 'zoom-plate'
      canvas.setAttribute('role', 'img')
      canvas.setAttribute('aria-label', frame.alt)
      canvas.style.zIndex = String(index + 1)
      canvas.style.visibility = 'hidden'
      const plate: Plate = { frame, img, canvas, hUm: frame.fieldUm * 0.75 }
      img.addEventListener('load', () => {
        if (img.naturalWidth > 0) {
          plate.hUm = frame.fieldUm * (img.naturalHeight / img.naturalWidth)
          if (this.current >= 0) this.apply()
        }
      })
      this.world.appendChild(canvas)
      return plate
    })
  }

  show(index: number, showScale: boolean) {
    const next = Math.max(0, Math.min(index, this.frames.length - 1))
    const snap = this.snapOnShow || this.current < 0 || this.reducedMotion
    this.snapOnShow = false
    if (next !== this.current) this.moveTo(next, !snap)
    this.setScaleVisible(showScale)
  }

  setVisible(visible: boolean) {
    const was = this.onStage
    this.onStage = visible
    setLayerVisible(this.root, visible)
    // Coming onto the ladder from another beat should land, not fly in.
    if (visible && !was) this.snapOnShow = true
  }

  private frameRect(index: number): View {
    const plate = this.plates[index]
    const frame = plate?.frame ?? this.frames[index]
    return {
      x: frame.xUm ?? 0,
      y: frame.yUm ?? 0,
      w: frame.fieldUm,
      h: plate?.hUm ?? frame.fieldUm * 0.75,
    }
  }

  /**
   * The view that shows this frame the way `object-fit: cover` did:
   * full width on a wide screen, with the extra height cropped.
   */
  private coverView(frame: View): View {
    const rect = this.box.getBoundingClientRect()
    const boxAspect = rect.width > 1 && rect.height > 1 ? rect.width / rect.height : 16 / 9
    const frameAspect = frame.w / frame.h
    let w: number
    let h: number
    if (boxAspect >= frameAspect) {
      w = frame.w
      h = frame.w / boxAspect
    } else {
      h = frame.h
      w = frame.h * boxAspect
    }
    w = Math.min(w, frame.w)
    h = Math.min(h, frame.h)
    return {
      x: frame.x + (frame.w - w) / 2,
      y: frame.y + (frame.h - h) / 2,
      w,
      h,
    }
  }

  private moveTo(index: number, animate: boolean) {
    const from = { ...this.view }
    const to = this.coverView(this.frameRect(index))
    this.current = index
    cancelAnimationFrame(this.raf)

    if (!animate || from.w <= 1) {
      this.view = to
      this.apply()
      return
    }

    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / PUSH_MS)
      const e = easeInOut(t)
      const w = Math.exp(Math.log(from.w) + (Math.log(to.w) - Math.log(from.w)) * e)
      const h = w * (to.h / to.w)
      const fromCx = from.x + from.w / 2
      const fromCy = from.y + from.h / 2
      const toCx = to.x + to.w / 2
      const toCy = to.y + to.h / 2
      const cx = fromCx + (toCx - fromCx) * e
      const cy = fromCy + (toCy - fromCy) * e
      this.view = { x: cx - w / 2, y: cy - h / 2, w, h }
      this.apply()
      if (t < 1) this.raf = requestAnimationFrame(step)
    }
    this.raf = requestAnimationFrame(step)
  }

  private apply() {
    const rect = this.box.getBoundingClientRect()
    const boxW = rect.width > 1 ? rect.width : 1
    const boxH = rect.height > 1 ? rect.height : 1
    // Stay under Chrome's texture limit on a retina screen. The canvas is the
    // stage, not the micrometre world, so 2× is already sharp.
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const bw = Math.max(1, Math.round(boxW * dpr))
    const bh = Math.max(1, Math.round(boxH * dpr))
    const s = boxW / this.view.w

    for (const plate of this.plates) {
      const show = this.plateShown(plate)
      plate.canvas.style.visibility = show ? 'visible' : 'hidden'
      if (!show) continue
      const ctx = plate.canvas.getContext('2d')
      if (!ctx) continue
      if (plate.canvas.width !== bw || plate.canvas.height !== bh) {
        plate.canvas.width = bw
        plate.canvas.height = bh
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, boxW, boxH)
      this.drawPlate(plate, ctx, s)
    }

    if (this.scaleVisible) this.layoutBar()
  }

  /** A finer plate stays hidden until the camera is at its scale. */
  private plateShown(plate: Plate): boolean {
    const x = plate.frame.xUm ?? 0
    const y = plate.frame.yUm ?? 0
    const atScale = this.view.w <= plate.frame.fieldUm * 1.04
    const overlaps =
      this.view.x < x + plate.frame.fieldUm &&
      this.view.x + this.view.w > x &&
      this.view.y < y + plate.hUm &&
      this.view.y + this.view.h > y
    const coarsest = plate.frame.fieldUm >= this.frames[0].fieldUm * 0.98
    return (coarsest || atScale) && overlaps
  }

  /** Paint the part of this frame that the camera can see, into stage pixels. */
  private drawPlate(plate: Plate, ctx: CanvasRenderingContext2D, s: number) {
    const img = plate.img
    if (!img.complete || img.naturalWidth === 0) return
    const x = plate.frame.xUm ?? 0
    const y = plate.frame.yUm ?? 0
    const pw = plate.frame.fieldUm
    const ph = plate.hUm
    const ix0 = Math.max(x, this.view.x)
    const iy0 = Math.max(y, this.view.y)
    const ix1 = Math.min(x + pw, this.view.x + this.view.w)
    const iy1 = Math.min(y + ph, this.view.y + this.view.h)
    if (ix1 <= ix0 || iy1 <= iy0) return
    const nw = img.naturalWidth
    const nh = img.naturalHeight
    ctx.drawImage(
      img,
      ((ix0 - x) / pw) * nw,
      ((iy0 - y) / ph) * nh,
      ((ix1 - ix0) / pw) * nw,
      ((iy1 - iy0) / ph) * nh,
      (ix0 - this.view.x) * s,
      (iy0 - this.view.y) * s,
      (ix1 - ix0) * s,
      (iy1 - iy0) * s
    )
  }

  private setScaleVisible(visible: boolean) {
    this.scaleVisible = visible
    this.bar.classList.toggle('is-visible', visible)
    this.bar.setAttribute('aria-hidden', visible ? 'false' : 'true')
    if (visible) this.layoutBar()
  }

  /** The bar measures whatever the camera can see right now, including mid-push. */
  private layoutBar() {
    if (!this.scaleVisible || this.view.w <= 1) return
    const rect = this.box.getBoundingClientRect()
    if (rect.width < 1) return
    const barUm = niceScaleUm(this.view.w * 0.25)
    const barPx = (barUm / this.view.w) * rect.width
    this.barLine.style.width = `${barPx.toFixed(1)}px`
    this.barLabel.textContent = formatScale(barUm)
  }
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}
