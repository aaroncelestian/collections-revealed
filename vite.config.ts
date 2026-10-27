import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

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
  plugins: [
    react(),
    {
      name: 'file-url-friendly',
      transformIndexHtml(html) {
        return html.replace(/\s+crossorigin(?:="[^"]*")?/g, '')
      },
    },
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Collections Revealed — Life in Salt',
        short_name: 'Life in Salt',
        description: 'NHM Collections Revealed talk. Works offline once cached.',
        theme_color: '#05070c',
        background_color: '#05070c',
        display: 'fullscreen',
        orientation: 'landscape',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      injectManifest: {
        rollupFormat: 'iife',
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,jpg,jpeg,mp4,json,webmanifest,webp}',
        ],
        globIgnores: ['**/* 2.*'],
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
      },
    }),
  ],
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
