import { getProject, types, type ISheet, type ISheetObject } from '@theatre/core'
import type { HaliteScene } from '../scene/HaliteScene'
import { BEATS } from '../beats/catalog'

export interface BeatSheetBundle {
  sheet: ISheet
  object: ISheetObject<TheatreProps>
  beatId: string
}

export type TheatreProps = {
  cameraZ: number
  cameraY: number
  cameraFov: number
  objectScale: number
  objectY: number
  keyIntensity: number
  rimIntensity: number
  brineEmissive: number
  overlayOpacity: number
}

/** Canonical look per beat. Sheets stay independent so jumps never desync. */
export const BEAT_STATES: Record<string, TheatreProps> = {
  'cold-open': {
    cameraZ: 7.2,
    cameraY: 0.45,
    cameraFov: 35,
    objectScale: 1,
    objectY: 0,
    keyIntensity: 1.4,
    rimIntensity: 1.2,
    brineEmissive: 0,
    overlayOpacity: 0,
  },
  field: {
    cameraZ: 8.0,
    cameraY: 0.5,
    cameraFov: 38,
    objectScale: 0.55,
    objectY: -0.15,
    keyIntensity: 0.8,
    rimIntensity: 0.6,
    brineEmissive: 0,
    overlayOpacity: 1,
  },
  reveal: {
    cameraZ: 7.2,
    cameraY: 0.45,
    cameraFov: 35,
    objectScale: 1,
    objectY: 0,
    keyIntensity: 0.35,
    rimIntensity: 0.25,
    brineEmissive: 0,
    overlayOpacity: 1,
  },
  explainer: {
    cameraZ: 2.35,
    cameraY: 0.25,
    cameraFov: 28,
    objectScale: 1.05,
    objectY: 0,
    keyIntensity: 1.1,
    rimIntensity: 1.4,
    brineEmissive: 2.4,
    overlayOpacity: 1,
  },
  bridge: {
    cameraZ: 9.0,
    cameraY: 0.7,
    cameraFov: 40,
    objectScale: 0.35,
    objectY: 0,
    keyIntensity: 0.7,
    rimIntensity: 0.5,
    brineEmissive: 0,
    overlayOpacity: 1,
  },
  'so-what': {
    cameraZ: 6.4,
    cameraY: 0.3,
    cameraFov: 32,
    objectScale: 0.95,
    objectY: 0,
    keyIntensity: 1.2,
    rimIntensity: 1.0,
    brineEmissive: 0.35,
    overlayOpacity: 1,
  },
  'send-off': {
    cameraZ: 10.5,
    cameraY: 0.55,
    cameraFov: 42,
    objectScale: 0.65,
    objectY: 0.08,
    keyIntensity: 0.9,
    rimIntensity: 1.15,
    brineEmissive: 0,
    overlayOpacity: 1,
  },
}

function propsFor(state: TheatreProps) {
  return {
    cameraZ: types.number(state.cameraZ, { range: [2, 14] }),
    cameraY: types.number(state.cameraY, { range: [-2, 3] }),
    cameraFov: types.number(state.cameraFov, { range: [20, 60] }),
    objectScale: types.number(state.objectScale, { range: [0.1, 3] }),
    objectY: types.number(state.objectY, { range: [-2, 2] }),
    keyIntensity: types.number(state.keyIntensity, { range: [0, 5] }),
    rimIntensity: types.number(state.rimIntensity, { range: [0, 5] }),
    brineEmissive: types.number(state.brineEmissive, { range: [0, 4] }),
    overlayOpacity: types.number(state.overlayOpacity, { range: [0, 1] }),
  }
}

export function createTheatreProject(haliteScene: HaliteScene): BeatSheetBundle[] {
  const project = getProject('Collections Revealed — Life in Salt')
  const bundles: BeatSheetBundle[] = []

  for (const beat of BEATS) {
    const state = BEAT_STATES[beat.id]
    const sheet = project.sheet(`Beat ${beat.index + 1}: ${beat.title}`, `beat-${beat.id}`)
    const object = sheet.object('Stage', propsFor(state))

    object.onValuesChange((values) => {
      applyTheatreValues(haliteScene, values)
    })

    bundles.push({ sheet, object, beatId: beat.id })
  }

  return bundles
}

export function applyTheatreValues(scene: HaliteScene, values: TheatreProps) {
  const { camera, halite, keyLight, rimLight } = scene.targets
  camera.position.z = values.cameraZ
  camera.position.y = values.cameraY
  camera.fov = values.cameraFov
  camera.updateProjectionMatrix()
  camera.lookAt(0, 0, 0)
  halite.scale.setScalar(values.objectScale)
  halite.position.y = values.objectY
  keyLight.intensity = values.keyIntensity
  rimLight.intensity = values.rimIntensity
  scene.setBrineHighlight(values.brineEmissive)
}

/** Jump-safe: apply this sheet's canonical state without touching other sheets. */
export function activateBeatSheet(scene: HaliteScene, bundle: BeatSheetBundle) {
  const state = BEAT_STATES[bundle.beatId]
  if (!state) return
  applyTheatreValues(scene, state)
  bundle.sheet.sequence.position = 0
}
