import * as THREE from 'three'
import { EARTH_OUT_DISTANCE } from './GlobeDive'
import { BOULBY, faceGlobe } from './places'
import { atmosphereShell, starfield } from './space'
import { buildWorldTextures } from './worldTexture'
import type { SolarPhase } from '../beats/types'

/**
 * The last step out.
 *
 * Picks the Earth up exactly where `GlobeDive` hands it over — same painted
 * map, same lit rim, same face turned to the room — and keeps pulling back
 * until the whole system is on screen with the planets going round.
 *
 * Distances are compressed: laid out to true scale, Neptune's orbit is 30
 * times Earth's and every planet is far too small to see at all. Orbits here
 * go as the square root of their real radius and bodies as the 0.4 power of
 * theirs, which keeps the order and the rough proportions while leaving
 * something legible from the back of an auditorium. Periods are the only thing
 * left honest: they follow Kepler on the compressed radii, so the inner
 * planets visibly outrun the outer ones.
 */

/** Matches GlobeDive, so the cross-dissolve does not change lens. */
const FOV = 42

/** Earth's radius in scene units. Every other body is scaled off it. */
const EARTH_R = 0.16
/** Earth's orbit radius in scene units. */
const EARTH_ORBIT = 5
const SUN_R = 0.9

/** Seconds of stage time for one Earth year. */
const EARTH_YEAR_S = 16

/** How long the camera takes to get from the planet out to the whole system. */
const PULL_SECONDS = 15
/** Degrees above the orbital plane the wide shot settles at. */
const WIDE_TILT = THREE.MathUtils.degToRad(26)
/** Clear of the outermost orbit, so nothing sits on the frame edge. */
const WIDE_MARGIN = 1.12

/**
 * GlobeDive's key light, in its camera's space: front, up and to the right.
 * The hand-over pose is built to put the sun in the same place, or the planet
 * appears to relight itself mid-dissolve.
 */
const GLOBE_LIGHT = new THREE.Vector3(1.7, 1.3, 3.0).normalize()

const WORLD_UP = new THREE.Vector3(0, 1, 0)
const ORIGIN = new THREE.Vector3(0, 0, 0)

interface PlanetSpec {
  name: string
  /** Real semi-major axis, AU. */
  au: number
  /** Real radius, Earth radii. */
  radii: number
  color: number
  /** Where it starts, in degrees. Hand-picked so nothing lines up. */
  phase: number
  /** Obliquity of the ring system, degrees. Saturn only. */
  ring?: number
}

const PLANETS: PlanetSpec[] = [
  { name: 'Mercury', au: 0.387, radii: 0.383, color: 0x8d8578, phase: 130 },
  { name: 'Venus', au: 0.723, radii: 0.949, color: 0xd8c39a, phase: 215 },
  { name: 'Earth', au: 1, radii: 1, color: 0x0d2743, phase: 0 },
  { name: 'Mars', au: 1.524, radii: 0.532, color: 0xb5613c, phase: 50 },
  { name: 'Jupiter', au: 5.203, radii: 11.21, color: 0xcaa885, phase: 300 },
  { name: 'Saturn', au: 9.537, radii: 9.45, color: 0xd8c08a, phase: 95, ring: 27 },
  { name: 'Uranus', au: 19.19, radii: 4.01, color: 0x9ec9d4, phase: 170 },
  { name: 'Neptune', au: 30.07, radii: 3.88, color: 0x6d8fd0, phase: 250 },
]

const orbitRadius = (au: number) => EARTH_ORBIT * Math.sqrt(au)
const bodyRadius = (radii: number) => EARTH_R * radii ** 0.4
const periodSeconds = (au: number) => EARTH_YEAR_S * Math.sqrt(au) ** 3

interface Body {
  spec: PlanetSpec
  group: THREE.Group
  orbit: number
  period: number
}

export interface SolarSystemHandle {
  setPhase: (phase: SolarPhase) => void
  /**
   * Size the opening pose off the globe's live altitude, so the Earth being
   * dissolved away and the Earth being dissolved in are the same Earth at the
   * same size. Both cameras share a lens, so matching apparent size is just
   * matching the ratio of radius to distance.
   */
  matchEarth: (globeDistance: number) => void
  setVisible: (visible: boolean) => void
  setRendering: (on: boolean) => void
  resize: () => void
  dispose: () => void
}

/** Faint ring on the orbital plane, at the weight of the globe's graticule. */
function orbitLine(radius: number): THREE.LineLoop {
  const points: THREE.Vector3[] = []
  for (let i = 0; i < 180; i++) {
    const a = (i / 180) * Math.PI * 2
    points.push(new THREE.Vector3(Math.sin(a) * radius, 0, Math.cos(a) * radius))
  }
  return new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0x8fc4ea, transparent: true, opacity: 0.16 })
  )
}

/** Corona, as a camera-facing gradient. A lit sphere alone reads as a ball. */
function sunGlow(): THREE.Sprite {
  const size = 128
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255, 246, 219, 0.95)')
  g.addColorStop(0.16, 'rgba(255, 228, 165, 0.5)')
  g.addColorStop(0.44, 'rgba(255, 190, 100, 0.14)')
  g.addColorStop(1, 'rgba(255, 170, 80, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    })
  )
  sprite.scale.setScalar(SUN_R * 9)
  return sprite
}

export function startSolarSystem(canvas: HTMLCanvasElement): SolarSystemHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.setClearColor(0x05070c, 1)

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 4000)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x05070c)
  scene.add(starfield(1400, 220))

  // Same rig as the globe, down to the numbers: an ambient fill plus one
  // source at the sun. Decay is off so Neptune is lit like Mercury — with
  // real falloff the outer planets are black and the shot has four planets.
  scene.add(new THREE.AmbientLight(0xbfd4e8, 0.55))
  const sunLight = new THREE.PointLight(0xfff4e6, 1.15, 0, 0)
  scene.add(sunLight)

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(SUN_R, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff1c4, toneMapped: false })
  )
  scene.add(sun)
  scene.add(sunGlow())

  // ── Bodies ────────────────────────────────────────────────────────────
  const bodies: Body[] = []
  let earthMesh: THREE.Mesh | null = null
  let earthMat: THREE.MeshStandardMaterial | null = null

  for (const spec of PLANETS) {
    const orbit = orbitRadius(spec.au)
    const radius = bodyRadius(spec.radii)
    scene.add(orbitLine(orbit))

    const group = new THREE.Group()
    const material = new THREE.MeshStandardMaterial({
      color: spec.color,
      roughness: 0.92,
      metalness: 0,
    })
    const isEarth = spec.name === 'Earth'
    const mesh = new THREE.Mesh(
      // Only the Earth is ever seen close up; the rest are dots.
      new THREE.SphereGeometry(radius, isEarth ? 96 : 24, isEarth ? 64 : 16),
      material
    )
    group.add(mesh)

    if (isEarth) {
      earthMesh = mesh
      earthMat = material
      group.add(atmosphereShell(radius))
    }

    if (spec.ring !== undefined) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius * 1.4, radius * 2.3, 64),
        new THREE.MeshBasicMaterial({
          color: 0xd9c9a4,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
        })
      )
      ring.rotation.x = Math.PI / 2 - THREE.MathUtils.degToRad(spec.ring)
      group.add(ring)
    }

    scene.add(group)
    bodies.push({ spec, group, orbit, period: periodSeconds(spec.au) })
  }

  const earth = bodies.find((b) => b.spec.name === 'Earth')!

  // ── State ─────────────────────────────────────────────────────────────
  let phase: SolarPhase = 'earth'
  let rendering = true
  let visible = false
  let disposed = false

  /** Orbit clock. Only runs on stage, so the opening pose is repeatable. */
  let orbitTime = 0
  let pullProgress = 0
  let closeDistance = EARTH_R * EARTH_OUT_DISTANCE
  let wideDistance = 60

  // Already painted for the globe, so this resolves immediately and hands back
  // the very same textures.
  buildWorldTextures(renderer.capabilities.getMaxAnisotropy())
    .then((tex) => {
      if (disposed || !earthMat) return
      earthMat.map = tex.color
      earthMat.roughnessMap = tex.roughness
      earthMat.bumpMap = tex.bump
      earthMat.bumpScale = 0.004 * EARTH_R
      earthMat.color.set(0xffffff)
      earthMat.roughness = 1
      earthMat.needsUpdate = true
    })
    .catch(() => {
      // The globe already logged it. A plain blue marble still reads as Earth.
    })

  const closeDir = new THREE.Vector3()
  const wideDir = new THREE.Vector3()
  const anchor = new THREE.Vector3()
  const _dir = new THREE.Vector3()
  const _pos = new THREE.Vector3()

  function bodyPosition(body: Body, out: THREE.Vector3): THREE.Vector3 {
    const a = THREE.MathUtils.degToRad(body.spec.phase) + (orbitTime / body.period) * Math.PI * 2
    return out.set(Math.sin(a) * body.orbit, 0, Math.cos(a) * body.orbit)
  }

  /**
   * Where the camera has to sit for the sun to land in the same corner of the
   * frame as the globe scene's key light. Built from the camera basis it will
   * end up with, so the planet's terminator carries straight through the cut.
   */
  function handoverDirection(earthPos: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    const toSun = earthPos.clone().negate().normalize()
    const right = new THREE.Vector3().crossVectors(WORLD_UP, toSun).normalize()
    const up = new THREE.Vector3().crossVectors(toSun, right).normalize()
    return out
      .copy(toSun)
      .multiplyScalar(GLOBE_LIGHT.z)
      .addScaledVector(right, -GLOBE_LIGHT.x)
      .addScaledVector(up, -GLOBE_LIGHT.y)
      .normalize()
  }

  /** Rewind to the pose the globe hands over, and face the planet the same way. */
  function armHandover() {
    orbitTime = 0
    pullProgress = 0
    phase = 'earth'

    bodyPosition(earth, anchor)
    handoverDirection(anchor, closeDir)

    // Same azimuth, lifted above the plane: the camera only ever backs away
    // and climbs, so it can never swing through the sun on its way out.
    wideDir
      .set(closeDir.x, 0, closeDir.z)
      .normalize()
      .multiplyScalar(Math.cos(WIDE_TILT))
      .addScaledVector(WORLD_UP, Math.sin(WIDE_TILT))
      .normalize()

    if (earthMesh) {
      // Same face as GlobeDive's earth-out (Boulby + pole tip). Searles here
      // used to match an older pull-back that centred California; after that
      // pose moved to England the dissolve was recentering North America.
      const face = new THREE.Matrix4().lookAt(closeDir, ORIGIN, WORLD_UP)
      earthMesh.quaternion.setFromRotationMatrix(face).multiply(faceGlobe(BOULBY[0], BOULBY[1]))
    }
  }

  function setPhase(next: SolarPhase) {
    if (next === phase) return
    phase = next
    if (next === 'earth') pullProgress = 0
  }

  const easeInOutCubic = (t: number) => {
    const x = THREE.MathUtils.clamp(t, 0, 1)
    return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
  }

  const smoothstep = (edge0: number, edge1: number, x: number) => {
    const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1)
    return t * t * (3 - 2 * t)
  }

  function update(dt: number) {
    orbitTime += dt
    for (const body of bodies) body.group.position.copy(bodyPosition(body, _pos))

    if (phase === 'system') {
      pullProgress = Math.min(1, pullProgress + dt / PULL_SECONDS)
    }
    const e = easeInOutCubic(pullProgress)

    // Apparent size goes as one over distance, so the pull is interpolated
    // geometrically. Lerping the distance instead spends the first half of the
    // move barely changing the picture and the second half tearing away.
    const distance = closeDistance * (wideDistance / closeDistance) ** e

    // The frame holds the planet until it is small, then hands the middle of
    // the shot to the sun.
    bodyPosition(earth, _pos)
    anchor.copy(_pos).multiplyScalar(1 - smoothstep(0.1, 0.72, e))

    _dir.copy(closeDir).lerp(wideDir, e).normalize()
    camera.position.copy(anchor).addScaledVector(_dir, distance)
    camera.up.copy(WORLD_UP)
    camera.lookAt(anchor)
  }

  function resize() {
    const rect = canvas.getBoundingClientRect()
    const w = Math.max(1, Math.round(rect.width) || window.innerWidth)
    const h = Math.max(1, Math.round(rect.height) || window.innerHeight)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)

    // Frame the outermost orbit rather than trusting a fixed number: a 16:10
    // projector is a lot narrower than the laptop this was built on, and
    // Neptune falling off the side of the screen is the one thing the wide
    // shot cannot survive.
    const half = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
    const outer = bodies[bodies.length - 1].orbit * WIDE_MARGIN
    wideDistance = Math.max(
      outer / (half * camera.aspect),
      (outer * Math.sin(WIDE_TILT)) / half
    )
  }
  resize()
  window.addEventListener('resize', resize)

  armHandover()

  const clock = new THREE.Clock()
  function tick() {
    if (disposed) return
    requestAnimationFrame(tick)
    const dt = Math.min(0.05, clock.getDelta())
    if (!rendering) return
    update(dt)
    renderer.render(scene, camera)
  }
  tick()

  return {
    setPhase,
    matchEarth(globeDistance: number) {
      // Clamped so a stray call can never park the camera inside the sun.
      closeDistance = THREE.MathUtils.clamp(EARTH_R * globeDistance, EARTH_R * 2, 3)
    },
    setVisible(next: boolean) {
      if (next === visible) return
      visible = next
      canvas.style.opacity = next ? '1' : '0'
      if (!next) return
      // Coming on stage rewinds the move, so stepping back and pressing again
      // replays it rather than landing on the wide shot already arrived.
      resize()
      armHandover()
    },
    setRendering(on: boolean) {
      rendering = on
    },
    resize,
    dispose() {
      disposed = true
      window.removeEventListener('resize', resize)
      renderer.dispose()
    },
  }
}
