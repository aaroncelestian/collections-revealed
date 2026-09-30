/**
 * Element fullscreen, which unlike Safari's window fullscreen leaves no
 * toolbar or address bar over the stage.
 *
 * Safari before 16.4 only has the webkit-prefixed calls, and the talk may run
 * on a borrowed machine, so both spellings stay in play.
 */
type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => void
}

type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => void
}

export function isFullscreen(): boolean {
  const doc = document as WebkitDocument
  return Boolean(document.fullscreenElement || doc.webkitFullscreenElement)
}

/**
 * Must be called from a user gesture. WebKit is stricter than Blink about
 * which gestures qualify and can refuse a bare keypress, so a refusal is
 * logged rather than swallowed — otherwise pressing F looks like dead code.
 */
export function toggleFullscreen(): void {
  const doc = document as WebkitDocument

  if (isFullscreen()) {
    if (document.exitFullscreen) void document.exitFullscreen()
    else doc.webkitExitFullscreen?.()
    return
  }

  const root = document.documentElement as WebkitElement
  if (root.requestFullscreen) {
    root.requestFullscreen().catch((err: unknown) => {
      console.warn('[fullscreen] refused; use the HUD button instead', err)
    })
  } else if (root.webkitRequestFullscreen) {
    root.webkitRequestFullscreen()
  } else {
    console.warn('[fullscreen] no Fullscreen API on this browser')
  }
}
