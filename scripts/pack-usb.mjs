#!/usr/bin/env node
/**
 * Build a folder you can copy to a USB stick and run on the venue computer.
 * No Node required on that machine — Python (Mac/most PCs) or a double-click
 * of index.html is enough.
 */

import { chmodSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const OUT = join(ROOT, 'talk-usb')
const VITE = join(ROOT, 'node_modules', '.bin', 'vite')

const MAC_COMMAND = `#!/bin/bash
cd "$(dirname "$0")"
PORT=4173
if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT" --bind 127.0.0.1 &
  PID=$!
  sleep 0.6
  open "http://127.0.0.1:$PORT/"
  wait $PID
  exit 0
fi
open -a "Google Chrome" "index.html" 2>/dev/null || open "index.html"
`

const WIN_BAT = `@echo off
cd /d "%~dp0"
where py >nul 2>&1 && (
  start "" http://127.0.0.1:4173/
  py -3 -m http.server 4173 --bind 127.0.0.1
  goto :eof
)
where python >nul 2>&1 && (
  start "" http://127.0.0.1:4173/
  python -m http.server 4173 --bind 127.0.0.1
  goto :eof
)
start "" "index.html"
`

const README = `Life in Salt — USB copy
=======================

This folder is the whole talk. It does not need the internet.

On the venue computer, copy this folder to the Desktop first
(USB sticks are slower and sometimes blocked). Then:

  Mac:     double-click Present.command
  Windows: double-click Present.bat

Leave the terminal/command window open while you talk.

If the venue machine blocks scripts, open index.html in Chrome.
Do not use Safari for the file-open fallback.

The live GitHub Pages site is not this copy. Do not open that URL.
`

function run(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
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

writeFileSync(join(OUT, 'Present.command'), MAC_COMMAND, { mode: 0o755 })
chmodSync(join(OUT, 'Present.command'), 0o755)
writeFileSync(join(OUT, 'Present.bat'), WIN_BAT)
writeFileSync(join(OUT, 'README.txt'), README)

console.log(`\nUSB folder ready: ${OUT}`)
console.log('Copy that whole folder onto a stick. On the venue computer:')
console.log('  Mac:     double-click Present.command')
console.log('  Windows: double-click Present.bat')
console.log('If scripts are blocked, double-click index.html in Chrome.')
