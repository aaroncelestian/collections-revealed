import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages serves this repo from /collections-revealed/. Local dev stays relative.
  base: process.env.PAGES_BASE || './',
  build: {
    assetsInlineLimit: 0,
    target: 'es2022',
  },
  server: {
    port: 5173,
    open: true,
  },
})
