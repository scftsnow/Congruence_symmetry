/**
 * Rebuild the two web fonts from the KERIS originals.
 *
 * 학교안심 별자리 is an OFL font, so it may be embedded, modified and
 * redistributed — as long as the licence travels with it (public/fonts/OFL.txt)
 * and the file itself is never sold. Modification is allowed, which is what
 * this script does: the app speaks a few hundred syllables, not the whole
 * Korean alphabet, so both weights are cut down to the characters the source
 * actually uses and re-emitted as woff2.
 *
 * The originals come from the KERIS school-font download page, whose file URLs
 * are signed and expire:
 *
 *   https://copyright.keris.or.kr/wft/fntDwnldView?fntGrpId=GFT202408200000000000006
 *
 * Drop the two .woff files into fonts-src/ and run: node scripts/subset-fonts.mjs
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import subsetFont from 'subset-font'

const ROOT = process.cwd()
const SRC = join(ROOT, 'fonts-src')
const OUT = join(ROOT, 'src', 'assets', 'fonts')

/** every file whose text the app can put on screen */
function sourceFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) sourceFiles(full, acc)
    else if (/\.(ts|tsx|html|css|json)$/.test(entry.name)) acc.push(full)
  }
  return acc
}

/**
 * The characters the app may draw, plus the punctuation that comes with them.
 *
 * Read out of the source rather than typed by hand: a new word in a new screen
 * has to end up in the subset, and a list maintained by hand is a list that
 * goes stale and drops a glyph the first time it is used.
 */
function charset() {
  const files = [...sourceFiles(join(ROOT, 'src')), join(ROOT, 'index.html')]
  const chars = new Set()
  for (const file of files) {
    for (const ch of readFileSync(file, 'utf8')) chars.add(ch)
  }
  // symbols the UI draws rather than spells, plus the Latin the canvas counts in
  for (const ch of '★✓·•←→↺…×÷°′″㎡abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 /!?%+-=') {
    chars.add(ch)
  }
  return [...chars].sort().join('')
}

if (!existsSync(SRC)) {
  console.error('fonts-src/ is missing — download the two .woff files from KERIS first')
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
const text = charset()
console.log(`subsetting to ${text.length} characters`)

for (const weight of ['l', 'b']) {
  const source = join(SRC, `hakgyoansim-byeoljari-${weight}.woff`)
  const target = join(OUT, `hakgyoansim-byeoljari-${weight}.woff2`)
  const subset = await subsetFont(readFileSync(source), text, { targetFormat: 'woff2' })
  writeFileSync(target, subset)
  console.log(`${weight}: ${subset.length} bytes`)
}