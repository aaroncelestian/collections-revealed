/// <reference lib="webworker" />
/**
 * Precache every talk asset during install, then serve from disk.
 * The page listens for CACHE_PROGRESS / CACHE_READY so the HUD can
 * tell the presenter when it is safe to kill wifi.
 */

const CACHE = 'life-in-salt-precache'
const MANIFEST = self.__WB_MANIFEST

self.addEventListener('install', (event) => {
  event.waitUntil(
    fillCache()
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[sw] precache failed', error)
        throw error
      }),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names.filter((name) => name !== CACHE).map((name) => caches.delete(name)),
      )
      await self.clients.claim()
      await broadcast({ type: 'CACHE_READY', total: entries().length })
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'GET_STATUS') return
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      const keys = await cache.keys()
      const total = entries().length
      const ready = keys.length >= total && total > 0
      await broadcast(
        ready
          ? { type: 'CACHE_READY', total }
          : { type: 'CACHE_PROGRESS', done: keys.length, total },
      )
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(cacheFirst(event.request))
})

function entries() {
  return MANIFEST.map((entry) => (typeof entry === 'string' ? entry : entry.url))
}

async function fillCache() {
  const cache = await caches.open(CACHE)
  const urls = entries()
  let done = 0
  for (const url of urls) {
    try {
      const request = new Request(url, { cache: 'reload' })
      const response = await fetch(request)
      if (!response.ok) throw new Error(`${response.status} ${url}`)
      await cache.put(request, response)
    } catch (error) {
      console.warn('[sw] skip', url, error)
    }
    done += 1
    await broadcast({ type: 'CACHE_PROGRESS', done, total: urls.length })
  }
  await broadcast({ type: 'CACHE_READY', total: urls.length })
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true })
  if (cached) return cached
  try {
    return await fetch(request)
  } catch (error) {
    if (request.mode === 'navigate') {
      const fallback =
        (await caches.match('./index.html')) || (await caches.match('index.html'))
      if (fallback) return fallback
    }
    throw error
  }
}

async function broadcast(data) {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })
  for (const client of clients) client.postMessage(data)
}
