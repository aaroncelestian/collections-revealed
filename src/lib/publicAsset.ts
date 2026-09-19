/** Prefix a public/ path with Vite's base so GitHub Pages subpaths work. */
export function publicAsset(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const clean = path.replace(/^\//, '')
  return base.endsWith('/') ? `${base}${clean}` : `${base}/${clean}`
}
