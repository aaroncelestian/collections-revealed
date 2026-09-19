import * as THREE from 'three'

/** 1 Three.js unit ≈ 20 µm — matches MineralSciences hero-halite scale language. */
const UM_PER_UNIT = 20
const BACTERIA_DIAM_UM = 1
const BACTERIA_R = BACTERIA_DIAM_UM / 2 / UM_PER_UNIT

const CRYSTAL = { sx: 4.2, sy: 2.45, sz: 1.75 }
const HABITAT = { x: 1.15, y: 0.08, z: 0.05, sx: 0.28, sy: 0.3, sz: 0.26 }

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

function inIronCross(x: number, y: number) {
  const ax = Math.abs(x)
  const ay = Math.abs(y)
  if (ax < 0.35 && ay < 0.35) return true
  const angle = Math.atan2(ay, ax)
  return angle <= (28 * Math.PI) / 180
}

type Inc = { x: number; y: number; z: number; sx: number; sy: number; sz: number }

function overlaps(a: Inc, b: Inc, pad = 0.08) {
  return (
    Math.abs(a.x - b.x) * 2 < a.sx + b.sx + pad &&
    Math.abs(a.y - b.y) * 2 < a.sy + b.sy + pad &&
    Math.abs(a.z - b.z) * 2 < a.sz + b.sz + pad
  )
}

function generateInclusions(rng: () => number): Inc[] {
  const hx = CRYSTAL.sx * 0.42
  const hy = CRYSTAL.sy * 0.38
  const hz = CRYSTAL.sz * 0.36
  const boxes: Inc[] = []
  const target = 86

  for (let i = 0; i < target * 18 && boxes.length < target; i++) {
    const x = (rng() * 2 - 1) * hx
    const y = (rng() * 2 - 1) * hy
    const z = (rng() * 2 - 1) * hz
    if (!inIronCross(x / hx, y / hy)) continue

    const roll = rng()
    let bx: number
    let by: number
    let bz: number
    if (roll < 0.4) {
      const s = 0.06 + rng() * 0.1
      bx = by = bz = s
    } else if (roll < 0.75) {
      bx = 0.05 + rng() * 0.09
      by = 0.12 + rng() * 0.28
      bz = 0.05 + rng() * 0.08
    } else {
      bx = 0.08 + rng() * 0.14
      by = 0.07 + rng() * 0.12
      bz = 0.06 + rng() * 0.1
    }

    const cand = { x, y, z, sx: bx, sy: by, sz: bz }
    if (boxes.some((b) => overlaps(b, cand))) continue
    boxes.push(cand)
  }

  boxes.push({ ...HABITAT })
  return boxes
}

type Bug = {
  cav: Inc
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  r: number
}

function spawnMicrobes(inclusions: Inc[], rng: () => number): Bug[] {
  const bugs: Bug[] = []
  for (const inc of inclusions) {
    const d = Math.hypot(inc.x - HABITAT.x, inc.y - HABITAT.y, inc.z - HABITAT.z)
    const isHab =
      Math.abs(inc.x - HABITAT.x) < 0.01 &&
      Math.abs(inc.y - HABITAT.y) < 0.01 &&
      Math.abs(inc.z - HABITAT.z) < 0.01
    let n = 0
    if (isHab) n = 10
    else if (d < 1.2) n = Math.min(inc.sx * inc.sy * inc.sz > 0.002 ? 2 : 1, 2)
    else if (d < 2.2 && inc.sx * inc.sy * inc.sz > 0.004) n = 1
    if (!n) continue

    for (let i = 0; i < n && bugs.length < 80; i++) {
      const margin = BACTERIA_R * 2.2
      const roomX = Math.max(0.01, inc.sx - margin)
      const roomY = Math.max(0.01, inc.sy - margin)
      const roomZ = Math.max(0.01, inc.sz - margin)
      const bug: Bug = {
        cav: inc,
        x: inc.x + (rng() - 0.5) * roomX,
        y: inc.y + (rng() - 0.5) * roomY,
        z: inc.z + (rng() - 0.5) * roomZ,
        vx: rng() - 0.5,
        vy: rng() - 0.5,
        vz: rng() - 0.5,
        r: BACTERIA_R * (0.9 + rng() * 0.3) * 8, // visually readable at auditorium scale
      }
      const sp = Math.hypot(bug.vx, bug.vy, bug.vz) || 1
      const s = 0.35 / sp
      bug.vx *= s
      bug.vy *= s
      bug.vz *= s
      bugs.push(bug)
    }
  }
  return bugs
}

export interface HaliteHero {
  group: THREE.Group
  brineHighlight: (strength: number) => void
  setDive: (amount: number) => void
  updateMicrobes: (dt: number) => void
}

/**
 * Procedural iron-cross fluid-inclusion hero adapted from
 * MineralSciences/hero-halite.js — simplified for projector performance.
 */
export function createHaliteMesh(): HaliteHero {
  const group = new THREE.Group()
  group.name = 'halite-hero'

  const hostGeo = new THREE.BoxGeometry(CRYSTAL.sx, CRYSTAL.sy, CRYSTAL.sz)
  const hostMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#d8dee8'),
    roughness: 0.55,
    metalness: 0,
    transmission: 0.78,
    thickness: 1.2,
    ior: 1.45,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  })
  const host = new THREE.Mesh(hostGeo, hostMat)
  host.name = 'crystal'
  group.add(host)

  const edgeMat = new THREE.LineBasicMaterial({
    color: 0xc8d2e0,
    transparent: true,
    opacity: 0.45,
  })
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(hostGeo, 15), edgeMat))

  const rng = mulberry32(0x5ea15e)
  const inclusions = generateInclusions(rng)

  const cavityMat = new THREE.MeshBasicMaterial({
    color: 0xff6b9d,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    toneMapped: false,
  })
  const cavityMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    cavityMat,
    inclusions.length,
  )
  const dummy = new THREE.Object3D()
  inclusions.forEach((inc, i) => {
    dummy.position.set(inc.x, inc.y, inc.z)
    dummy.scale.set(inc.sx, inc.sy, inc.sz)
    dummy.updateMatrix()
    cavityMesh.setMatrixAt(i, dummy.matrix)
  })
  cavityMesh.instanceMatrix.needsUpdate = true
  group.add(cavityMesh)

  const brineGeo = new THREE.BoxGeometry(HABITAT.sx * 0.92, HABITAT.sy * 0.92, HABITAT.sz * 0.92)
  const brineMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#7ec8ff'),
    emissive: new THREE.Color('#1a6cff'),
    emissiveIntensity: 0,
    roughness: 0.35,
    transparent: true,
    opacity: 0.55,
  })
  const brine = new THREE.Mesh(brineGeo, brineMat)
  brine.name = 'brine-pocket'
  brine.position.set(HABITAT.x, HABITAT.y, HABITAT.z)
  group.add(brine)

  const microbes = spawnMicrobes(inclusions, rng)
  const bugMat = new THREE.MeshBasicMaterial({
    color: 0xffe566,
    toneMapped: false,
  })
  const bugMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 8), bugMat, microbes.length)
  bugMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  group.add(bugMesh)

  const _bug = new THREE.Object3D()
  const writeBugs = () => {
    microbes.forEach((b, i) => {
      _bug.position.set(b.x, b.y, b.z)
      _bug.scale.setScalar(b.r)
      _bug.updateMatrix()
      bugMesh.setMatrixAt(i, _bug.matrix)
    })
    bugMesh.instanceMatrix.needsUpdate = true
  }
  writeBugs()

  let dive = 0

  return {
    group,
    brineHighlight(strength: number) {
      brineMat.emissiveIntensity = strength
      cavityMat.opacity = THREE.MathUtils.lerp(0.28, 0.48, Math.min(1, strength / 2.4))
    },
    setDive(amount: number) {
      dive = THREE.MathUtils.clamp(amount, 0, 1)
      hostMat.opacity = THREE.MathUtils.lerp(0.22, 0.06, dive)
      edgeMat.opacity = THREE.MathUtils.lerp(0.45, 0.08, dive)
      cavityMat.opacity = THREE.MathUtils.lerp(0.32, 0.55, dive)
    },
    updateMicrobes(dt: number) {
      const speed = THREE.MathUtils.lerp(0.08, 0.22, dive)
      for (const b of microbes) {
        b.x += b.vx * dt * speed
        b.y += b.vy * dt * speed
        b.z += b.vz * dt * speed
        const hx = b.cav.sx * 0.42
        const hy = b.cav.sy * 0.42
        const hz = b.cav.sz * 0.42
        if (Math.abs(b.x - b.cav.x) > hx) b.vx *= -1
        if (Math.abs(b.y - b.cav.y) > hy) b.vy *= -1
        if (Math.abs(b.z - b.cav.z) > hz) b.vz *= -1
        b.x = THREE.MathUtils.clamp(b.x, b.cav.x - hx, b.cav.x + hx)
        b.y = THREE.MathUtils.clamp(b.y, b.cav.y - hy, b.cav.y + hy)
        b.z = THREE.MathUtils.clamp(b.z, b.cav.z - hz, b.cav.z + hz)
      }
      writeBugs()
    },
  }
}

export function getBrineMaterial(group: THREE.Group): THREE.MeshStandardMaterial | null {
  const brine = group.getObjectByName('brine-pocket') as THREE.Mesh | undefined
  if (!brine) return null
  return brine.material as THREE.MeshStandardMaterial
}
