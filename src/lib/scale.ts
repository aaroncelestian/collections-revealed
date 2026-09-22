/** Shared micrometre scale-bar maths for the 3D hero and the 2D zoom ladder. */

/** Snap a raw length to a readable 1 / 2 / 5 x 10^n bar length. */
export function niceScaleUm(raw: number): number {
  if (!(raw > 0) || !Number.isFinite(raw)) return 100
  const exp = Math.floor(Math.log10(raw))
  const f = raw / 10 ** exp
  const nice = f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10
  return nice * 10 ** exp
}

export function formatScale(um: number): string {
  if (um >= 1000) {
    const mm = um / 1000
    return mm >= 10 ? `${Math.round(mm)} mm` : `${parseFloat(mm.toFixed(2))} mm`
  }
  if (um >= 10) return `${Math.round(um)} µm`
  return `${parseFloat(um.toFixed(1))} µm`
}
