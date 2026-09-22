/**
 * Audience-interaction furniture: the shared countdown and the reveal flash.
 *
 * The questions themselves never appear on the audience screen — they live in
 * the presenter HUD and get asked out loud. Only the payoff shows here.
 */
export class InteractionCue {
  private readonly root: HTMLElement
  private readonly number: HTMLElement
  private readonly flashEl: HTMLElement
  private timer: number | null = null
  private onZero: (() => void) | null = null

  constructor(root: HTMLElement, flashEl: HTMLElement) {
    this.root = root
    this.number = root.querySelector('.countdown-number') as HTMLElement
    this.flashEl = flashEl
  }

  /** Big ticking numbers the room counts along with. Fires `onZero` at zero. */
  countdown(from: number, onZero: () => void) {
    this.cancel()
    this.onZero = onZero
    let n = from

    this.root.hidden = false
    this.tick(n)

    this.timer = window.setInterval(() => {
      n -= 1
      if (n > 0) {
        this.tick(n)
        return
      }
      this.cancelTimer()
      this.root.classList.remove('is-visible')
      window.setTimeout(() => {
        this.root.hidden = true
        this.number.textContent = ''
      }, 320)
      const fire = this.onZero
      this.onZero = null
      fire?.()
    }, 1000)
  }

  private tick(n: number) {
    this.number.textContent = String(n)
    this.root.classList.remove('is-visible')
    // Restart the pop animation on every number.
    void this.root.offsetWidth
    this.root.classList.add('is-visible')
  }

  /** A single bright pulse for the moment an answer lands. */
  flash() {
    this.flashEl.classList.remove('is-flashing')
    void this.flashEl.offsetWidth
    this.flashEl.classList.add('is-flashing')
  }

  /**
   * Stop a running countdown without firing it. Called whenever the presenter
   * moves off the beat, so a stray press can never trigger a late scene change.
   */
  cancel() {
    this.cancelTimer()
    this.onZero = null
    this.root.hidden = true
    this.root.classList.remove('is-visible')
    this.number.textContent = ''
  }

  private cancelTimer() {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}
