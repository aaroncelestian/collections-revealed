#!/usr/bin/env node
//
// Bakes Natural Earth vector data into one compact JSON file the globe can
// import directly, so the running talk has no map dependency and no network.
//
// Re-run only when you want different source data:
//   node scripts/build-world-data.mjs
//
// Output: src/scene/world-data.json

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { feature, mesh } from 'topojson-client'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = resolve(ROOT, '.cache')
const OUT = resolve(ROOT, 'src/scene/world-data.json')

const LAKES_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_lakes.geojson'

/** ~1 km at the equator. Far finer than a 4096px-wide texture can resolve. */
const PRECISION = 2

function roundRing(coords) {
  const flat = []
  let lastLon = NaN
  let lastLat = NaN
  for (const [lon, lat] of coords) {
    const x = Number(lon.toFixed(PRECISION))
    const y = Number(lat.toFixed(PRECISION))
    if (x === lastLon && y === lastLat) continue // rounding collapsed a point
    flat.push(x, y)
    lastLon = x
    lastLat = y
  }
  return flat
}

/** Shoelace area. Sign gives the winding direction. */
function signedArea(ring) {
  let a = 0
  for (let i = 0, n = ring.length; i < n; i += 2) {
    const j = (i + 2) % n
    a += ring[i] * ring[j + 1] - ring[j] * ring[i + 1]
  }
  return a / 2
}

function reverse(ring) {
  const out = []
  for (let i = ring.length - 2; i >= 0; i -= 2) out.push(ring[i], ring[i + 1])
  return out
}

/** Longest edge of the bounding box, in degrees. */
function span(ring) {
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  for (let i = 0; i < ring.length; i += 2) {
    x0 = Math.min(x0, ring[i])
    x1 = Math.max(x1, ring[i])
    y0 = Math.min(y0, ring[i + 1])
    y1 = Math.max(y1, ring[i + 1])
  }
  return Math.max(x1 - x0, y1 - y0)
}

/** Below this a shape is under two pixels on a 4096px-wide texture. */
const MIN_SPAN_DEG = 0.15

/**
 * GeoJSON Polygon/MultiPolygon -> array of [outerRing, ...holes].
 *
 * Winding is normalised — outer rings counter-clockwise, holes clockwise — so
 * the renderer can use nonzero fill. Nonzero matters because the antimeridian
 * is handled by drawing each shape three times at 360-degree offsets, and
 * even-odd would punch a hole wherever two of those copies overlap.
 */
function polygons(geometry) {
  const out = []
  const push = (rings) => {
    const kept = rings.map(roundRing).filter((r) => r.length >= 6)
    if (!kept.length || span(kept[0]) < MIN_SPAN_DEG) return
    out.push(
      kept.map((ring, i) => {
        const wantPositive = i === 0
        return signedArea(ring) < 0 === wantPositive ? reverse(ring) : ring
      })
    )
  }
  if (geometry.type === 'Polygon') push(geometry.coordinates)
  else if (geometry.type === 'MultiPolygon') geometry.coordinates.forEach(push)
  return out
}

async function lakeData() {
  mkdirSync(CACHE, { recursive: true })
  const cached = resolve(CACHE, 'ne_50m_lakes.geojson')
  if (!existsSync(cached)) {
    process.stdout.write('   fetching lakes from Natural Earth... ')
    const res = await fetch(LAKES_URL)
    if (!res.ok) throw new Error(`lakes fetch failed: ${res.status}`)
    writeFileSync(cached, await res.text())
    process.stdout.write('cached\n')
  }
  const geo = JSON.parse(readFileSync(cached, 'utf8'))
  // scalerank 0-2 is the set that is still legible on a globe. Everything
  // finer just speckles the continents with noise at this texture size.
  return geo.features
    .filter((f) => (f.properties.scalerank ?? 99) <= 2)
    .flatMap((f) => polygons(f.geometry))
}

const landTopo = JSON.parse(
  readFileSync(resolve(ROOT, 'node_modules/world-atlas/land-50m.json'), 'utf8')
)
const countryTopo = JSON.parse(
  readFileSync(resolve(ROOT, 'node_modules/world-atlas/countries-110m.json'), 'utf8')
)

console.log('==> land (Natural Earth 1:50m)')
const land = feature(landTopo, landTopo.objects.land).features.flatMap((f) =>
  polygons(f.geometry)
)

console.log('==> borders (Natural Earth 1:110m, interior only)')
// Interior mesh, so shared borders are drawn once and no coastline is
// doubled up underneath the coast stroke.
const borderMesh = mesh(countryTopo, countryTopo.objects.countries, (a, b) => a !== b)
const borders = borderMesh.coordinates.map(roundRing).filter((r) => r.length >= 4)

console.log('==> lakes (Natural Earth 1:50m)')
const lakes = await lakeData()

const payload = { land, borders, lakes }
const json = JSON.stringify(payload)
writeFileSync(OUT, json)

const points = (set) => set.reduce((n, p) => n + p.reduce((m, r) => m + r.length / 2, 0), 0)
console.log(
  `==> ${OUT.replace(ROOT + '/', '')}  ${(json.length / 1024).toFixed(0)} kB\n` +
    `    land ${land.length} polygons / ${points(land)} points\n` +
    `    borders ${borders.length} lines / ${borders.reduce((n, r) => n + r.length / 2, 0)} points\n` +
    `    lakes ${lakes.length} polygons / ${points(lakes)} points`
)
