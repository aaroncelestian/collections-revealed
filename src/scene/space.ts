import * as THREE from 'three'

/**
 * The two props every scene set in space needs.
 *
 * Shared rather than copied because the closing move cross-dissolves the globe
 * into the solar system: the same Earth has to carry the same lit rim on both
 * sides of the dissolve, or the planet appears to change material mid-cut.
 */

/**
 * Rim glow standing in for an atmosphere.
 *
 * Drawn on the inside of a slightly larger sphere and brightened towards the
 * silhouette, so the planet gets a lit edge instead of a hard cut against the
 * black stage. Cheap, and it is the difference between a sphere and a world.
 */
export function atmosphereShell(radius: number): THREE.Mesh {
  return new THREE.Mesh(
    // Only the sliver between this radius and the planet is ever visible, so
    // the shell stays tight. Wider and it separates into a blue ring orbiting
    // the Earth rather than sitting on it.
    new THREE.SphereGeometry(radius * 1.09, 64, 48),
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
export function starfield(count: number, minRadius = 120): THREE.Points {
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
    const r = minRadius + rand() * minRadius * 0.5
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
