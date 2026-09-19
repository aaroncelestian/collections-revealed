export type PresenterCommand =
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'jump'; index: number }
  | { type: 'toggle-hud' }
  | { type: 'force-fallback' }

type Listener = (command: PresenterCommand) => void

/**
 * Isolated control layer: only emits go-to-beat intents.
 * Works with space / arrows / number keys and basic clickers (PageDown/PageUp).
 * Digits 1–9 → beats 1–9; 0 → beat 10. Use arrows for the rest.
 */
export function bindPresenterControls(onCommand: Listener): () => void {
  const handler = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return

    const key = event.key

    if (key === ' ' || key === 'ArrowRight' || key === 'PageDown' || key === 'Enter') {
      event.preventDefault()
      onCommand({ type: 'next' })
      return
    }

    if (key === 'ArrowLeft' || key === 'PageUp' || key === 'Backspace') {
      event.preventDefault()
      onCommand({ type: 'prev' })
      return
    }

    if (/^[1-9]$/.test(key)) {
      event.preventDefault()
      onCommand({ type: 'jump', index: Number(key) - 1 })
      return
    }

    if (key === '0') {
      event.preventDefault()
      onCommand({ type: 'jump', index: 9 })
      return
    }

    if (key === 'h' || key === 'H') {
      onCommand({ type: 'toggle-hud' })
      return
    }

    if (key === 'f' || key === 'F') {
      onCommand({ type: 'force-fallback' })
    }
  }

  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}
