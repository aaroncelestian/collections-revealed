#!/usr/bin/env node
/**
 * Build a folder you can copy to a USB stick and run on the venue computer.
 * No Node required on that machine — Python (Mac/most PCs) or a double-click
 * of index.html is enough.
 */

import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import * as esbuild from 'esbuild'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const OUT = join(ROOT, 'talk-usb')
const VITE = join(ROOT, 'node_modules', '.bin', 'vite')

const MAC_COMMAND = `#!/bin/bash
cd "$(dirname "$0")"
PORT=4173
URL="http://127.0.0.1:\${PORT}/"

open_app() {
  if [ -d "/Applications/Google Chrome.app" ]; then
    open -na "Google Chrome" --args --app="\$URL"
    return
  fi
  if [ -d "/Applications/Microsoft Edge.app" ]; then
    open -na "Microsoft Edge" --args --app="\$URL"
    return
  fi
  open "\$URL"
}

if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "\$PORT" --bind 127.0.0.1 &
  PID=\$!
  sleep 0.6
  open_app
  wait \$PID
  exit 0
fi
open -a "Google Chrome" "index.html" 2>/dev/null || open "index.html"
`

const WIN_BAT = `@echo off
cd /d "%~dp0"
set URL=http://127.0.0.1:4173/

set CHROME=
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" set CHROME=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe
if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" set CHROME=%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe

where py >nul 2>&1 && set PY=py -3&& goto serve
where python >nul 2>&1 && set PY=python&& goto serve
goto noserver

:serve
if defined CHROME (
  start "" "%CHROME%" --app=%URL%
) else (
  start "" %URL%
)
%PY% -m http.server 4173 --bind 127.0.0.1
goto :eof

:noserver
if defined CHROME (
  start "" "%CHROME%" "%~dp0index.html"
) else (
  start "" "%~dp0index.html"
)
`

const README = `Life in Salt — USB copy
=======================

This folder is the whole talk. It does not need the internet.

On the venue computer, copy this folder to the Desktop first
(USB sticks are slower and sometimes blocked). Then:

  Mac:     double-click Present.command
  Windows: double-click Present.bat

That opens a Chrome app window (no tabs, no URL bar). Press F for
full screen. Leave the terminal/command window open while you talk.

If the venue machine blocks scripts, double-click index.html in Chrome.
That file:// path now runs without a local server.

The live GitHub Pages site is not this copy. Do not open that URL.
`

function run(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

/**
 * Chrome treats each file:// URL as a unique origin, so Vite's
 * `<script type="module">` never runs when you double-click index.html.
 * Collapse the ES module graph into one classic IIFE that does.
 */
function makeFileFriendly(outDir) {
  const assetsDir = join(outDir, 'assets')
  const indexJs = readdirSync(assetsDir).find(
    (name) => /^index-.*\.js$/.test(name) && !name.includes('world-data'),
  )
  if (!indexJs) throw new Error('USB pack: no index-*.js in assets/')

  esbuild.buildSync({
    entryPoints: [join(assetsDir, indexJs)],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    outfile: join(outDir, 'talk.js'),
    logLevel: 'silent',
  })

  const htmlPath = join(outDir, 'index.html')
  const html = readFileSync(htmlPath, 'utf8').replace(
    /<script type="module" src="[^"]+"><\/script>/,
    '<script src="./talk.js" defer></script>',
  )
  writeFileSync(htmlPath, html)
}

const fixDir = process.argv[2] === '--fix' ? process.argv[3] : null
if (fixDir) {
  makeFileFriendly(fixDir)
  console.log(`file:// ready: ${join(fixDir, 'index.html')}`)
  process.exit(0)
}

if (!existsSync(VITE)) {
  console.error('Dependencies are not installed. At home, with internet: npm install')
  process.exit(1)
}

run('npm', ['run', 'preflight'])
run('npm', ['run', 'build'])

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT)
cpSync(DIST, OUT, { recursive: true })
makeFileFriendly(OUT)

writeFileSync(join(OUT, 'Present.command'), MAC_COMMAND, { mode: 0o755 })
chmodSync(join(OUT, 'Present.command'), 0o755)
writeFileSync(join(OUT, 'Present.bat'), WIN_BAT)
writeFileSync(join(OUT, 'README.txt'), README)

console.log(`\nUSB folder ready: ${OUT}`)
console.log('Copy that whole folder onto a stick. On the venue computer:')
console.log('  Mac:     double-click Present.command')
console.log('  Windows: double-click Present.bat')
console.log('If scripts are blocked, double-click index.html — that now works too.')
