import { PresentationApp } from './app/PresentationApp'

const canvas = document.getElementById('stage-canvas')
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Missing #stage-canvas')
}

// Audience mode: append ?audience=1 to hide the presenter HUD on the house feed
if (new URLSearchParams(window.location.search).has('audience')) {
  document.body.classList.add('is-audience')
}

const app = new PresentationApp(canvas)

window.addEventListener('beforeunload', () => app.dispose())

// Helpful in rehearsal: confirm boot in the console without cluttering the stage
console.info(
  '%cCollections Revealed — Life in Salt%c\nSpace/→ next · ← back · 1–9 / 0 jump · H HUD · F force fallback',
  'font-weight:bold;font-size:14px',
  'color:#888',
)
