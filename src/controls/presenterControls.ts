export type PresenterCommand =
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'jump-act'; actKey: number }
  | { type: 'toggle-hud' }
  | { type: 'toggle-timer' }
  | { type: 'reset-timer' }
  | { type: 'force-fallback' }

type Listener = (command: PresenterCommand) => void

/**
 * Isolated control layer: emits intents only, never touches playback.
 *
 * `next` and `prev` are the only two signals a basic clicker sends, and they
 * carry the whole talk — reveal steps inside a beat consume them first, then
 * beats. Digits jump to act starts rather than beats, because 18 beats no
 * longer fit on ten number keys.
 */
/** A held key or a bouncy clicker must never jump three beats at once. */
const ADVANCE_DEBOUNCE_MS = 140

export function bindPresenterControls(onCommand: Listener): () => void {
  let lastAdvance = 0

  const advance = (event: KeyboardEvent, command: PresenterCommand) => {
    event.preventDefault()
    const now = performance.now()
    if (now - lastAdvance < ADVANCE_DEBOUNCE_MS) return
    lastAdvance = now
    onCommand(command)
  }

  const handler = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (event.repeat) return

    const key = event.key

    if (key === ' ' || key === 'ArrowRight' || key === 'PageDown' || key === 'Enter') {
      advance(event, { type: 'next' })
      return
    }

    if (key === 'ArrowLeft' || key === 'PageUp' || key === 'Backspace') {
      advance(event, { type: 'prev' })
      return
    }

    if (/^[1-7]$/.test(key)) {
      event.preventDefault()
      onCommand({ type: 'jump-act', actKey: Number(key) })
      return
    }

    if (key === 'h' || key === 'H') {
      onCommand({ type: 'toggle-hud' })
      return
    }

    if (key === 't' || key === 'T') {
      onCommand({ type: 'toggle-timer' })
      return
    }

    if (key === 'r' || key === 'R') {
      onCommand({ type: 'reset-timer' })
      return
    }

    if (key === 'f' || key === 'F') {
      onCommand({ type: 'force-fallback' })
    }
  }

  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}
