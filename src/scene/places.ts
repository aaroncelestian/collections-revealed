import * as THREE from 'three'

/** The two ends of the talk's journey, as [longitude, latitude]. */
export const SEARLES: [number, number] = [-117.35, 35.72]
export const BOULBY: [number, number] = [-0.83, 54.55]

const DEG = Math.PI / 180

/** A point on a unit-radius globe. Shared so every scene plants pins alike. */
export function lonLatToVec3(lon: number, lat: number, r = 1): THREE.Vector3 {
  const phi = (90 - lat) * DEG
  const theta = (lon + 180) * DEG
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  )
}

/**
 * Rotation that swings a lon/lat round to face +Z with north up.
 * Done as two steps because `setFromUnitVectors` alone leaves arbitrary roll,
 * which reads as the planet lolling sideways.
 */
export function orientationFor(lon: number, lat: number): THREE.Quaternion {
  const target = lonLatToVec3(lon, lat).normalize()
  const q = new THREE.Quaternion().setFromUnitVectors(target, new THREE.Vector3(0, 0, 1))
  const north = new THREE.Vector3(0, 1, 0).applyQuaternion(q)
  const roll = Math.atan2(north.x, north.y)
  return q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll))
}
