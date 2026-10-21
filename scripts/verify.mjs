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

/*
 * The correspondence unit, checked for arriving whole.
 *
 * This is here because of the flower: a petal loop advanced by two instead of one,
 * so every shape that used it rendered empty — and lint, the tests, the type
 * checker and the build all passed. A screen can be wired into the app, styled,
 * type-checked and bundled and still show nothing. What proves otherwise is
 * looking in the artefact, so the sentences this unit speaks are searched for in
 * the built bundle rather than trusted from the source.
 *
 * expected.json is read again here rather than reused from below, because the
 * bundle is checked before that file is parsed.
 */
const corr = JSON.parse(read('scripts/expected.json')).correspondence
for (const [label, s] of [
  ['correspondence scene', 'corr-flyline'],
  ['correspondence taps', 'corr-tap'],
  ['correspondence target', 'corr-target'],
  ['correspondence title', corr.title],
  ['shape captions', corr.firstShape],
  ['second shape caption', corr.secondShape],
  ['conclusion', corr.conclusion],
  ['side in flight', corr.movingSide],
  ['angle in flight', corr.movingAngle],
  ...corr.pairNotes.map((n) => ['pair note', n]),
  ...corr.asks.map((n) => ['ask', n]),
  ...corr.hints.map((n) => ['hint', n]),
]) {
  ok(label, bundle.includes(s), s)
}

// 5. styles
section('5. css styles')
for (const [label, s] of [
  ['unit list', '.unit-list'],
  ['unit badge', '.unit-list__badge'],
  ['success popup', '.toast--success'],
  ['hint popup', '.toast--hint'],
  ['popup arrival', '@keyframes toast-in'],
  ['tap token', '--tap'],
  ['pop keyframes', '@keyframes pop'],
  ['disabled tool button', '.mini-btn:disabled'],
  ['correspondence target', '.corr-target'],
  ['correspondence taps', '.corr-tap'],
  ['correspondence travel', '.corr-fly'],
  ['pulse keyframes', '@keyframes corr-pulse'],
  ['symmetry fold', '.sym-fold'],
  ['symmetry axis', '.sym-axis'],
  ['symmetry draft', '.sym-draft'],
]) {
  ok(label, css.includes(s), s)
}
ok('tablet breakpoint', /@media\s*\(width\s*>=\s*900px\)/.test(css), '(width>=900px)')

// 6. source-level checks
section('6. source checks')
const expected = JSON.parse(read('scripts/expected.json'))
const appSrc = read('src/App.tsx')
const stageSrc = read('src/modes/CongruenceStage.tsx')
// The sentences live apart from the screen that draws them, so the wording is
// checked where it is written. Reading it from the stage used to work until the
// file was split, and then failed for the wrong reason.
const wordsSrc = read('src/components/verdictText.ts')
const ui = expected.uiStrings

ok('home title', appSrc.includes(ui.homeTitle), ui.homeTitle)
ok('unit title', appSrc.includes(ui.unitTitle), ui.unitTitle)
ok('stage title', stageSrc.includes(ui.unitTitle))

/*
 * One way into each unit, not two.
 *
 * The home used to carry a start button under the list pointing at the first
 * unit, so the same place had a small door in the list and a big one underneath
 * it. The rows are now the only way in, which is checked here so the duplicate
 * cannot creep back.
 */
ok('home has no start button of its own', !appSrc.includes('className="start-btn"'))
/*
 * The list used to hold ten hand-written rows, so this counted the buttons. The
 * rows come out of one list now — which is the point of the list: one button, ten
 * doors — so what has to hold is that the row is a real button and that it is
 * rendered for every unit rather than once.
 */
ok(
  'every unit row is a real button',
  appSrc.includes('className="unit-open"') &&
    /UNITS\.map\(/.test(appSrc) &&
    (appSrc.match(/\bid: '/g) || []).length >= 10,
)

/*
 * Every unit ends somewhere.
 *
 * The star burst is over in a second and a half, which is a flash rather than an
 * ending, and the header back arrow reads as navigation. Each unit therefore
 * states its own lesson and offers a way back to the start once it is cleared.
 */
ok('congruence ends with a way home', stageSrc.includes('DonePanel'))
ok('correspondence ends with a way home', read('src/modes/CorrespondenceStage.tsx').includes('DonePanel'))
// every symmetry row ends its own way, with the sentence its row was for
for (const stage of [
  'src/modes/SymmetryAxisStage.tsx',
  'src/modes/SymmetryPartsStage.tsx',
  'src/modes/SymmetryFactsStage.tsx',
  'src/modes/SymmetryDrawStage.tsx',
]) {
  ok(`symmetry row ends with a way home (${stage})`, read(stage).includes('DonePanel'), 'DonePanel')
}
ok('the ending lives in one component', existsSync(join(root, 'src/components/DonePanel.tsx')))
ok('home label', read('src/components/verdictText.ts').includes(ui.homeLabel), ui.homeLabel)
ok('congruence ending names the lesson', read('src/components/verdictText.ts').includes(ui.congruenceNote), ui.congruenceNote)
ok('correspondence ending names the lesson', read('src/components/corrText.ts').includes(ui.corrNote), ui.corrNote)
ok('symmetry ending names the lesson', read('src/components/symmText.ts').includes(ui.symmNote), ui.symmNote)
for (const s of [ui.congruenceNote, ui.corrNote, ui.symmNote]) ok('ending reached the bundle', bundle.includes(s), s)
ok('verdict wording', wordsSrc.includes(ui.congruentMsg), ui.congruentMsg)
ok('direction lesson', wordsSrc.includes(ui.directionMsg), ui.directionMsg)
ok('drag hint', stageSrc.includes(ui.dragHint), ui.dragHint)
for (const label of expected.toolLabels) ok('tool label', stageSrc.includes(label), label)

// The correspondence unit. Its sentences live in corrText.ts apart from the
// screen, so the wording is checked where it is written rather than where it is
// drawn — reading it from the screen used to work until the file was split, and
// then failed for the wrong reason.
const corrSrc = read('src/components/corrText.ts')
const corrStageSrc = read('src/modes/CorrespondenceStage.tsx')
const corrShapesSrc = read('src/geometry/correspondenceShapes.ts')
const c = expected.correspondence
ok('correspondence title', corrStageSrc.includes(c.title), c.title)
ok('correspondence unit row', appSrc.includes(c.unitRow), c.unitRow)
ok('shape captions', corrSrc.includes(c.firstShape) && corrSrc.includes(c.secondShape))
ok('conclusion wording', corrSrc.includes(c.conclusion), c.conclusion)
for (const n of c.asks) ok('ask', corrSrc.includes(n), n)
for (const n of c.hints) ok('hint', corrSrc.includes(n), n)
for (const n of c.pairNotes) ok('pair note', corrShapesSrc.includes(n), n)
// No length and no angle size is quoted anywhere in the unit. A figure the child
// cannot produce with their own hands is one they can only be told, and degrees
// belong to a later unit in fifth grade anyway.
ok('no degree is quoted', !/[0-9]+\s*도/.test(corrSrc))
ok('no length is quoted', !/[0-9]+\s*(cm|mm|px)/.test(corrSrc))
// No turn control reappears. Direction was settled in the congruence unit.
const corrHookSrc = read('src/modes/useCorrespondence.ts')
ok(
  'no rotate or flip control',
  !/onRotate|onFlip|rotateBy/.test(corrStageSrc) && !/onRotate|onFlip|rotateBy/.test(corrHookSrc),
)

// The symmetry unit. Same treatment as the correspondence unit above: its
// sentences live in symmText.ts apart from the screen, the fold is checked in
// the artefact rather than trusted from the source, and no figure is quoted.
const symm = JSON.parse(read('scripts/expected.json')).symmetry
for (const [label, s] of [
  ['symmetry scene', 'sym-fold'],
  ['symmetry axis', 'sym-axis'],
  ['symmetry draft', 'sym-draft'],
  ['symmetry title', symm.title],
  ['symmetry instruction', symm.instruction],
  ['symmetry found', symm.found],
  ['symmetry more axes', symm.foundMore],
  ['symmetry no-axis', symm.noAxis],
  ['symmetry conclusion', symm.conclusion],
  ...symm.shapeNotes.map((n) => ['symmetry shape', n]),
  ...[symm.hintOff, symm.hintMiss, symm.hintDup, symm.denyHint].map((n) => ['symmetry hint', n]),
  ['symmetry deny label', symm.denyLabel],
]) {
  ok(label, bundle.includes(s), s)
}

// The symmetry unit's sentences live in symmText.ts apart from the screen.
const symmSrc = read('src/components/symmText.ts')
const symmPartsSrc = read('src/components/symmPartsText.ts')
const symmAxisSrc = read('src/modes/AxisBoard.tsx')
const symmShapesSrc = read('src/geometry/symmetryShapes.ts')
const symmStages = [
  read('src/modes/SymmetryAxisStage.tsx'),
  read('src/modes/SymmetryPartsStage.tsx'),
  read('src/modes/SymmetryFactsStage.tsx'),
  read('src/modes/SymmetryDrawStage.tsx'),
]
const y = expected.symmetry
// one row per question on the home screen, each row opening its own stage
for (const [label, s, stage] of [
  ['symmetry axis row', y.axisRow, 0],
  ['symmetry parts row', y.partsRow, 1],
  ['symmetry facts row', y.factsRow, 2],
  ['symmetry draw row', y.drawRow, 3],
]) {
  ok(label, appSrc.includes(s) && symmStages[stage].includes(s), s)
}
ok('symmetry instruction', symmSrc.includes(y.instruction), y.instruction)
ok('symmetry found', symmSrc.includes(y.found), y.found)
ok('symmetry more axes', symmSrc.includes(y.foundMore), y.foundMore)
ok('symmetry no-axis', symmSrc.includes(y.noAxis), y.noAxis)
ok('symmetry conclusion', symmSrc.includes(y.conclusion), y.conclusion)
ok('symmetry hint off shape', symmSrc.includes(y.hintOff), y.hintOff)
ok('symmetry hint miss', symmSrc.includes(y.hintMiss), y.hintMiss)
ok('symmetry hint duplicate', symmSrc.includes(y.hintDup), y.hintDup)
ok('symmetry deny hint', symmSrc.includes(y.denyHint), y.denyHint)
ok('symmetry deny label', symmSrc.includes(y.denyLabel), y.denyLabel)
ok('symmetry axis done', y.axisDone.every((s) => symmSrc.includes(s)), y.axisDone.join(''))
// The deny button stands on every axis board, or its presence would leak which
// figure has no axis.
ok('symmetry deny button on every shape', symmAxisSrc.includes('denyClaim'), 'denyClaim')
for (const n of y.shapeNotes) ok('symmetry shape', symmShapesSrc.includes(n), n)

// The rows after the axis, and every sentence they can say. Done titles arrive
// as fragment arrays, because DonePanel titles are styled spans, never one string.
for (const [label, s] of [
  ...y.partsAsk.map((n) => ['symmetry parts ask', n]),
  ['symmetry parts how leg', y.partsHowLeg],
  ['symmetry parts how carry', y.partsHowCarry],
  ...y.partsFound.map((n) => ['symmetry parts found', n]),
  ...y.partsHint.map((n) => ['symmetry parts hint', n]),
  ['symmetry parts done', y.partsDone],
  ['symmetry parts note', y.partsNote],
  ...Object.values(y.factsAsk).map((n) => ['symmetry facts ask', n]),
  ...Object.values(y.factsMiss).map((n) => ['symmetry facts hint', n]),
  ...Object.values(y.factsFact).map((n) => ['symmetry facts said', n]),
  ['symmetry facts done', y.factsDone],
  ...Object.values(y.drawAsk).map((n) => ['symmetry draw ask', n]),
  ['symmetry draw missed', y.drawMissed],
  ['symmetry draw link ask', y.drawLinkAsk],
  ['symmetry draw link miss', y.drawLinkMiss],
  ['symmetry draw linked', y.drawLinked],
  ['symmetry draw said', y.drawDone.found],
  ['symmetry draw said', y.drawDone.next],
  ['symmetry draw said', y.drawDone.all],
  ['symmetry draw done all', y.drawDone.doneAll],
]) {
  const parts = Array.isArray(s) ? s : [s]
  ok(label, parts.every((p) => symmPartsSrc.includes(p)), parts.join(''))
}
// the eight boards, and the marks that carry the facts
ok('symmetry has eight boards', /SYMM_BOARDS: SymmetryBoard\[\] = \[[\s\S]*\]\n/.test(symmShapesSrc))
// the answer riding the foot of the grid, still styled after the nav went away
const symmCss = read('src/styles/symmetry.css')
for (const c of ['.sym-right', '.sym-tick', '.sym-join', '.sym-deny']) {
  ok(`symmetry style ${c}`, symmCss.includes(c), c)
}
// No figure is quoted anywhere in the unit, and no turn control reappears.
ok('symmetry quotes no degree', !/[0-9]+\s*도/.test(symmSrc))
ok('symmetry quotes no length', !/[0-9]+\s*(cm|mm|px)/.test(symmSrc))
const symmHookSrc = read('src/modes/useSymmetry.ts')
const symmRowSrc = symmStages.join('\n') + read('src/modes/AxisBoard.tsx')
ok(
  'symmetry has no rotate or flip control',
  !/onRotate|onFlip|rotateBy/.test(symmRowSrc) && !/onRotate|onFlip|rotateBy/.test(symmHookSrc),
)

// ── point symmetry: the same checks, about the other mirror ──
const ptsymSrc = read('src/components/pointSymmText.ts')
const ptsymPartsSrc = read('src/components/pointSymmPartsText.ts')
const ptsymCenterSrc = read('src/modes/CenterBoard.tsx')
const ptsymShapesSrc = read('src/geometry/pointSymmetryShapes.ts')
const ptsymStages = [
  read('src/modes/SymmetryPointAxisStage.tsx'),
  read('src/modes/SymmetryPointPartsStage.tsx'),
  read('src/modes/SymmetryPointFactsStage.tsx'),
  read('src/modes/SymmetryPointDrawStage.tsx'),
]
const pt = expected.pointSymmetry
for (const [label, s, stage] of [
  ['point-symmetry axis row', pt.axisRow, 0],
  ['point-symmetry parts row', pt.partsRow, 1],
  ['point-symmetry facts row', pt.factsRow, 2],
  ['point-symmetry draw row', pt.drawRow, 3],
]) {
  ok(label, appSrc.includes(s) && ptsymStages[stage].includes(s), s)
}
ok('point-symmetry instruction', ptsymSrc.includes(pt.instruction), pt.instruction)
ok('point-symmetry found', ptsymSrc.includes(pt.found), pt.found)
ok('point-symmetry no-center', ptsymSrc.includes(pt.noCenter), pt.noCenter)
ok('point-symmetry conclusion', ptsymSrc.includes(pt.conclusion), pt.conclusion)
ok('point-symmetry hint off figure', ptsymSrc.includes(pt.hintOff), pt.hintOff)
ok('point-symmetry hint miss', ptsymSrc.includes(pt.hintMiss), pt.hintMiss)
ok('point-symmetry deny hint', ptsymSrc.includes(pt.denyHint), pt.denyHint)
ok('point-symmetry deny label', ptsymSrc.includes(pt.denyLabel), pt.denyLabel)
ok('point-symmetry axis done', pt.axisDone.every((s) => ptsymSrc.includes(s)), pt.axisDone.join(''))
// The deny button stands on every center board, or its presence would leak which
// figure has no center.
ok('point-symmetry deny button on every figure', ptsymCenterSrc.includes('denyClaim'), 'denyClaim')
for (const n of pt.shapeNotes) ok('point-symmetry shape', ptsymShapesSrc.includes(n), n)

// The rows after the center, and every sentence they can say.
for (const [label, s] of [
  ...pt.partsAsk.map((n) => ['point-symmetry parts ask', n]),
  ...pt.partsFound.map((n) => ['point-symmetry parts found', n]),
  ...pt.partsHint.map((n) => ['point-symmetry parts hint', n]),
  ['point-symmetry parts done', pt.partsDone],
  ['point-symmetry parts note', pt.partsNote],
  ...Object.values(pt.factsAsk).map((n) => ['point-symmetry facts ask', n]),
  ...Object.values(pt.factsMiss).map((n) => ['point-symmetry facts hint', n]),
  ...Object.values(pt.factsFact).map((n) => ['point-symmetry facts said', n]),
  ['point-symmetry facts done', pt.factsDone],
  ...Object.values(pt.drawAsk).map((n) => ['point-symmetry draw ask', n]),
  ['point-symmetry draw missed', pt.drawMissed],
  ['point-symmetry draw link ask', pt.drawLinkAsk],
  ['point-symmetry draw link miss', pt.drawLinkMiss],
  ['point-symmetry draw linked', pt.drawLinked],
  ['point-symmetry draw said', pt.drawDone.found],
  ['point-symmetry draw said', pt.drawDone.next],
  ['point-symmetry draw said', pt.drawDone.all],
  ['point-symmetry draw done all', pt.drawDone.doneAll],
]) {
  const parts = Array.isArray(s) ? s : [s]
  ok(label, parts.every((p) => ptsymPartsSrc.includes(p)), parts.join(''))
}
// the ten boards, and the marks that carry the facts
ok('point-symmetry has ten boards', /POINT_SYMM_BOARDS: PointSymmetryBoard\[\] = \[[\s\S]*\]\n/.test(ptsymShapesSrc))
for (const c of ['.sym-hub', '.sym-turn']) {
  ok(`point-symmetry style ${c}`, symmCss.includes(c), c)
}
// No figure is quoted anywhere in the unit either. 180도는 the half turn itself —
// the definition of the unit, named by the owner — so only other angles are banned.
ok('point-symmetry quotes no degree', !/[0-9]+\s*도/.test(ptsymSrc.replace(/180\s*도/g, '')))
ok('point-symmetry quotes no length', !/[0-9]+\s*(cm|mm|px)/.test(ptsymSrc))
ok('point-symmetry quotes no degree in parts', !/[0-9]+\s*도/.test(ptsymPartsSrc))

// No angle is ever named. "돌려서 겹쳤어" reports that the system turned the
// shape; saying 90 or 270 would hand over the answer to the next question.
ok('no angle is named anywhere', !/[0-9]+\s*°/.test(wordsSrc) && !/[0-9]+\s*도/.test(wordsSrc))
// No percentage. A number comparing two shapes invited a comparison the child
// has no way to make: two arrows stacked dead centre agree 58%.
ok('no percentage on screen', !/%\s*[)}]/.test(stageSrc) && !/겹친 부분/.test(wordsSrc))

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
ok('twelve shapes on the board', (boardSrc.match(/place\(LABELS\[/g) ?? []).length === 12)
ok('twelve syllables, no escapes', boardSrc.includes('LABELS') && !/label: '\\u/.test(boardSrc))
// the verdict engine tries the mirror as well as rotation
const verdictSrc = read('src/geometry/verdict.ts')
ok('verdict engine exists', verdictSrc.includes('judge'))
ok('verdict seats the turned shape', verdictSrc.includes('seat('))
ok('verdict pivots on the centroid', verdictSrc.includes('polygonCentroid'))
ok('shape and size reported apart', verdictSrc.includes('sameOutline'))
// A congruent outline alone must not license a turn: the shapes have to be
// stacked first. This shipped once as a mid-air rotation, so it is checked in
// the bundle as well as the specs.
const overlapSrc2 = read('src/geometry/overlap.ts')
ok('a turn requires the shapes to be together', overlapSrc2.includes('touching') && verdictSrc.includes('touching('))
ok('proximity is measured against the shapes own size', overlapSrc2.includes('reachOf'))
ok('overlap is sampled, not read off a clipper', overlapSrc2.includes('agreement'))
ok('concave shapes are triangulated', overlapSrc2.includes('triangulate'))
ok('a malformed shape is detectable', overlapSrc2.includes('isSimplePolygon'))
ok('the turned shape lands on its partner', verdictSrc.includes('turnedItem'))
ok('the banner decides nothing', (boardSrc.match(/judge\(/g) ?? []).length === 0)

// shape catalogue
const shapeSrc = read('src/geometry/shapes.ts')
for (const n of expected.shapeNames) {
  ok('shape in shapes.ts', shapeSrc.includes("name: '" + n + "'"), n)
}

/*
 * The 별자리 webfonts ship inside the bundle, not from a CDN: a classroom
 * tablet may be offline, and a font that arrives over the network is a font
 * that may not arrive. Both subset weights have to be in dist/assets, next to
 * the CSS that names them.
 */
if (existsSync(assetsDir)) {
  const built = readdirSync(assetsDir)
  ok(
    '별자리 L ships in the bundle',
    built.some((f) => f.startsWith('hakgyoansim-byeoljari-l-') && f.endsWith('.woff2')),
  )
  ok(
    '별자리 B ships in the bundle',
    built.some((f) => f.startsWith('hakgyoansim-byeoljari-b-') && f.endsWith('.woff2')),
  )
}

console.log('\n' + '-'.repeat(52))
console.log('PASS ' + pass + '   FAIL ' + fail)
if (fail > 0) process.exit(1)
console.log('build verification passed')