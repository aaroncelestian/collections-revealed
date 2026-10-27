#!/usr/bin/env node
/**
 * Day-of presenter: build the talk and serve it from this laptop.
 *
 * GitHub Pages needs the internet. This does not. Run it at home once with
 * Wi-Fi off so the first time you prove it is not in the auditorium.
 */

import { existsSync, readdirSync, statSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 4173
const URL = `http://127.0.0.1:${PORT}/`
const VITE = join(ROOT, 'node_modules', '.bin', 'vite')

function walk(dir, match, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, match, out)
    else if (match.test(entry)) out.push(full)
  }
  return out
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log('Collections Revealed — local present')
console.log('Do not open the GitHub Pages URL. This laptop is the show.\n')

if (!existsSync(VITE)) {
  console.error('Dependencies are not installed. Do this at home, with internet:')
  console.error('  npm install')
  process.exit(1)
}

if (ROOT.includes('com~apple~CloudDocs')) {
  console.log('Note: this copy lives in iCloud Drive.')
  console.log('If a video or photo is still “in iCloud”, it will not load with Wi-Fi off.')
  console.log('Finder → this folder → File → Download Now, the night before.\n')
}

const icloud = walk(join(ROOT, 'public'), /\.icloud$/)
if (icloud.length) {
  console.error('iCloud placeholders — these files are not actually on this Mac:')
  for (const file of icloud) console.error(`  ${relative(ROOT, file)}`)
  console.error('\nDownload the folder in Finder, then run this again.')
  process.exit(1)
}

run('npm', ['run', 'preflight'])
run('npm', ['run', 'build'])

console.log(`\nServing ${URL}`)
console.log('Turn Wi-Fi off now if you want to prove it. Ctrl+C when you are done.\n')

const child = spawn(
  VITE,
  ['preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort', '--open'],
  { cwd: ROOT, stdio: 'inherit' },
)

child.on('exit', (code, signal) => {
  if (signal) process.exit(0)
  process.exit(code ?? 0)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}
