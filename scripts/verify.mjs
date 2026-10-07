/**
 * Build output verification.
 *
 * Runs the production build, then inspects what came out. Complements the
 * specs, which test behaviour: this checks that the strings and modules the
 * child relies on actually reach the bundle.
 *
 * Korean literals live in expected.json. Literal escapes get mangled on the
 * way to disk in this environment.
 *
 * Run: npm run verify
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

const root = process.cwd()
const read = (p) => readFileSync(join(root, p), 'utf8')

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
  if (existsSync(join(distDir, 'index.html'))) html = readFileSync(join(distDir, 'index.html'), 'utf8')
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

// 3. Pages base path
section('3. GitHub Pages base path')
ok('base applied', html.includes('/Congruence_symmetry/'))
ok('JS ref under base', /src="\/Congruence_symmetry\/assets\//.test(html))
ok('CSS ref under base', /href="\/Congruence_symmetry\/assets\//.test(html))

// 4. modules reached the bundle
section('4. app modules in bundle')
for (const [label, s] of [
  ['unit list class', 'unit-list'],
  ['board shape class', 'canvas'],
  ['overlap glow removal', 'overlap-layer'],
  ['pointer capture API', 'setPointerCapture'],
  ['pointerdown handler', 'pointerdown'],
  ['viewBox attr', 'viewBox'],
  ['getBoundingClientRect', 'getBoundingClientRect'],
]) {
  ok(label, bundle.includes(s), s)
}

// 5. styles
section('5. css styles')
for (const [label, s] of [
  ['unit list', '.unit-list'],
  ['unit badge', '.unit-list__badge'],
  ['toolbar', '.toolbar'],
  ['success banner', '.banner--success'],
  ['hint banner', '.banner--hint'],
  ['neutral banner', '.banner--neutral'],
  ['tap token', '--tap'],
  ['pop keyframes', '@keyframes pop'],
  ['disabled tool button', '.mini-btn:disabled'],
]) {
  ok(label, css.includes(s), s)
}
ok('tablet breakpoint', /@media\s*\(width\s*>=\s*900px\)/.test(css), '(width>=900px)')

// 6. source-level checks
section('6. source checks')
const expected = JSON.parse(read('scripts/expected.json'))
const appSrc = read('src/App.tsx')
const stageSrc = read('src/modes/CongruenceStage.tsx')
const ui = expected.uiStrings

ok('home title', appSrc.includes(ui.homeTitle), ui.homeTitle)
ok('unit title', appSrc.includes(ui.unitTitle), ui.unitTitle)
ok('start button', appSrc.includes(ui.startBtn))
ok('stage title', stageSrc.includes(ui.unitTitle))
ok('verdict wording', stageSrc.includes(ui.congruentMsg), ui.congruentMsg)
ok('direction lesson', stageSrc.includes(ui.directionMsg), ui.directionMsg)
ok('drag hint', stageSrc.includes(ui.dragHint), ui.dragHint)
for (const label of expected.toolLabels) ok('tool label', stageSrc.includes(label), label)

// one board, not two screens
ok('no shape picker', !appSrc.includes('ShapePicker'))
ok('no stage1 screen file', !existsSync(join(root, 'src/modes/Stage1Find.tsx')))
ok('no stage2 screen file', !existsSync(join(root, 'src/modes/StackPractice.tsx')))

// geometry stayed in the geometry layer
const pairsSrc = read('src/geometry/pairs.ts')
ok('pair detection exists', pairsSrc.includes('findMatches'))
ok('both match conditions required', pairsSrc.includes('sameCongruence') && pairsSrc.includes('fullyCovered'))
const overlapSrc = read('src/geometry/overlap.ts')
ok('overlap geometry exists', overlapSrc.includes('measureOverlap'))
const boardSrc = read('src/geometry/board.ts')
ok('trapezoid defined on the board', boardSrc.includes('function trapezoid'))
ok('twelve shapes on the board', (boardSrc.match(/\{ id: '/g) ?? []).length === 12)
// the verdict engine tries the mirror as well as rotation
const verdictSrc = read('src/geometry/verdict.ts')
ok('verdict engine exists', verdictSrc.includes('judge'))
ok('verdict seats the turned shape', verdictSrc.includes('seat('))
ok('verdict pivots on the centroid', verdictSrc.includes('polygonCentroid'))
ok('shape and size reported apart', verdictSrc.includes('sameOutline'))

// shape catalogue
const shapeSrc = read('src/geometry/shapes.ts')
for (const n of expected.shapeNames) {
  ok('shape in shapes.ts', shapeSrc.includes("name: '" + n + "'"), n)
}

console.log('\n' + '-'.repeat(52))
console.log('PASS ' + pass + '   FAIL ' + fail)
if (fail > 0) process.exit(1)
console.log('build verification passed')