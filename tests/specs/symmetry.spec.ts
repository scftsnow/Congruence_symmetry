/**
 * Symmetry spec.
 *
 * Three things have to hold, and the third one is the reason the first two are
 * checked the way they are.
 *
 * The shapes must be answerable: every true axis has to run in a snapped
 * direction through a lattice point, because the child can only draw what the
 * grid allows. A genuinely symmetric shape with its only axis at an odd angle
 * would be unanswerable, and the pentagon and the star are out for exactly this
 * reason.
 *
 * The snap must be honest: a tap is not a line, and judging one would answer a
 * question the child never asked.
 *
 * And the fold must land. The demonstration shows one half travelling onto the
 * other; if the transform string were malformed the half would sail off
 * somewhere else and every geometric property would stay perfectly true.
 */

import { describe, it, expect } from '../harness/api'
import {
  ANGLE_TOLERANCE,
  axisAngle,
  axisMatches,
  CENTER_TOLERANCE,
  distanceToLine,
  extendAxisToRect,
  findAxes,
  foldPoint,
  foldTransform,
  isAxisSymmetric,
  isLineSymmetric,
  judgeAxis,
  lineHitsRect,
  matchAxisIndex,
  paddedBox,
  snapAxisToGrid,
  splitByAxis,
  type Axis,
} from '../../src/geometry/symmetry'
import { SYMMETRY_ITEMS, SYMM_CENTER } from '../../src/geometry/symmetryShapes'
import {
  symmetryAxisDonePanelFor,
  symmetryDonePanelFor,
  symmetryFoundFor,
  symmetryHintFor,
  symmetryInstructionFor,
  symmetryNoAxisFor,
} from '../../src/components/symmText'
import { isSimplePolygon, measureOverlap, polygonArea } from '../../src/geometry/overlap'
import { applyTransform, identity, reflectAcrossLine } from '../../src/geometry/transforms'
import type { Point } from '../../src/geometry/types'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** A source file, for the checks that are about how something is written. */
function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

/** Every item placed exactly as the scene places it. */
const placed = SYMMETRY_ITEMS.map((item) => ({
  item,
  points: applyTransform(item.shape.vertices, identity(SYMM_CENTER.x, SYMM_CENTER.y)),
}))

// ── the shapes are answerable ─────────────────────────────

describe('every shape can be answered on the grid', () => {
  it('offers five items, easiest first and none last', () => {
    expect(SYMMETRY_ITEMS.length).toBe(5)
    expect(SYMMETRY_ITEMS.map((s) => s.axes)).toEqual([1, 2, 1, 4, 0])
    expect(SYMMETRY_ITEMS[4].shape.vertices.length).toBe(3)
  })

  it('has no outline that crosses itself', () => {
    const broken = SYMMETRY_ITEMS.filter((s) => !isSimplePolygon(s.shape.vertices))
    expect(broken.map((s) => s.id).join(', ') || 'ok').toBe('ok')
  })

  it('has a real interior in every shape', () => {
    for (const s of SYMMETRY_ITEMS) {
      expect(polygonArea(s.shape.vertices) > 2000 ? 'ok' : s.id + ' is thin').toBe('ok')
    }
  })

  it('finds exactly the declared number of axes', () => {
    // The count is the answer key. If the geometry found a different number
    // than the file declares, one of the two is wrong, and the child would be
    // marked wrong for a line that is right.
    for (const { item } of placed) {
      const found = findAxes(item.shape.vertices).length
      expect(found === item.axes ? 'ok' : `${item.id}: declared ${item.axes}, found ${found}`).toBe('ok')
    }
  })

  it('runs every true axis in a snapped direction through a lattice point', () => {
    // The child can only draw what the grid allows. An axis at an odd angle
    // would be genuinely right and genuinely undrawable.
    const bad: string[] = []
    for (const { item } of placed) {
      for (const axis of findAxes(item.shape.vertices)) {
        const snapped = Math.round(axisAngle(axis) / 45) * 45
        let diff = Math.abs(axisAngle(axis) - snapped)
        if (diff > 90) diff = 180 - diff
        if (diff > 1) bad.push(`${item.id} at ${axisAngle(axis).toFixed(1)}`)
      }
    }
    expect(bad.join(', ') || 'ok').toBe('ok')
  })

  it('keeps every shape well inside the canvas', () => {
    for (const { points } of placed) {
      for (const p of points) {
        expect(p.x > 20 ? 'ok' : `x ${p.x}`).toBe('ok')
        expect(p.x < 1080 ? 'ok' : `x ${p.x}`).toBe('ok')
        expect(p.y > 20 ? 'ok' : `y ${p.y}`).toBe('ok')
        expect(p.y < 540 ? 'ok' : `y ${p.y}`).toBe('ok')
      }
    }
  })
})

// ── the snap is honest ────────────────────────────────────

describe('a drawn line becomes a grid line, or nothing', () => {
  it('snaps a near-horizontal drag to horizontal on lattice points', () => {
    const axis = snapAxisToGrid({ x: 503, y: 298 }, { x: 699, y: 311 })!
    expect(axis.a.x % 50 === 0 && axis.a.y % 50 === 0 ? 'ok' : 'ends off lattice').toBe('ok')
    expect(axis.b.x % 50 === 0 && axis.b.y % 50 === 0 ? 'ok' : 'ends off lattice').toBe('ok')
    expect(axisAngle(axis)).toBe(0)
  })

  it('snaps a near-diagonal drag to the diagonal', () => {
    const axis = snapAxisToGrid({ x: 100, y: 100 }, { x: 290, y: 310 })!
    expect(axisAngle(axis)).toBe(45)
  })

  it('snaps a near-vertical drag to vertical', () => {
    const axis = snapAxisToGrid({ x: 553, y: 120 }, { x: 546, y: 480 })!
    expect(axisAngle(axis)).toBe(90)
  })

  it('refuses a tap without a drag', () => {
    expect(snapAxisToGrid({ x: 500, y: 300 }, { x: 505, y: 302 })).toBe(null)
    expect(snapAxisToGrid({ x: 500, y: 300 }, { x: 500, y: 300 })).toBe(null)
  })

  it('always returns a line long enough to read as one', () => {
    const axis = snapAxisToGrid({ x: 500, y: 300 }, { x: 560, y: 300 })!
    expect(Math.hypot(axis.b.x - axis.a.x, axis.b.y - axis.a.y) >= 100 ? 'ok' : 'too short').toBe('ok')
  })
})

// ── the judgement is real ─────────────────────────────────

describe('an axis counts only when the fold would land', () => {
  it('reflects every symmetric shape onto itself along its true axes', () => {
    for (const { item } of placed) {
      for (const axis of findAxes(item.shape.vertices)) {
        expect(isAxisSymmetric(item.shape.vertices, axis) ? 'ok' : `${item.id} fails its own axis`).toBe('ok')
      }
    }
  })

  it('calls the asymmetric shape what it is', () => {
    const scalene = placed[4]
    expect(isLineSymmetric(scalene.item.shape.vertices)).toBe(false)
    for (const s of placed.slice(0, 4)) {
      expect(isLineSymmetric(s.item.shape.vertices) ? 'ok' : `${s.item.id} not symmetric`).toBe('ok')
    }
  })

  it('accepts a true axis drawn through the middle', () => {
    for (const { item } of placed.slice(0, 4)) {
      const [trueAxis] = findAxes(item.shape.vertices)
      expect(axisMatches(trueAxis, item.shape.vertices) ? 'ok' : `${item.id} rejects its own axis`).toBe('ok')
    }
  })

  it('rejects a line at the wrong angle through the middle', () => {
    // The triangle's only axis is vertical; a horizontal line through the same
    // middle folds it onto empty space.
    const tri = placed[0].item.shape.vertices
    const cx = tri.reduce((s, p) => s + p.x, 0) / tri.length
    const cy = tri.reduce((s, p) => s + p.y, 0) / tri.length
    const sideways: Axis = { a: { x: cx - 100, y: cy }, b: { x: cx + 100, y: cy } }
    expect(axisMatches(sideways, tri)).toBe(false)
    expect(isAxisSymmetric(tri, sideways)).toBe(false)
  })

  it('rejects a parallel line a hand away', () => {
    const tri = placed[0].item.shape.vertices
    const off: Axis = { a: { x: -200, y: -200 }, b: { x: -200, y: 200 } }
    expect(axisMatches(off, tri)).toBe(false)
  })

  it('tells a miss off the shape from a miss at the wrong angle', () => {
    const tri = placed[0].item.shape.vertices
    const box = paddedBox(tri, 10)
    const far: Axis = { a: { x: 1000, y: 1000 }, b: { x: 1100, y: 1000 } }
    expect(lineHitsRect(far, box)).toBe(false)
    const [trueAxis] = findAxes(tri)
    expect(lineHitsRect(trueAxis, box)).toBe(true)
  })

  it('keeps the tolerances honest', () => {
    // A tolerance wider than half the pitch would accept the neighbouring grid
    // line, and then two different snapped lines would both count.
    expect(CENTER_TOLERANCE <= 25 ? 'ok' : 'centre tolerance admits neighbours').toBe('ok')
    expect(ANGLE_TOLERANCE < 22.5 ? 'ok' : 'angle tolerance admits neighbours').toBe('ok')
  })

  it('judges a screen axis against local vertices, shifting once', () => {
    // The exact browser scenario: the finger draws in screen coordinates while
    // the outline lives in its own frame. Shifting the vertices as well as the
    // line moved the shape a whole screen away, so every correct answer was met
    // with "draw it on the shape" — and no unit test caught it, because every
    // check until this one spoke a single frame.
    const tri = SYMMETRY_ITEMS[0].shape.vertices
    const downTheMiddle: Axis = { a: { x: 550, y: 150 }, b: { x: 550, y: 450 } }
    expect(judgeAxis(tri, downTheMiddle)).toBe('hit')
    const sideways: Axis = { a: { x: 400, y: 300 }, b: { x: 700, y: 300 } }
    expect(judgeAxis(tri, sideways)).toBe('miss')
    const farAway: Axis = { a: { x: 1000, y: 1000 }, b: { x: 1100, y: 1000 } }
    expect(judgeAxis(tri, farAway)).toBe('off')
  })

  it('names which true axis a line counts as', () => {
    // "Right" is not enough once a shape has several axes: the hook has to know
    // whether the arrival is new. Each true axis answers with its own index,
    // and anything else answers -1.
    const rect = SYMMETRY_ITEMS[1].shape.vertices
    const axes = findAxes(rect)
    expect(axes.length).toBe(2)
    const first = matchAxisIndex(axes[0], rect)
    const second = matchAxisIndex(axes[1], rect)
    expect(first !== second ? 'ok' : 'both axes share an index').toBe('ok')
    expect(first >= 0 && second >= 0 ? 'ok' : 'a true axis unrecognised').toBe('ok')
    const sideways: Axis = { a: { x: -200, y: -200 }, b: { x: 200, y: -160 } }
    expect(matchAxisIndex(sideways, rect)).toBe(-1)
  })
})

// ── the fold lands ────────────────────────────────────────

describe('the fold carries one half onto the other', () => {
  const axis: Axis = { a: { x: 0, y: -100 }, b: { x: 0, y: 100 } }

  it('starts where the point is', () => {
    const p = { x: 60, y: 30 }
    const q = foldPoint(p, axis, 1)
    expect(Math.hypot(q.x - p.x, q.y - p.y) < 0.001 ? 'ok' : 'moved at rest').toBe('ok')
  })

  it('lands on the mirror image', () => {
    const points = [
      { x: 60, y: 30 },
      { x: -40, y: 80 },
      { x: 0, y: 0 },
    ]
    for (const p of points) {
      const landed = foldPoint(p, axis, -1)
      const mirrored = reflectAcrossLine(p, axis.a, axis.b)
      expect(Math.hypot(landed.x - mirrored.x, landed.y - mirrored.y) < 0.001 ? 'ok' : 'missed the mirror').toBe('ok')
    }
  })

  it('passes through the axis halfway', () => {
    const p = { x: 60, y: 30 }
    const q = foldPoint(p, axis, 0)
    expect(distanceToLine(q, axis) < 0.001 ? 'ok' : 'off the axis').toBe('ok')
  })

  it('writes a transform the browser can interpolate', () => {
    const css = foldTransform(axis, -1)
    // Across the axis, not along it: scaling the along component would send
    // the halfway point off the axis and the landing off the mirror.
    expect(css.includes('scale(1, -1)') ? 'ok' : css).toBe('ok')
    expect(css.includes('rotate(') ? 'ok' : 'no rotation').toBe('ok')
  })

  it('draws the axis edge to edge', () => {
    const shown = extendAxisToRect({ a: { x: 500, y: 250 }, b: { x: 600, y: 250 } }, 1100, 600)
    expect(shown.a.x === 0 && shown.b.x === 1100 ? 'ok' : 'not edge to edge').toBe('ok')
    expect(shown.a.y === 250 && shown.b.y === 250 ? 'ok' : 'left its height').toBe('ok')
  })
})

// ── one half stays, the other folds ───────────────────────

describe('the fold moves one half onto the other', () => {
  it('splits every shape into halves that add back up', () => {
    // Clipping must neither lose area nor invent it. Sutherland–Hodgman against
    // a half-plane is exact, so the two halves have to sum to the whole.
    for (const { item } of placed) {
      const [axis] = findAxes(item.shape.vertices).length
        ? findAxes(item.shape.vertices)
        : [{ a: { x: 0, y: -200 }, b: { x: 0, y: 200 } }]
      const { stay, fold } = splitByAxis(item.shape.vertices, axis)
      const total = polygonArea(item.shape.vertices)
      const sum = polygonArea(stay) + polygonArea(fold)
      expect(Math.abs(sum - total) / total < 0.01 ? 'ok' : `${item.id} lost area`).toBe('ok')
    }
  })

  it('cuts symmetric shapes into equal halves', () => {
    for (const { item } of placed.slice(0, 4)) {
      const [axis] = findAxes(item.shape.vertices)
      const { stay, fold } = splitByAxis(item.shape.vertices, axis)
      const ratio = polygonArea(fold) / polygonArea(stay)
      expect(Math.abs(ratio - 1) < 0.02 ? 'ok' : `${item.id} halves ${ratio.toFixed(2)}`).toBe('ok')
    }
  })

  it('lands the moving half exactly on the still one', () => {
    // The visible proof: after the fold, the travelling half coincides with the
    // half that never moved. Checked as geometry, not pixels.
    for (const { item } of placed.slice(0, 4)) {
      const [axis] = findAxes(item.shape.vertices)
      const { stay, fold } = splitByAxis(item.shape.vertices, axis)
      const landed = fold.map((p) => reflectAcrossLine(p, axis.a, axis.b))
      expect(measureOverlap(landed, stay).contained ? 'ok' : `${item.id} mislands`).toBe('ok')
    }
  })

  it('hands over the whole shape when the line misses it', () => {
    // Folding nothing for the length of the animation would read as the app
    // freezing. The whole outline moves instead, and the verdict afterwards
    // says the line never met the shape.
    const tri = placed[0].item.shape.vertices
    const far: Axis = { a: { x: 1000, y: 1000 }, b: { x: 1100, y: 1000 } }
    const { stay, fold } = splitByAxis(tri, far)
    expect(stay.length === 0 ? 'ok' : 'kept a half of nothing').toBe('ok')
    expect(fold.length === tri.length ? 'ok' : 'dropped the shape').toBe('ok')
  })

  it('never draws the paper twice', () => {
    // The full outline must give way to the halves the moment an axis exists.
    // Drawing it underneath as well showed the moving half twice — where it was
    // and where it was going — which read as the paper splitting in two.
    const scene = source('src/components/SymmetryScene.tsx')
    expect(scene.includes('!axis ?') ? 'ok' : 'full outline always drawn').toBe('ok')
  })
})

// ── the screen asks rather than steers ────────────────────

describe('the child draws, the system folds', () => {
  it('says which line was found, in the unit\'s own words', () => {
    expect(symmetryFoundFor().text).toBe('선대칭도형이에요! 이 선이 대칭축이에요')
    expect(symmetryFoundFor().tone).toBe('success')
  })

  it('calls the last shape a discovery, not a failure', () => {
    expect(symmetryNoAxisFor().text).toContain('선대칭도형이 아니에요')
    expect(symmetryNoAxisFor().tone).toBe('success')
  })

  it('has no rotate or flip control', () => {
    const stage = source('src/modes/AxisBoard.tsx')
    expect(stage.includes('onRotate')).toBeFalsy()
    expect(stage.includes('onFlip')).toBeFalsy()
    expect(stage.includes('rotateBy')).toBeFalsy()
  })

  it('shows no lengths and no angles in figures', () => {
    const stage = source('src/modes/AxisBoard.tsx')
    const geo = source('src/geometry/symmetry.ts')
    expect(stage.includes('sideLength')).toBeFalsy()
    expect(stage.includes('angleSize')).toBeFalsy()
    expect(geo.includes('sideLength')).toBeFalsy()
    expect(geo.includes('angleSize')).toBeFalsy()
  })

  it('keeps the wording out of the board markup', () => {
    // Every board of the unit, not just one: the wording lives in symmText and
    // symmPartsText, and the JSX never spells a sentence. Row titles stay in the
    // stage shells, where titles have always lived.
    for (const screen of [
      'src/modes/AxisBoard.tsx',
      'src/modes/PartsBoard.tsx',
      'src/modes/FactsBoard.tsx',
      'src/modes/DrawBoard.tsx',
    ]) {
      expect(source(screen).includes('대칭축')).toBeFalsy()
    }
    expect(source('src/components/symmText.ts').includes('대칭축')).toBe(true)
  })

  it('holds the state in a hook and the drawing in a component', () => {
    expect(source('src/modes/useSymmetry.ts')).toBeTruthy()
    for (const shell of [
      'src/modes/SymmetryAxisStage.tsx',
      'src/modes/SymmetryPartsStage.tsx',
      'src/modes/SymmetryFactsStage.tsx',
      'src/modes/SymmetryDrawStage.tsx',
    ]) {
      expect(source(shell).includes('useState')).toBeFalsy()
    }
    expect(source('src/components/SymmetryScene.tsx').includes('useState')).toBeFalsy()
    expect(source('src/components/SymmetryScene.tsx').includes('useEffect')).toBeFalsy()
  })

  it('keeps every found axis until the shape is settled', () => {
    // One right answer settles one axis, and only the last one settles the
    // shape. A hook that resolved on the first hit would let the square pass
    // with one line drawn — and a repeat of that line would have nothing to
    // say, since "found" would already be over.
    const hook = source('src/modes/useSymmetry.ts')
    expect(hook.includes('foundIdx')).toBeTruthy()
    expect(hook.includes('foundLines')).toBeTruthy()
    expect(/foundIdx\.length \+ 1 >= shape\.axes/.test(hook) ? 'ok' : 'resolves on first hit').toBe('ok')
    const scene = source('src/components/SymmetryScene.tsx')
    expect(scene.includes('foundLines')).toBeTruthy()
    expect(scene.includes('sym-axis--found')).toBeTruthy()
  })

  it('answers a repeated axis without counting', () => {
    // Drawing the same line twice is neither right nor wrong, only done. The
    // hint says so and asks for another — and names no count, because the found
    // lines staying on screen already show how far along this is.
    const words = source('src/components/symmText.ts')
    expect(words.includes('이미 찾았어요')).toBeTruthy()
    expect(/이미 찾았어요[^]*[0-9]/.test(words) ? 'counts in the hint' : 'ok').toBe('ok')
  })

  it('"there is none" is an answer, judged like any other', () => {
    // Asking for a line on the one shape with no axis would make any scribble
    // pass. So "there is none" stands as a claim of its own: right once, wrong
    // everywhere else. It stands on every shape, or its presence would leak
    // which shape has no axis.
    const stage = source('src/modes/AxisBoard.tsx')
    expect(stage.includes('denyClaim')).toBeTruthy()
    expect(stage.includes('SYMM_DENY_LABEL')).toBeTruthy()
    expect(stage.includes('대칭축이 없어요') ? 'wording hardcoded in markup' : 'ok').toBe('ok')
    const hook = source('src/modes/useSymmetry.ts')
    expect(hook.includes('denyClaim')).toBeTruthy()
    expect(hook.includes("'deny'")).toBeTruthy()
    const words = source('src/components/symmText.ts')
    expect(words.includes('접으면 겹치는 선이 있어요. 찾아보세요')).toBeTruthy()
    expect(words.includes('대칭축이 없어요')).toBeTruthy()
  })

  it('"there is none" rides the foot of the grid, not a strip below it', () => {
    // An answer about the board sits on the board. Both finding boards say so
    // the same way: the button lives inside the board's own wrap, pinned to
    // its bottom edge, and no foot strip is left behind for it.
    for (const board of ['src/modes/AxisBoard.tsx', 'src/modes/CenterBoard.tsx']) {
      const code = source(board)
      expect(code.includes('sym-deny')).toBeTruthy()
      expect(code.indexOf('sym-deny') > code.indexOf('canvas-wrap')).toBeTruthy()
      // and whatever foot strip remains holds only the way onward, never the denial
      const afterFoot = code.slice(code.indexOf('sym-foot'))
      expect(afterFoot.includes('denyClaim')).toBeFalsy()
    }
    const css = source('src/styles/symmetry.css')
    expect(/\.sym-deny\s*\{[^}]*position:\s*absolute/.test(css)).toBeTruthy()
    expect(/\.sym-deny\s*\{[^}]*bottom:\s*14px/.test(css)).toBeTruthy()
  })

  it('asks for more axes after a find, and counts none of them', () => {
    // The wrong line said "this is the axis" on the first hit, so a correct
    // answer read as the end of the shape and the square never moved on. The
    // unfinished find asks for more, and the teal lines already on the board are
    // the progress — no count is ever spoken.
    const hook = source('src/modes/useSymmetry.ts')
    expect(hook.includes('symmetryMoreFor')).toBeTruthy()
    expect(/\? resolved[\s\S]{0,200}: symmetryMoreFor\(\)/.test(hook) ? 'ok' : 'unreachable').toBe(
      'ok',
    )
    const words = source('src/components/symmText.ts')
    expect(words.includes('다른 대칭축도 있는지 찾아보세요')).toBeTruthy()
    expect(/찾아보세요[^]*[0-9]/.test(words) ? 'counts axes aloud' : 'ok').toBe('ok')
  })

  it('reaches each row from the home list', () => {
    const app = source('src/App.tsx')
    for (const stage of [
      'SymmetryAxisStage',
      'SymmetryPartsStage',
      'SymmetryFactsStage',
      'SymmetryDrawStage',
    ]) {
      expect(app.includes(stage)).toBe(true)
    }
    for (const screen of [
      "'symmetry-axis'",
      "'symmetry-parts'",
      "'symmetry-facts'",
      "'symmetry-draw'",
    ]) {
      expect(app.includes(screen)).toBe(true)
    }
    expect(/unit-list__item--locked[\s\S]{0,400}symmetry/.test(app)).toBeFalsy()
  })
})

describe('the ending names the kind, not the shape', () => {
  it('congratulates without counting axes', () => {
    const done = symmetryDonePanelFor()
    expect(done.title.map((p) => p.text).join('')).toBe('선대칭도형을 모두 찾았어!')
    expect(done.note).toBe('하나의 직선을 따라 접었을 때 완전히 겹치는 도형이 선대칭도형이야')
    expect(/[0-9]/.test(done.note) ? 'counts in the lesson' : 'ok').toBe('ok')
  })

  it('ends the axis row on the figures, not the lines', () => {
    // The row finds symmetric figures by drawing their axes, so its ending names
    // the figures: the axis was the way, never the goal.
    const done = symmetryAxisDonePanelFor()
    expect(done.title.map((p) => p.text).join('')).toBe('선대칭도형을 모두 찾았어!')
    expect(done.note).toBe('하나의 직선을 따라 접었을 때 완전히 겹치는 도형이 선대칭도형이야')
  })
})

const { report } = await import('../harness/spec.mjs')
report()
