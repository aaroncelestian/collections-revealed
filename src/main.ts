import { PresentationApp } from './app/PresentationApp'
import { startOffline, type OfflineState } from './lib/offline'

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
const offline = startOffline(paintOffline)
document.getElementById('hud-install')?.addEventListener('click', () => {
  void offline.install()
})

window.addEventListener('beforeunload', () => app.dispose())

function paintOffline(state: OfflineState) {
  const status = document.getElementById('hud-offline')
  const install = document.getElementById('hud-install') as HTMLButtonElement | null
  if (!status) return
  status.className = 'hud-offline'
  if (install) install.hidden = true

  if (state.kind === 'dev') {
    status.textContent = 'dev server — not cached'
    return
  }
  if (state.kind === 'file') {
    status.classList.add('is-ready')
    status.textContent = 'USB files — no internet needed'
    return
  }
  if (state.kind === 'caching') {
    status.classList.add('is-wait')
    status.textContent = state.total
      ? `Downloading for offline… ${state.done}/${state.total}`
      : 'Downloading talk for offline…'
    return
  }
  if (state.kind === 'ready') {
    status.classList.add('is-ready')
    status.textContent = 'Offline ready'
    if (install && state.canInstall) install.hidden = false
    return
  }
  if (state.kind === 'installed') {
    status.classList.add('is-ready')
    status.textContent = 'Installed app · works offline'
    return
  }
  status.classList.add('is-wait')
  status.textContent = 'This browser cannot cache the talk'
}

// Helpful in rehearsal: confirm boot in the console without cluttering the stage
console.info(
  `%cCollections Revealed — Life in Salt%c  build ${__BUILD_ID__}%c\nSpace/→ next · ← back · 1–7 acts · T timer · R reset · H HUD`,
  'font-weight:bold;font-size:14px',
  'color:#888',
  'color:#888',
)
