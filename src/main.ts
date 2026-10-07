import { PresentationApp } from './app/PresentationApp'

const heroCanvas = document.getElementById('stage-canvas')
const globeCanvas = document.getElementById('globe-canvas')
const solarCanvas = document.getElementById('solar-canvas')
const constellationHost = document.getElementById('constellation-root')
if (!(heroCanvas instanceof HTMLCanvasElement)) {
  throw new Error('Missing #stage-canvas')
}
if (!(globeCanvas instanceof HTMLCanvasElement)) {
  throw new Error('Missing #globe-canvas')
}
if (!(solarCanvas instanceof HTMLCanvasElement)) {
  throw new Error('Missing #solar-canvas')
}
if (!(constellationHost instanceof HTMLElement)) {
  throw new Error('Missing #constellation-root')
}

// Audience mode: append ?audience=1 to hide the presenter HUD on the house feed
if (new URLSearchParams(window.location.search).has('audience')) {
  document.body.classList.add('is-audience')
}

const app = new PresentationApp(heroCanvas, globeCanvas, solarCanvas, constellationHost)

window.addEventListener('beforeunload', () => app.dispose())

// Helpful in rehearsal: confirm boot in the console without cluttering the stage
console.info(
  `%cCollections Revealed — Life in Salt%c  build ${__BUILD_ID__}%c\nSpace/→ next · ← back · 1–7 acts · T timer · R reset · H HUD`,
  'font-weight:bold;font-size:14px',
  'color:#888',
  'color:#888',
)
