export type OfflineState =
  | { kind: 'dev' }
  | { kind: 'file' }
  | { kind: 'caching'; done: number; total: number }
  | { kind: 'ready'; canInstall: boolean }
  | { kind: 'installed' }
  | { kind: 'unsupported' }

type InstallPrompt = Event & { prompt: () => Promise<void> }

export function startOffline(paint: (state: OfflineState) => void): {
  install: () => Promise<void>
} {
  let promptEvent: InstallPrompt | null = null
  let canInstall = false
  let ready = false
  let done = 0
  let total = 0

  const installed = () =>
    window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)')
      .matches

  const emit = () => {
    if (installed()) {
      paint({ kind: 'installed' })
      return
    }
    if (ready) {
      paint({ kind: 'ready', canInstall })
      return
    }
    paint({ kind: 'caching', done, total })
  }

  if (location.protocol === 'file:') {
    paint({ kind: 'file' })
    return { install: async () => undefined }
  }

  if (!import.meta.env.PROD) {
    paint({ kind: 'dev' })
    return { install: async () => undefined }
  }

  if (!('serviceWorker' in navigator)) {
    paint({ kind: 'unsupported' })
    return { install: async () => undefined }
  }

  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as { type?: string; done?: number; total?: number }
    if (data?.type === 'CACHE_PROGRESS') {
      done = data.done ?? 0
      total = data.total ?? 0
      emit()
    }
    if (data?.type === 'CACHE_READY') {
      ready = true
      total = data.total ?? total
      done = total
      emit()
    }
  })

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    promptEvent = event as InstallPrompt
    canInstall = true
    emit()
  })

  window.addEventListener('appinstalled', () => {
    promptEvent = null
    canInstall = false
    paint({ kind: 'installed' })
  })

  void navigator.storage?.persist?.()

  const swUrl = new URL('sw.js', `${location.origin}${import.meta.env.BASE_URL}`)
  void navigator.serviceWorker
    .register(swUrl.href)
    .then(async (registration) => {
      const worker =
        registration.installing || registration.waiting || registration.active
      worker?.postMessage({ type: 'GET_STATUS' })
      if (registration.active && !registration.installing) {
        ready = true
        emit()
      }
    })
    .catch((error) => {
      console.warn('[offline] service worker failed', error)
    })

  emit()

  return {
    async install() {
      if (!promptEvent) return
      await promptEvent.prompt()
      promptEvent = null
      canInstall = false
      emit()
    },
  }
}
