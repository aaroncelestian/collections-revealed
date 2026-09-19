import * as THREE from 'three'
import { createHaliteMesh, type HaliteHero } from './createHaliteMesh'

export interface SceneTargets {
  camera: THREE.PerspectiveCamera
  halite: THREE.Group
  keyLight: THREE.DirectionalLight
  rimLight: THREE.DirectionalLight
  fillLight: THREE.HemisphereLight
  particles: THREE.Points
  brineMat: THREE.MeshStandardMaterial | null
  hero: HaliteHero
}

export class HaliteScene {
  readonly renderer: THREE.WebGLRenderer
  readonly scene: THREE.Scene
  readonly targets: SceneTargets
  private readonly clock = new THREE.Clock()
  private ambientSpin = 1
  private insetMode = false
  private diveTarget = 0
  private diveAmount = 0
  private disposed = false
  private raf = 0

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(0x060810, 1)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x060810)
    this.scene.fog = new THREE.FogExp2(0x060810, 0.028)

    const camera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    )
    camera.position.set(0, 0.45, 7.2)
    camera.lookAt(0, 0, 0)

    const fillLight = new THREE.HemisphereLight(0xe8eef6, 0x12141a, 0.45)
    this.scene.add(fillLight)

    const keyLight = new THREE.DirectionalLight(0xf2f4f8, 1.4)
    keyLight.position.set(4.5, 5.5, 3.5)
    this.scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0xff9ec4, 1.2)
    rimLight.position.set(-4, 1.5, -3)
    this.scene.add(rimLight)

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(10, 64),
      new THREE.MeshBasicMaterial({ color: 0x0a0d14, transparent: true, opacity: 0.55 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -1.55
    this.scene.add(floor)

    const hero = createHaliteMesh()
    this.scene.add(hero.group)

    const particles = this.createParticles()
    particles.visible = false
    this.scene.add(particles)

    this.targets = {
      camera,
      halite: hero.group,
      keyLight,
      rimLight,
      fillLight,
      particles,
      brineMat: hero.group.getObjectByName('brine-pocket')
        ? ((hero.group.getObjectByName('brine-pocket') as THREE.Mesh)
            .material as THREE.MeshStandardMaterial)
        : null,
      hero,
    }

    window.addEventListener('resize', this.onResize)
    this.loop()
  }

  setAmbientSpin(amount: number) {
    this.ambientSpin = amount
  }

  setDiveInclusions(enabled: boolean) {
    this.diveTarget = enabled ? 1 : 0
  }

  setInsetMode(enabled: boolean) {
    this.insetMode = enabled
    const canvas = this.renderer.domElement
    if (enabled) {
      canvas.style.zIndex = '3'
      canvas.style.clipPath = 'inset(58% 4% 4% 68% round 4px)'
      canvas.style.opacity = '1'
    } else {
      canvas.style.zIndex = '1'
      canvas.style.clipPath = 'none'
    }
  }

  setVisible(visible: boolean) {
    const canvas = this.renderer.domElement
    canvas.style.opacity = visible ? '1' : '0'
    canvas.style.transition = 'opacity 0.7s ease'
    if (!visible) {
      canvas.style.zIndex = '1'
      canvas.style.clipPath = 'none'
      this.insetMode = false
    }
  }

  setBrineHighlight(strength: number) {
    this.targets.hero.brineHighlight(strength)
  }

  setSendOffMode(active: boolean) {
    this.targets.particles.visible = active
    if (active) {
      this.targets.camera.fov = 42
      this.targets.camera.updateProjectionMatrix()
    }
  }

  private createParticles(): THREE.Points {
    const count = 500
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 18
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: 0xffe566,
      size: 0.035,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
    return new THREE.Points(geo, mat)
  }

  private loop = () => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    const dt = this.clock.getDelta()
    const t = this.clock.elapsedTime

    this.diveAmount += (this.diveTarget - this.diveAmount) * Math.min(1, dt * 1.4)
    this.targets.hero.setDive(this.diveAmount)
    this.targets.hero.updateMicrobes(dt)

    if (this.ambientSpin > 0 && this.diveAmount < 0.55) {
      this.targets.halite.rotation.y += dt * 0.14 * this.ambientSpin
      this.targets.halite.rotation.x = Math.sin(t * 0.3) * 0.05 * this.ambientSpin
    }

    if (this.diveAmount > 0.05) {
      const cam = this.targets.camera
      const look = new THREE.Vector3(1.15, 0.08, 0.05)
      const overview = new THREE.Vector3(0, 0.45, 7.2)
      const close = new THREE.Vector3(1.55, 0.25, 2.35)
      cam.position.lerpVectors(overview, close, this.diveAmount)
      const target = new THREE.Vector3(0, 0, 0).lerp(look, this.diveAmount)
      cam.lookAt(target)
      cam.fov = THREE.MathUtils.lerp(35, 28, this.diveAmount)
      cam.updateProjectionMatrix()
    } else if (!this.insetMode) {
      const cam = this.targets.camera
      cam.position.x = Math.sin(t * 0.12) * 0.12
      cam.position.y = 0.45
      cam.position.z = 7.2
      cam.lookAt(0, 0, 0)
    }

    if (this.targets.particles.visible) {
      this.targets.particles.rotation.y += dt * 0.02
    }

    this.renderer.render(this.scene, this.targets.camera)
  }

  private onResize = () => {
    const { camera } = this.targets
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.onResize)
    this.renderer.dispose()
  }
}
