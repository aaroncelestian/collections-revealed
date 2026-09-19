import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    assetsInlineLimit: 0,
    target: 'es2022',
  },
  server: {
    port: 5173,
    open: true,
  },
})
