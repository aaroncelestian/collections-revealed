import * as THREE from 'three'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { BOULBY, SEARLES } from './places'
import { buildWorldTextures } from './worldTexture'
import type { GlobePhase } from '../beats/types'

const DEG = Math.PI / 180
const GLOBE_R = 1

/** Metres of real rock per world unit in the shaft, so 1,100 m is 110 units. */
const SHAFT_M_PER_UNIT = 10
const SHAFT_DEPTH_M = 1100
const SHAFT_UNITS = SHAFT_DEPTH_M / SHAFT_M_PER_UNIT
/**
 * Shaft radius. Deliberately tight against the 110-unit drop: the walls are the
 * only thing telling the eye how fast it is falling, and the closer they are
 * the faster the fall reads.
 */
const SHAFT_R = 3.6

/** Orbit to ground, before the shaft takes over. */
const PLUNGE_SECONDS = 4.6
/**
 * Where the plunge stops, in globe radii. The map is 4096px around, so below
 * roughly this altitude it magnifies into mush — the screen is already black by
 * the time we arrive, and that darkness is the handover into the shaft.
 */
const PLUNGE_END_DISTANCE = 1.18

/**
 * The fall down the shaft. Long on purpose — the house lights come down over
 * this, and the room needs to arrive underground before the next beat.
 */
const SHAFT_SECONDS = 30

interface PhasePose {
  /** Camera distance from globe centre. */
  distance: number
  lonLat: [number, number] | null
  spin: boolean
}

/**
 * Close enough to place the pin, far enough that the continent around it is
 * still recognisable. The map is real data, so these can push in further than
 * the old schematic outlines allowed.
 */
const GLOBE_POSES: Record<string, PhasePose> = {
  world: { distance: 3.3, lonLat: [-70, 20], spin: true },
  searles: { distance: 2.55, lonLat: SEARLES, spin: false },
  arc: { distance: 3.0, lonLat: null, spin: false },
  'boulby-surface': { distance: 2.5, lonLat: BOULBY, spin: false },
}

function lonLatToVec3(lon: number, lat: number, r = GLOBE_R): THREE.Vector3 {
  const phi = (90 - lat) * DEG
  const theta = (lon + 180) * DEG
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  )
}

/**
 * Rotation that swings a lon/lat round to face the camera with north up.
 * Done as two steps because `setFromUnitVectors` alone leaves arbitrary roll,
 * which reads as the planet lolling sideways.
 */
function orientationFor(lon: number, lat: number): THREE.Quaternion {
  const target = lonLatToVec3(lon, lat).normalize()
  const q = new THREE.Quaternion().setFromUnitVectors(target, new THREE.Vector3(0, 0, 1))
  const north = new THREE.Vector3(0, 1, 0).applyQuaternion(q)
  const roll = Math.atan2(north.x, north.y)
  return q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll))
}

/** Procedural sedimentary strata, with the Permian salt seam near the bottom. */
function strataTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 1024
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#2a2018'
  ctx.fillRect(0, 0, c.width, c.height)

  let y = 0
  let seed = 1337
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  while (y < c.height) {
    const h = 6 + rand() * 30
    const v = 26 + rand() * 46
    const warm = rand() * 22
    ctx.fillStyle = `rgb(${v + warm}, ${v + warm * 0.6}, ${v * 0.82})`
    ctx.fillRect(0, y, c.width, h)
    if (rand() > 0.86) {
      ctx.fillStyle = `rgba(190, 176, 150, ${0.12 + rand() * 0.2})`
      ctx.fillRect(0, y, c.width, Math.min(h, 4))
    }
    y += h
  }

  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  // Tight banding: each seam that whips past the camera is a speed cue, and a
  // thirty-second fall needs a lot of them.
  tex.repeat.set(2, 26)
  return tex
}

/** Pale, blotchy, faintly veined — rock salt under a lamp. */
function saltTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 512
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#d8d0bd'
  ctx.fillRect(0, 0, c.width, c.height)

  let seed = 7
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }

  // Crystalline blotching. A smooth wall at a constant distance from a single
  // lamp renders as one flat colour, so the surface has to carry the interest.
  for (let i = 0; i < 1600; i++) {
    const v = Math.floor(196 + rand() * 58)
    ctx.fillStyle = `rgba(${v}, ${v - 6}, ${v - 22}, ${0.06 + rand() * 0.16})`
    ctx.beginPath()
    ctx.arc(rand() * c.width, rand() * c.height, 2 + rand() * 26, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 90; i++) {
    ctx.strokeStyle = `rgba(116, 104, 84, ${0.05 + rand() * 0.13})`
    ctx.lineWidth = 0.6 + rand() * 2.6
    ctx.beginPath()
    ctx.moveTo(rand() * c.width, rand() * c.height)
    ctx.lineTo(rand() * c.width, rand() * c.height)
    ctx.stroke()
  }

  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(5, 2)
  return tex
}

export interface GlobeDiveHandle {
  setPhase: (phase: GlobePhase) => void
  setVisible: (visible: boolean) => void
  setRendering: (on: boolean) => void
  resize: () => void
  dispose: () => void
}

export interface GlobeDiveOptions {
  /** Fired every frame during the shaft descent with the current depth. */
  onDepth?: (metres: number | null) => void
  /** Full-screen element used to hide the scene swap at the top of the shaft. */
  fadeEl?: HTMLElement
}

/**
 * Searles Lake to a kilometre under the North Sea, in one continuous move.
 *
 * Two scenes share one renderer: a vector globe for the surface journey, and a
 * procedural shaft for the descent. The swap is hidden behind a short DOM fade
 * rather than a hard cut.
 */
export function startGlobeDive(
  canvas: HTMLCanvasElement,
  options: GlobeDiveOptions = {}
): GlobeDiveHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.setClearColor(0x05070c, 1)

  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 2000)

  // ── Globe scene ───────────────────────────────────────────────────────
  const globeScene = new THREE.Scene()
  globeScene.background = new THREE.Color(0x05070c)
  const globeGroup = new THREE.Group()
  globeScene.add(globeGroup)

  // Starts as plain water and picks up the painted map a moment later, so a
  // slow first paint can never delay the talk booting.
  const earthMat = new THREE.MeshStandardMaterial({
    color: 0x0d2743,
    roughness: 0.92,
    metalness: 0,
  })
  const earth = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_R, 128, 96), earthMat)
  globeGroup.add(earth)

  globeScene.add(atmosphere())
  globeScene.add(starfield(1400))

  // Faint enough to read as a map graticule rather than a wireframe. It stays
  // as 3D lines so it holds a crisp single-pixel weight at every zoom, which
  // baking it into the texture would not.
  const graticule = new THREE.LineSegments(
    graticuleGeometry(),
    new THREE.LineBasicMaterial({ color: 0x8fc4ea, transparent: true, opacity: 0.13 })
  )
  globeGroup.add(graticule)

  const fatMaterials: LineMaterial[] = []

  const searlesPin = makePin(0xff4f8a)
  searlesPin.position.copy(lonLatToVec3(SEARLES[0], SEARLES[1], GLOBE_R))
  searlesPin.lookAt(0, 0, 0)
  globeGroup.add(searlesPin)

  const boulbyPin = makePin(0xffe566)
  boulbyPin.position.copy(lonLatToVec3(BOULBY[0], BOULBY[1], GLOBE_R))
  boulbyPin.lookAt(0, 0, 0)
  boulbyPin.visible = false
  globeGroup.add(boulbyPin)

  // Great-circle arc, drawn progressively by regrowing the geometry.
  const ARC_SEGMENTS = 180
  const arcPoints = greatCirclePoints(SEARLES, BOULBY, ARC_SEGMENTS)
  const ARC_OPACITY = 0.98
  const arcMat = new LineMaterial({
    color: 0xffe566,
    linewidth: 5,
    transparent: true,
    opacity: ARC_OPACITY,
    dashed: false,
  })
  fatMaterials.push(arcMat)
  const arcGeo = new LineGeometry()
  arcGeo.setPositions(arcPoints.flatMap((p) => [p.x, p.y, p.z]))
  const arcLine = new Line2(arcGeo, arcMat)
  arcLine.visible = false
  // Line2 widens the line in screen space after culling is decided, so a line
  // grazing the frustum edge can be dropped while its stroke would still show.
  // One object, so the test is not worth keeping.
  arcLine.frustumCulled = false
  globeGroup.add(arcLine)

  let arcDrawn = -1
  /**
   * Grows the flight path by revealing more of the geometry, never by rebuilding
   * it. Re-running `setPositions` each frame silently pins the draw to a single
   * segment: three caches a maximum instance count off the first buffer it sees,
   * which is the two-point stub the arc starts from.
   */
  function drawArc(count: number) {
    const clamped = Math.max(0, Math.min(count, arcPoints.length))
    if (clamped === arcDrawn) return
    arcDrawn = clamped
    arcGeo.instanceCount = Math.max(0, clamped - 1)
    arcLine.visible = clamped >= 2
  }

  const arcHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  )
  arcHead.visible = false
  globeGroup.add(arcHead)

  // Nearly head-on, only slightly off the camera axis. A dramatic raking sun
  // looks better in isolation but drops whichever pin we are pointing at into
  // shadow, and the pin is the whole reason the globe is on screen.
  globeScene.add(new THREE.AmbientLight(0xbfd4e8, 0.55))
  const sun = new THREE.DirectionalLight(0xfff4e6, 1.15)
  sun.position.set(1.7, 1.3, 3.0)
  globeScene.add(sun)

  // ── Shaft scene ───────────────────────────────────────────────────────
  const shaftScene = new THREE.Scene()
  shaftScene.background = new THREE.Color(0x03040a)
  // Short throw. You should never see far enough down the shaft to know what is
  // coming, which is most of why a hole in the ground is frightening.
  shaftScene.fog = new THREE.Fog(0x03040a, 3.5, 24)

  // Runs from above the camera's start down to exactly the bottom of the fall,
  // where the salt chamber takes over.
  const SHAFT_TOP = 30
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(SHAFT_R, SHAFT_R, SHAFT_UNITS + SHAFT_TOP, 40, 1, true),
    new THREE.MeshStandardMaterial({
      map: strataTexture(),
      side: THREE.BackSide,
      roughness: 1,
      metalness: 0,
    })
  )
  shaft.position.y = (SHAFT_TOP - SHAFT_UNITS) / 2
  shaftScene.add(shaft)

  // Ring beams: without them a descent has no sense of speed. Spacing is set so
  // one passes roughly every half second at full fall speed.
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x8d949c, roughness: 0.7, metalness: 0.3 })
  for (let y = 0; y > -SHAFT_UNITS; y -= 3.5) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(SHAFT_R - 0.2, 0.1, 6, 24), ringMat)
    ring.rotation.x = Math.PI / 2
    ring.position.y = y
    shaftScene.add(ring)
  }

  // Shaft lamps, unlit so they stay hot against the fog and streak past as
  // hard points of light. Cheaper than real lights and a stronger speed cue.
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd8a0, toneMapped: false })
  const lampGeo = new THREE.BoxGeometry(0.16, 0.5, 0.16)
  for (let y = -2; y > -SHAFT_UNITS; y -= 7) {
    for (const side of [1, -1]) {
      const lamp = new THREE.Mesh(lampGeo, lampMat)
      lamp.position.set(side * (SHAFT_R - 0.3), y, 0)
      shaftScene.add(lamp)
    }
  }

  // The salt seam at the bottom: the shaft opens out into a pale chamber.
  //
  // This used to be a horizontal drift running off to one side, which never
  // worked — the camera ended up outside the shaft tube with the two cylinders
  // cutting through each other. A chamber the shaft simply drops into is both
  // easier to light and closer to the truth of arriving in the salt.
  // Wide and low, so the camera can hold floor, wall and ceiling at once.
  const CHAMBER_R = 16
  const CHAMBER_TOP = -SHAFT_UNITS
  const CHAMBER_H = 22
  const salt = saltTexture()
  const saltMat = new THREE.MeshStandardMaterial({
    map: salt,
    color: 0xfff6e6,
    side: THREE.BackSide,
    roughness: 0.8,
    metalness: 0,
  })
  const chamber = new THREE.Mesh(
    new THREE.CylinderGeometry(CHAMBER_R, CHAMBER_R, CHAMBER_H, 48, 1, true),
    saltMat
  )
  chamber.position.y = CHAMBER_TOP - CHAMBER_H / 2
  shaftScene.add(chamber)

  const capMat = new THREE.MeshStandardMaterial({
    map: salt,
    color: 0xfff6e6,
    roughness: 0.88,
    metalness: 0,
  })
  const chamberFloor = new THREE.Mesh(new THREE.CircleGeometry(CHAMBER_R, 48), capMat)
  chamberFloor.rotation.x = -Math.PI / 2
  chamberFloor.position.y = CHAMBER_TOP - CHAMBER_H
  shaftScene.add(chamberFloor)

  // A ring, not a disc: the hole in the middle is the shaft you just fell down,
  // and having it overhead is what gives the chamber its sense of depth.
  const chamberRoof = new THREE.Mesh(new THREE.RingGeometry(SHAFT_R, CHAMBER_R, 48), capMat)
  chamberRoof.rotation.x = Math.PI / 2
  chamberRoof.position.y = CHAMBER_TOP
  shaftScene.add(chamberRoof)

  // Almost no fill. What the headlamp does not reach stays black.
  const SHAFT_AMBIENT = 0.1
  const SHAFT_LAMP = 3.4
  // Cold blue-grey in the shaft, warm and pale once the salt is in shot.
  const AMBIENT_ROCK = new THREE.Color(0x6d7f92)
  const AMBIENT_SALT = new THREE.Color(0xe4ded0)
  const ambient = new THREE.AmbientLight(0x6d7f92, SHAFT_AMBIENT)
  shaftScene.add(ambient)
  const headlamp = new THREE.PointLight(0xffe9c0, SHAFT_LAMP, 22, 1.7)
  shaftScene.add(headlamp)

  // ── State ─────────────────────────────────────────────────────────────
  let phase: GlobePhase = 'world'
  let mode: 'globe' | 'shaft' = 'globe'
  let rendering = true
  let visible = false
  let disposed = false

  let distance = GLOBE_POSES.world.distance
  let targetDistance = distance
  const quat = orientationFor(GLOBE_POSES.world.lonLat![0], GLOBE_POSES.world.lonLat![1])
  const targetQuat = quat.clone()
  globeGroup.quaternion.copy(quat)
  let spin = true

  let arcProgress = 0
  let arcRunning = false
  let plungeProgress = 0
  let plungeRunning = false
  let plungeFrom = 0
  let shaftProgress = 0
  let shaftRunning = false
  let seamProgress = 0
  let seamRunning = false

  const clock = new THREE.Clock()

  // Painting the map costs a few hundred milliseconds of Canvas2D work, so it
  // runs off the boot path. The globe is not on screen until about 1:30 in.
  buildWorldTextures(renderer.capabilities.getMaxAnisotropy())
    .then((tex) => {
      if (disposed) return
      earthMat.map = tex.color
      earthMat.roughnessMap = tex.roughness
      earthMat.bumpMap = tex.bump
      earthMat.bumpScale = 0.004
      // Both maps are multiplied by these, so they have to be neutral.
      earthMat.color.set(0xffffff)
      earthMat.roughness = 1
      earthMat.needsUpdate = true
    })
    .catch((error) => {
      // A flat blue sphere is a poor globe but it is still a globe. Losing the
      // texture must not lose the scene.
      console.warn('[globe] map texture failed; falling back to plain ocean', error)
    })

  function fade(to: number, ms: number) {
    const el = options.fadeEl
    if (!el) return
    el.style.transition = `opacity ${ms}ms ease`
    el.style.opacity = String(to)
  }

  /** Same cover, driven a frame at a time so it can track the fall. */
  function setFade(to: number) {
    const el = options.fadeEl
    if (!el) return
    el.style.transition = 'none'
    el.style.opacity = to.toFixed(3)
  }

  const smoothstep = (edge0: number, edge1: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)
  }

  /** Smooth two-frequency wobble, so shake reads as turbulence, not strobing. */
  const wobble = (t: number, a: number, b: number) => Math.sin(t * a) * 0.6 + Math.sin(t * b) * 0.4

  function enterShaft(atBottom: boolean) {
    mode = 'shaft'
    shaftProgress = atBottom ? 1 : 0
    shaftRunning = !atBottom
    seamProgress = 0
    seamRunning = false
  }

  function setPhase(next: GlobePhase) {
    if (next === phase) return
    phase = next

    if (next === 'seam') {
      // Presenter has moved on. Wherever the fall had got to, be at the bottom.
      plungeRunning = false
      if (mode !== 'shaft') {
        enterShaft(true)
        fade(0, 300)
      }
      shaftProgress = 1
      shaftRunning = false
      seamRunning = true
      return
    }

    if (next === 'shaft') {
      if (mode === 'shaft') {
        // Stepping back off the seam: hold at the bottom of the shaft.
        seamProgress = 0
        seamRunning = false
        return
      }
      // One continuous move from orbit to the salt. The camera falls out of the
      // sky onto Yorkshire, the frame goes black as it reaches the ground, and
      // the shaft is already dropping when it comes back. No cut to hide.
      plungeFrom = distance
      plungeProgress = 0
      plungeRunning = true
      return
    }

    if (plungeRunning) {
      // Backing out mid-fall. Abandon it and let the pose ease back.
      plungeRunning = false
      fade(0, 300)
    }

    if (mode !== 'globe') {
      fade(1, 220)
      window.setTimeout(() => {
        if (disposed) return
        mode = 'globe'
        seamProgress = 0
        seamRunning = false
        fade(0, 420)
      }, 240)
    }

    const pose = GLOBE_POSES[next]
    if (!pose) return
    targetDistance = pose.distance
    spin = pose.spin
    if (pose.lonLat) targetQuat.copy(orientationFor(pose.lonLat[0], pose.lonLat[1]))

    // The flight path belongs to the flight and to the landing, nothing else.
    // Stepping back, or jumping to an earlier act with a digit key, has to
    // clear it — otherwise Act 2 opens with the route to England already drawn
    // across the Pacific, giving away a reveal that is still six minutes out.
    if (next !== 'arc' && next !== 'boulby-surface') {
      arcProgress = 0
      arcRunning = false
      drawArc(0)
      arcHead.visible = false
      boulbyPin.visible = false
    }

    if (next === 'arc') {
      arcProgress = 0
      arcRunning = true
      arcMat.opacity = ARC_OPACITY
      arcHead.visible = true
      boulbyPin.visible = false
      // The globe turns to England at exactly the pace the arc draws.
      targetQuat.copy(orientationFor(BOULBY[0], BOULBY[1]))
    }
    if (next === 'boulby-surface') {
      arcProgress = 1
      arcRunning = false
      drawArc(arcPoints.length)
      arcHead.visible = false
      boulbyPin.visible = true
    }
  }

  function updateGlobe(dt: number) {
    if (spin) {
      targetQuat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -0.045 * dt))
    }

    if (arcRunning) {
      arcProgress = Math.min(1, arcProgress + dt / 3.6)
      const count = Math.max(2, Math.floor(arcProgress * ARC_SEGMENTS))
      drawArc(count)
      arcHead.position.copy(arcPoints[Math.min(count, arcPoints.length - 1)])
      if (arcProgress >= 1) {
        arcRunning = false
        arcHead.visible = false
        boulbyPin.visible = true
      }
    }

    const ease = 1 - Math.exp(-2.1 * dt)
    quat.slerp(targetQuat, ease)
    globeGroup.quaternion.copy(quat)
    camera.up.set(0, 1, 0)

    if (plungeRunning) {
      plungeProgress = Math.min(1, plungeProgress + dt / PLUNGE_SECONDS)
      const p = plungeProgress
      const t = clock.elapsedTime

      // Altitude closes on a gentle curve, which is already enough: apparent
      // size goes as one over altitude, so a steady descent reads as an
      // accelerating one. The lens then opens late, well after the ground has
      // started rushing up, for the lurch at the end. Widening it any earlier
      // out-runs the dolly and the planet appears to retreat.
      distance = plungeFrom + (PLUNGE_END_DISTANCE - plungeFrom) * p ** 1.25
      camera.fov = 42 + 34 * p ** 2.6

      // Drop the flight path early. The last thing on screen before the ground
      // takes the frame should be the country, not a diagram over it.
      arcMat.opacity = ARC_OPACITY * (1 - smoothstep(0, 0.4, p))

      const shake = 0.05 * p * p
      camera.position.set(wobble(t, 31, 19.7) * shake, wobble(t, 27, 23.3) * shake, distance)
      camera.lookAt(0, 0, 0)

      // Black before the map runs out of pixels.
      setFade(smoothstep(0.5, 0.93, p))

      if (p >= 1) {
        plungeRunning = false
        enterShaft(false)
        fade(0, 700)
      }
    } else {
      distance += (targetDistance - distance) * ease
      camera.position.set(0, 0, distance)
      camera.lookAt(0, 0, 0)
      camera.fov = 42
    }

    camera.updateProjectionMatrix()
    options.onDepth?.(null)
  }

  function updateShaft(dt: number) {
    if (shaftRunning) {
      shaftProgress = Math.min(1, shaftProgress + dt / SHAFT_SECONDS)
      if (shaftProgress >= 1) shaftRunning = false
    }
    if (seamRunning) {
      seamProgress = Math.min(1, seamProgress + dt / 3)
      if (seamProgress >= 1) seamRunning = false
    }

    // Accelerate away from the surface, then brake into the seam.
    const p = shaftProgress
    const RAMP = 0.18
    const eased =
      p < RAMP
        ? (p / RAMP) ** 2 * RAMP
        : p > 1 - RAMP
          ? 1 - RAMP + (1 - (1 - (p - (1 - RAMP)) / RAMP) ** 2) * RAMP
          : p
    const y = -eased * SHAFT_UNITS

    // Full only through the cruise, so the shake builds as the fall does and
    // settles before the seam.
    const rush = Math.min(1, Math.min(p, 1 - p) / RAMP)
    const turn = seamProgress
    const t = clock.elapsedTime
    const shake = rush * 0.07 * (1 - turn)

    camera.fov = 58 + 16 * rush + 6 * turn
    // Looking straight down makes the default up vector parallel to the view,
    // which leaves the roll undefined. Hand it a real one, and swing it upright
    // as the camera levels out into the drift.
    camera.up.set(0, turn, -(1 - turn)).normalize()

    // Open the throw up as the camera settles into the chamber. The tight fog
    // that makes the shaft claustrophobic would leave the chamber a blank wall.
    const fog = shaftScene.fog as THREE.Fog
    fog.near = 3.5 + turn * 6
    fog.far = 24 + turn * 34
    headlamp.distance = 22 + turn * 40
    // The chamber wall sits four times further out than the shaft wall, and
    // with decay the lamp that lit one at close range leaves the other black.
    headlamp.intensity = SHAFT_LAMP * (1 + turn * 34)
    ambient.intensity = SHAFT_AMBIENT + turn * 0.8
    ambient.color.copy(AMBIENT_ROCK).lerp(AMBIENT_SALT, turn)

    // Drop into the middle of the chamber, off the shaft axis, and lift the
    // eyeline off the floor onto the far wall.
    const camY = y - turn * 11
    camera.position.set(
      turn * 5 + wobble(t, 34, 21.3) * shake,
      camY,
      turn * 4 + wobble(t, 29, 17.9) * shake
    )
    camera.updateProjectionMatrix()
    camera.lookAt(
      -turn * 8 + wobble(t, 12, 8.4) * shake * 3,
      camY - 8 * (1 - turn) - 1.5 * turn,
      -turn * 9
    )

    headlamp.position.copy(camera.position)
    options.onDepth?.(eased * SHAFT_DEPTH_M)
  }

  function resize() {
    const rect = canvas.getBoundingClientRect()
    const w = Math.max(1, Math.round(rect.width) || window.innerWidth)
    const h = Math.max(1, Math.round(rect.height) || window.innerHeight)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
    // Fat lines need the viewport size to work out their pixel width.
    for (const mat of fatMaterials) mat.resolution.set(w, h)
  }
  resize()
  window.addEventListener('resize', resize)

  function tick() {
    if (disposed) return
    requestAnimationFrame(tick)
    const dt = Math.min(0.05, clock.getDelta())
    if (!rendering || !visible) return

    if (mode === 'globe') {
      updateGlobe(dt)
      renderer.render(globeScene, camera)
    } else {
      updateShaft(dt)
      renderer.render(shaftScene, camera)
    }
  }
  tick()

  return {
    setPhase,
    setVisible(next: boolean) {
      visible = next
      canvas.style.opacity = next ? '1' : '0'
      if (next) resize()
      if (!next) {
        options.onDepth?.(null)
        // The plunge drives the full-screen cover a frame at a time, and it
        // stops being ticked the moment this scene is routed away from. Jumping
        // acts mid-fall would otherwise leave the next beat behind black.
        if (plungeRunning) {
          plungeRunning = false
          fade(0, 200)
        }
      }
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

/**
 * Rim glow standing in for an atmosphere.
 *
 * Drawn on the inside of a slightly larger sphere and brightened towards the
 * silhouette, so the planet gets a lit edge instead of a hard cut against the
 * black stage. Cheap, and it is the difference between a sphere and a world.
 */
function atmosphere(): THREE.Mesh {
  return new THREE.Mesh(
    // Only the sliver between this radius and the planet is ever visible, so
    // the shell stays tight. Wider and it separates into a blue ring orbiting
    // the Earth rather than sitting on it.
    new THREE.SphereGeometry(GLOBE_R * 1.09, 64, 48),
    new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uColor: { value: new THREE.Color(0x5e9fdc) },
        uPower: { value: 2.2 },
        uStrength: { value: 0.75 },
      },
      vertexShader: `
        varying vec3 vNormalW;
        varying vec3 vViewW;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vNormalW = normalize(mat3(modelMatrix) * normal);
          vViewW = normalize(cameraPosition - world.xyz);
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uPower;
        uniform float uStrength;
        varying vec3 vNormalW;
        varying vec3 vViewW;
        void main() {
          // Back faces, so the normal points inward and has to be flipped
          // before measuring how close to grazing we are.
          float rim = 1.0 - abs(dot(normalize(-vNormalW), normalize(vViewW)));
          float a = pow(clamp(rim, 0.0, 1.0), uPower) * uStrength;
          gl_FragColor = vec4(uColor * a, a);
        }
      `,
    })
  )
}

/** Sparse stars, so the black around the planet reads as space, not as a void. */
function starfield(count: number): THREE.Points {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  let seed = 90210
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }

  for (let i = 0; i < count; i++) {
    // Even spread over the sphere: cosine-distributed latitude, not uniform,
    // or the stars bunch at the poles.
    const u = rand() * 2 - 1
    const theta = rand() * Math.PI * 2
    const r = 120 + rand() * 60
    const s = Math.sqrt(1 - u * u)
    positions.set([r * s * Math.cos(theta), r * u, r * s * Math.sin(theta)], i * 3)

    const warm = 0.72 + rand() * 0.28
    colors.set([warm, warm * (0.92 + rand() * 0.08), warm * (0.88 + rand() * 0.12)], i * 3)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 1.5,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    })
  )
}

/**
 * A dot and a ring sitting flush on the surface. No outward spike — at the
 * limb of the globe a spike reads as a stray line poking into space.
 */
function makePin(color: number): THREE.Group {
  const group = new THREE.Group()
  group.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 16, 12),
      new THREE.MeshBasicMaterial({ color, toneMapped: false })
    )
  )
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.03, 0.044, 40),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
  )
  halo.position.z = -0.004
  group.add(halo)
  return group
}

function greatCirclePoints(
  from: [number, number],
  to: [number, number],
  segments: number
): THREE.Vector3[] {
  const a = lonLatToVec3(from[0], from[1]).normalize()
  const b = lonLatToVec3(to[0], to[1]).normalize()
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    // Lift the middle of the path off the surface so it reads as a flight.
    const lift = 1 + Math.sin(t * Math.PI) * 0.16
    points.push(new THREE.Vector3().copy(a).lerp(b, t).normalize().multiplyScalar(GLOBE_R * lift))
  }
  return points
}

function graticuleGeometry(): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = []
  for (let lat = -60; lat <= 60; lat += 30) {
    for (let lon = -180; lon < 180; lon += 6) {
      pts.push(lonLatToVec3(lon, lat), lonLatToVec3(lon + 6, lat))
    }
  }
  for (let lon = -180; lon < 180; lon += 30) {
    for (let lat = -84; lat < 84; lat += 6) {
      pts.push(lonLatToVec3(lon, lat), lonLatToVec3(lon, lat + 6))
    }
  }
  return new THREE.BufferGeometry().setFromPoints(pts)
}
