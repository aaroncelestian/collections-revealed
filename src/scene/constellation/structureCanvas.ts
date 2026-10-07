/** Shared WebGL defaults for the constellation motif. */

export const STRUCTURE_DPR: [number, number] = [1, 1.25]

export const STRUCTURE_GL_OPAQUE = {
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance' as const,
  stencil: false,
}
