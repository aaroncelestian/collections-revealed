import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

function buildId(): string {
  const version = JSON.parse(readFileSync('package.json', 'utf8')).version as string
  let sha = 'dev'
  try {
    sha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    // Outside a git checkout (or during a shallow CI clone without .git).
  }
  const dirty = (() => {
    try {
      return execSync('git status --porcelain', { encoding: 'utf8' }).trim()
        ? '*'
        : ''
    } catch {
      return ''
    }
  })()
  return `${version}+${sha}${dirty}`
}

export default defineConfig({
  // GitHub Pages serves this repo from /collections-revealed/. Local dev stays relative.
  base: process.env.PAGES_BASE || './',
  plugins: [react()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId()),
  },
  build: {
    assetsInlineLimit: 0,
    target: 'es2022',
  },
  server: {
    port: 5173,
    open: true,
  },
})
