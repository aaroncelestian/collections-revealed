import * as THREE from 'three'

/**
 * Paints an equirectangular Earth from Natural Earth vectors.
 *
 * Everything here is drawn at runtime with Canvas2D rather than shipped as
 * imagery: the talk has to run with no network, and a bundled Blue Marble at a
 * usable resolution is tens of megabytes. Vectors cost under a megabyte and
 * stay sharp when the camera pushes in on California and on Yorkshire.
 *
 * The palette is deliberately a muted cartographic Earth rather than a
 * satellite one. Two reasons: the stage is near-black behind elegant type and a
 * saturated globe fights it, and land colour here is a function of latitude
 * alone, so anything more literal would be quietly making up biomes.
 */

/** Flat [lon, lat, lon, lat, ...]. */
type Ring = number[]
/** Outer ring first, then holes. Winding is normalised by the build script. */
type Poly = Ring[]

interface WorldData {
  land: Poly[]
  borders: Ring[]
  lakes: Poly[]
}

const COLOR_W = 4096
const COLOR_H = 2048
/** Roughness and bump carry no edges worth resolving, so they run at quarter area. */
const MAP_W = 2048
const MAP_H = 1024

const OCEAN_DEEP = '#092038'
const OCEAN_MID = '#0d2a46'
const SHELF = '#15496b'
const LAKE = '#0c2740'
const COAST = '#b9c9bd'
const BORDER = '#cfe0ea'
const ICE = '#e9eff3'

/**
 * Land colour by latitude. Approximate zonal biomes — ice, tundra, boreal,
 * temperate, the two arid belts, tropics — mirrored across the equator.
 */
const LAND_BY_LAT: Array<[number, string]> = [
  [90, '#e9eff3'],
  [74, '#dfe7ec'],
  [69, '#8d9489'],
  [61, '#43533f'],
  [50, '#47593f'],
  [40, '#4f6146'],
  [32, '#6e6d51'],
  [25, '#877d5d'],
  [17, '#857a58'],
  [11, '#5e6a46'],
  [4, '#435a3c'],
  [-6, '#435a3c'],
  [-15, '#506045'],
  [-23, '#7d7454'],
  [-31, '#6a6a4c'],
  [-40, '#4a5a42'],
  [-50, '#6a6a5b'],
  [-60, '#a8b2b0'],
  [-68, '#dde6eb'],
  [-90, '#eef4f7'],
]

export interface WorldTextureSet {
  color: THREE.CanvasTexture
  roughness: THREE.CanvasTexture
  bump: THREE.CanvasTexture
}

function canvas2d(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  return { c, ctx }
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const smooth = (t: number) => t * t * (3 - 2 * t)

/**
 * Value-noise fBm. Wraps in x so the two edges of the texture meet cleanly at
 * the antimeridian — a seam there shows up as a bright line down the Pacific.
 */
function fbm(w: number, h: number, octaves: number, seed: number): Float32Array {
  const out = new Float32Array(w * h)
  let amp = 1
  let total = 0
  let gw = 8
  let gh = 4

  for (let o = 0; o < octaves; o++) {
    const rand = mulberry32(seed + o * 7919)
    const grid = new Float32Array(gw * gh)
    for (let i = 0; i < grid.length; i++) grid[i] = rand()

    for (let y = 0; y < h; y++) {
      const gy = (y / h) * gh
      const y0 = Math.floor(gy)
      const ty = smooth(gy - y0)
      const r0 = Math.min(y0, gh - 1) * gw
      const r1 = Math.min(y0 + 1, gh - 1) * gw

      for (let x = 0; x < w; x++) {
        const gx = (x / w) * gw
        const x0 = Math.floor(gx)
        const tx = smooth(gx - x0)
        const c0 = x0 % gw
        const c1 = (x0 + 1) % gw
        const a = grid[r0 + c0] + (grid[r0 + c1] - grid[r0 + c0]) * tx
        const b = grid[r1 + c0] + (grid[r1 + c1] - grid[r1 + c0]) * tx
        out[y * w + x] += (a + (b - a) * ty) * amp
      }
    }

    total += amp
    amp *= 0.5
    gw *= 2
    gh *= 2
  }

  for (let i = 0; i < out.length; i++) out[i] /= total
  return out
}

function noiseCanvas(w: number, h: number, octaves: number, seed: number) {
  const { c, ctx } = canvas2d(w, h)
  const field = fbm(w, h, octaves, seed)
  const img = ctx.createImageData(w, h)
  for (let i = 0; i < field.length; i++) {
    const v = Math.max(0, Math.min(255, Math.round(field[i] * 255)))
    img.data[i * 4] = v
    img.data[i * 4 + 1] = v
    img.data[i * 4 + 2] = v
    img.data[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return c
}

/**
 * Builds a Path2D in pixel space, drawing every shape three times at
 * 360-degree offsets.
 *
 * Longitudes are unwrapped first, so a ring that crosses the antimeridian —
 * Eurasia at Chukotka, Antarctica along its seam — stays a single continuous
 * curve instead of snapping back across the whole canvas. The copies either
 * side then supply whatever fell outside the frame. Fills must use nonzero;
 * even-odd would cancel out where two copies overlap.
 */
function pathFor(polys: Poly[], w: number, h: number): Path2D {
  const path = new Path2D()
  const sx = w / 360
  const sy = h / 180

  for (const poly of polys) {
    for (const ring of poly) {
      const n = ring.length / 2
      const lons = new Float64Array(n)
      lons[0] = ring[0]
      for (let i = 1; i < n; i++) {
        let lon = ring[i * 2]
        const drift = lon - lons[i - 1]
        if (drift > 180) lon -= 360
        else if (drift < -180) lon += 360
        lons[i] = lon
      }

      for (const offset of [-360, 0, 360]) {
        path.moveTo((lons[0] + offset + 180) * sx, (90 - ring[1]) * sy)
        for (let i = 1; i < n; i++) {
          path.lineTo((lons[i] + offset + 180) * sx, (90 - ring[i * 2 + 1]) * sy)
        }
        path.closePath()
      }
    }
  }
  return path
}

function linePathFor(lines: Ring[], w: number, h: number): Path2D {
  return pathFor(
    lines.map((l) => [l]),
    w,
    h
  )
}

function landGradient(ctx: CanvasRenderingContext2D, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  for (const [lat, color] of LAND_BY_LAT) {
    g.addColorStop(Math.min(1, Math.max(0, (90 - lat) / 180)), color)
  }
  return g
}

/** Yields to the browser so a half-second of painting never blocks a keypress. */
const breathe = () => new Promise<void>((r) => setTimeout(r, 0))

export async function buildWorldTextures(anisotropy: number): Promise<WorldTextureSet> {
  const world = ((await import('./world-data.json')) as { default: WorldData }).default

  const land = pathFor(world.land, COLOR_W, COLOR_H)
  const lakes = pathFor(world.lakes, COLOR_W, COLOR_H)
  const borders = linePathFor(world.borders, COLOR_W, COLOR_H)

  // ── Colour ────────────────────────────────────────────────────────────
  const { c: colorCanvas, ctx } = canvas2d(COLOR_W, COLOR_H)

  const oceanGrad = ctx.createLinearGradient(0, 0, 0, COLOR_H)
  oceanGrad.addColorStop(0, OCEAN_MID)
  oceanGrad.addColorStop(0.5, OCEAN_DEEP)
  oceanGrad.addColorStop(1, OCEAN_MID)
  ctx.fillStyle = oceanGrad
  ctx.fillRect(0, 0, COLOR_W, COLOR_H)

  // Large, very low-contrast mottling so the open ocean is not a dead flat
  // field. Reads as bathymetry without pretending to be it.
  ctx.save()
  ctx.globalAlpha = 0.16
  ctx.globalCompositeOperation = 'overlay'
  ctx.drawImage(noiseCanvas(512, 256, 4, 20482), 0, 0, COLOR_W, COLOR_H)
  ctx.restore()

  await breathe()

  // Continental shelf: a blurred copy of the landmass, tinted and laid back
  // over the ocean. This halo around every coast is most of what makes a globe
  // look photographed rather than drawn.
  const { c: shelfCanvas, ctx: shelfCtx } = canvas2d(COLOR_W, COLOR_H)
  shelfCtx.filter = 'blur(26px)'
  shelfCtx.fillStyle = '#ffffff'
  shelfCtx.fill(land, 'nonzero')
  shelfCtx.filter = 'none'
  shelfCtx.globalCompositeOperation = 'source-in'
  shelfCtx.fillStyle = SHELF
  shelfCtx.fillRect(0, 0, COLOR_W, COLOR_H)

  ctx.save()
  ctx.globalAlpha = 0.85
  ctx.drawImage(shelfCanvas, 0, 0)
  ctx.restore()

  await breathe()

  // ── Land ──────────────────────────────────────────────────────────────
  ctx.save()
  ctx.clip(land, 'nonzero')
  ctx.fillStyle = landGradient(ctx, COLOR_H)
  ctx.fillRect(0, 0, COLOR_W, COLOR_H)

  // Two octave sets: broad regional variation, then finer grain. Without this
  // the latitude gradient reads as horizontal stripes.
  ctx.globalCompositeOperation = 'overlay'
  ctx.globalAlpha = 0.55
  ctx.drawImage(noiseCanvas(1024, 512, 5, 1337), 0, 0, COLOR_W, COLOR_H)
  ctx.globalAlpha = 0.3
  ctx.drawImage(noiseCanvas(2048, 1024, 6, 777), 0, 0, COLOR_W, COLOR_H)
  ctx.restore()

  await breathe()

  // Lakes read as ocean, and they matter: the Great Lakes and the Caspian are
  // how an audience confirms they are looking at the real Earth.
  ctx.fillStyle = LAKE
  ctx.fill(lakes, 'nonzero')

  ctx.strokeStyle = BORDER
  ctx.globalAlpha = 0.22
  ctx.lineWidth = 1.1
  ctx.stroke(borders)
  ctx.globalAlpha = 1

  ctx.strokeStyle = COAST
  ctx.globalAlpha = 0.5
  ctx.lineWidth = 1.6
  ctx.stroke(land)
  ctx.globalAlpha = 0.34
  ctx.lineWidth = 1.1
  ctx.stroke(lakes)
  ctx.globalAlpha = 1

  // Arctic sea ice. Without it the north pole is an odd dark hole, since the
  // land gradient only whitens actual land.
  const iceGrad = ctx.createLinearGradient(0, 0, 0, (22 / 180) * COLOR_H)
  iceGrad.addColorStop(0, ICE)
  iceGrad.addColorStop(0.55, 'rgba(233, 239, 243, 0.62)')
  iceGrad.addColorStop(1, 'rgba(233, 239, 243, 0)')
  ctx.fillStyle = iceGrad
  ctx.fillRect(0, 0, COLOR_W, (22 / 180) * COLOR_H)

  await breathe()

  // ── Roughness ─────────────────────────────────────────────────────────
  // Both matte, water only slightly less so. A single directional light on a
  // glossy sphere does not read as sun on water — it reads as a smudge on the
  // lens, wherever the highlight lands. The sphere is sold by the terminator
  // and the atmosphere rim instead.
  const { c: roughCanvas, ctx: rctx } = canvas2d(MAP_W, MAP_H)
  const landSmall = pathFor(world.land, MAP_W, MAP_H)
  rctx.fillStyle = '#b4b4b4'
  rctx.fillRect(0, 0, MAP_W, MAP_H)
  rctx.fillStyle = '#f2f2f2'
  rctx.fill(landSmall, 'nonzero')
  rctx.fillStyle = '#bcbcbc'
  rctx.fill(pathFor(world.lakes, MAP_W, MAP_H), 'nonzero')

  // ── Bump ──────────────────────────────────────────────────────────────
  const { c: bumpCanvas, ctx: bctx } = canvas2d(MAP_W, MAP_H)
  bctx.fillStyle = '#808080'
  bctx.fillRect(0, 0, MAP_W, MAP_H)
  bctx.save()
  bctx.clip(landSmall, 'nonzero')
  bctx.drawImage(noiseCanvas(1024, 512, 6, 4242), 0, 0, MAP_W, MAP_H)
  bctx.restore()

  const color = new THREE.CanvasTexture(colorCanvas)
  color.colorSpace = THREE.SRGBColorSpace
  const roughness = new THREE.CanvasTexture(roughCanvas)
  const bump = new THREE.CanvasTexture(bumpCanvas)

  for (const tex of [color, roughness, bump]) {
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    tex.anisotropy = anisotropy
    tex.needsUpdate = true
  }

  return { color, roughness, bump }
}
