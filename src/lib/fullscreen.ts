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

/** Must be called from a user gesture or the browser refuses. */
export function toggleFullscreen(): void {
  const doc = document as WebkitDocument

  if (isFullscreen()) {
    if (document.exitFullscreen) void document.exitFullscreen()
    else doc.webkitExitFullscreen?.()
    return
  }

  const root = document.documentElement as WebkitElement
  if (root.requestFullscreen) {
    // Rejects when the gesture has already expired; nothing useful to do.
    root.requestFullscreen().catch(() => {})
  } else {
    root.webkitRequestFullscreen?.()
  }
}
