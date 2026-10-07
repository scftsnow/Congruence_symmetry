/**
 * App build verification
 *
 * Reads Korean strings from expected.json (UTF-8) instead of literals here,
 * because literal Korean in this file risks encoding corruption.
 *
 * Run: node scripts/verify.mjs
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

let pass = 0
let fail = 0

function ok(name, cond, extra = '') {
  if (cond) {
    pass++
    console.log(`  OK   ${name}${extra ? '  ' + extra : ''}`)
  } else {
    fail++
    console.log(`  FAIL ${name}${extra ? '  ' + extra : ''}`)
  }
}

function section(t) {
  console.log(`\n== ${t}`)
}

// 1. build
section('1. production build')
try {
  execSync('npm run build', { stdio: 'pipe', encoding: 'utf8' })
  ok('npm run build', true)
} catch (e) {
  ok('npm run build', false, String(e.stdout || e.message).slice(0, 300))
}

// 2. artifacts
section('2. build artifacts')
const root = process.cwd()
const distDir = join(root, 'dist')
const assetsDir = join(distDir, 'assets')
let bundle = ''
let css = ''
let html = ''

if (existsSync(distDir) && existsSync(assetsDir)) {
  const files = readdirSync(assetsDir)
  const jsFile = files.find((f) => f.endsWith('.js'))
  const cssFile = files.find((f) => f.endsWith('.css'))
  ok('dist/ exists', true)
  ok('dist/index.html exists', existsSync(join(distDir, 'index.html')))
  if (existsSync(join(distDir, 'index.html'))) {
    html = readFileSync(join(distDir, 'index.html'), 'utf8')
  }
  if (jsFile) {
    bundle = readFileSync(join(assetsDir, jsFile), 'utf8')
    ok('JS bundle', bundle.length > 0, (bundle.length / 1024).toFixed(0) + 'KB')
  }
  if (cssFile) {
    css = readFileSync(join(assetsDir, cssFile), 'utf8')
    ok('CSS bundle', css.length > 0, (css.length / 1024).toFixed(1) + 'KB')
  }
} else {
  ok('dist/ exists', false)
}

// 3. pages base
section('3. GitHub Pages base path')
ok('base applied', html.includes('/Congruence_symmetry/'))
ok('JS ref under base', /src="\/Congruence_symmetry\/assets\//.test(html))
ok('CSS ref under base', /href="\/Congruence_symmetry\/assets\//.test(html))

// 4. modules in bundle (ASCII-safe markers only; minifier keeps class names)
section('4. app modules in bundle')
for (const [label, s] of [
  ['toolbar class', 'toolbar'],
  ['shape chip class', 'shape-chip'],
  ['banner class', 'banner'],
  ['overlap glow', 'overlap-glow'],
  ['celebrate class', 'celebrate'],
  ['setPointerCapture', 'setPointerCapture'],
  ['requestAnimationFrame', 'requestAnimationFrame'],
  ['pointerdown handler', 'pointerdown'],
  ['viewBox attr', 'viewBox'],
]) {
  ok(label, bundle.includes(s), s)
}

// 5. css
section('5. css styles')
for (const [label, s] of [
  ['toolbar', '.toolbar'],
  ['shape chip', '.shape-chip'],
  ['success banner', '.banner--success'],
  ['hint banner', '.banner--hint'],
  ['neutral banner', '.banner--neutral'],
  ['tap token', '--tap'],
  ['pop keyframes', '@keyframes pop'],
  ['pulse keyframes', '@keyframes pulse'],
]) {
  ok(label, css.includes(s), s)
}
// minifier rewrites (min-width: 900px) -> (width>=900px)
ok('tablet breakpoint', /@media\s*\(width\s*>=\s*900px\)/.test(css), '(width>=900px)')

// 6. Korean strings from source (UTF-8 read, compared via expected.json)
section('6. korean strings in source')
{
  const expected = JSON.parse(readFileSync(join(root, 'scripts/expected.json'), 'utf8'))
  const readSrc = (p) => readFileSync(join(root, p), 'utf8')

  const shapeSrc = readSrc('src/geometry/shapes.ts')
  for (const n of expected.shapeNames) {
    ok('shape in shapes.ts', shapeSrc.includes("name: '" + n + "'"), n)
  }

  const appSrc = readSrc('src/App.tsx')
  const bannerSrc = readSrc('src/components/ResultBanner.tsx')
  const toolSrc = readSrc('src/components/ToolBar.tsx')

  const ui = expected.uiStrings
  ok('home title', appSrc.includes(ui.homeTitle), ui.homeTitle)
  ok('step 1', appSrc.includes(ui.step1))
  ok('step 2', appSrc.includes(ui.step2))
  ok('start button', appSrc.includes(ui.startBtn))
  ok('mode title', readSrc('src/modes/StackPractice.tsx').includes(ui.modeTitle))
  ok('success msg', bannerSrc.includes(ui.success))
  ok('size differs msg', bannerSrc.includes(ui.sizeDiffers), ui.sizeDiffers)
  ok('overlay hint', bannerSrc.includes(ui.overlayHint))
  ok('tool move', toolSrc.includes(ui.toolMove), ui.toolMove)
  ok('tool rotate', toolSrc.includes(ui.toolRotate))
  ok('tool flip', toolSrc.includes(ui.toolFlip))
  ok('tool scale', toolSrc.includes(ui.toolScale))
  ok('reset', toolSrc.includes(ui.reset))
  ok('drag hint', toolSrc.includes(ui.dragHint), ui.dragHint)
}

console.log('\n' + '-'.repeat(52))
console.log('PASS ' + pass + '   FAIL ' + fail)
if (fail > 0) process.exit(1)
console.log('build verification passed')