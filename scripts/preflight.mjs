#!/usr/bin/env node
/**
 * Pre-talk check: every asset path the code references must exist in public/.
 *
 * A missing file shows up as a black rectangle in front of an audience, which
 * is the one failure mode worth catching from a terminal. Run this after
 * swapping any stand-in for real photography.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(ROOT, 'public')

function walk(dir, match, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, match, out)
    else if (match.test(entry)) out.push(full)
  }
  return out
}

const sources = [
  ...walk(join(ROOT, 'src'), /\.(ts|js|css)$/),
  join(ROOT, 'index.html'),
]

// Paths written as '/assets/...' or '/hero/...' string literals.
const PATH_RE = /['"`](\/(?:assets|hero)\/[^'"`)\s]+)['"`]/g

const referenced = new Map()
for (const file of sources) {
  const text = readFileSync(file, 'utf8')
  for (const [, path] of text.matchAll(PATH_RE)) {
    if (!referenced.has(path)) referenced.set(path, [])
    referenced.get(path).push(relative(ROOT, file))
  }
}

const missing = []
for (const [path, from] of referenced) {
  if (!existsSync(join(PUBLIC, path.slice(1)))) missing.push({ path, from })
}

const onDisk = walk(PUBLIC, /\.(jpg|jpeg|png|svg|mp4|mov|webm|vtt|json)$/).map((f) =>
  '/' + relative(PUBLIC, f).split('\\').join('/')
)
const unused = onDisk.filter((p) => !referenced.has(p))

console.log(`referenced: ${referenced.size}   on disk: ${onDisk.length}`)

if (missing.length) {
  console.log('\nMISSING — these will render as black:')
  for (const { path, from } of missing) console.log(`  ${path}   <- ${from.join(', ')}`)
}

if (unused.length) {
  console.log('\nunused (fine, just unreferenced):')
  for (const p of unused) console.log(`  ${p}`)
}

if (missing.length) {
  console.log('\nFAIL')
  process.exit(1)
}
console.log('\nOK — every referenced asset is present.')
