/**
 * Board spec — twelve shapes: five pairs and two distractors.
 *
 * The system judges every stack, so the two questions this file answers are:
 * does the board contain exactly the pairs it claims, and can the system
 * resolve each one without the child choosing an angle?
 */

import { describe, it, expect } from '../harness/api'
import { buildBoard, shapePoints, TARGET_PAIRS } from '../../src/modes/useBoard'
import { judge, isMatch } from '../../src/geometry/verdict'
import { checkCongruence, EPSILON_STACK } from '../../src/geometry/compare'
import {
  isSimplePolygon,
  measureOverlap,
  polygonArea,
  triangulate,
} from '../../src/geometry/overlap'
import { applyTransform } from '../../src/geometry/transforms'
import type { BoardShape } from '../../src/modes/useBoard'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const board = buildBoard()
const CANVAS = 1100

const at = (id: string) => board.find((i) => i.shape.id === id)!

/** Place `item` on top of `onto`. */
function stack(onto: BoardShape, item: BoardShape) {
  return {
    reference: shapePoints(onto),
    held: applyTransform(item.shape.vertices, {
      cx: onto.x,
      cy: onto.y,
      rotation: item.rotation,
      flipped: item.flipped,
      scale: 1,
    }),
  }
}

function sameOutline(a: BoardShape, b: BoardShape): boolean {
  return checkCongruence(shapePoints(a), shapePoints(b), EPSILON_STACK, CANVAS, false).isCongruent
}

// ── layout ───────────────────────────────────────────────
describe('the board is laid out', () => {
  it('lays out twelve shapes', () => {
    expect(board.length).toBe(12)
  })

  it('gives every shape a single hangul syllable', () => {
    for (const item of board) {
      expect([...item.label].length).toBe(1)
    }
  })

  it('never reuses a label', () => {
    const labels = board.map((i) => i.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('reads as the alphabet, left to right and top to bottom', () => {
    // The child can name any shape they are looking at, which matters once the
    // screen starts telling them to turn one.
    const bands = [250, 500]
    const top = board.filter((i) => i.y < bands[0]).sort((a, b) => a.x - b.x)
    const mid = board.filter((i) => i.y >= bands[0] && i.y < bands[1]).sort((a, b) => a.x - b.x)
    const bot = board.filter((i) => i.y >= bands[1]).sort((a, b) => a.x - b.x)
    expect([...top, ...mid, ...bot].map((i) => i.label).join('')).toBe('가나다라마바사아자차카타')
  })

  it('uses the twelve syllables, ending at 타', () => {
    // 파 is the thirteenth and 하 the fourteenth. Twelve shapes have no use for
    // either, and a label outside the sequence is a bug rather than a variant:
    // one arrived as 판 because a \u escape was mistyped as U+D310, and these
    // two checks were the only thing that could have caught it.
    const labels = board.map((i) => i.label).join('')
    expect(labels).toBe('가나다라마바사아자차카타')
    for (const wrong of ['파', '하', '판']) {
      expect(labels.includes(wrong)).toBeFalsy()
    }
  })

  it('keeps every shape fully inside the canvas', () => {
    for (const item of board) {
      for (const p of shapePoints(item)) {
        expect(p.x).toBeGreaterThan(0)
        expect(p.x).toBeLessThan(CANVAS)
        expect(p.y).toBeGreaterThan(0)
        expect(p.y).toBeLessThan(760)
      }
    }
  })

  it('spreads shapes apart so nothing hides behind anything else', () => {
    for (let i = 0; i < board.length; i++) {
      for (let j = i + 1; j < board.length; j++) {
        expect(Math.hypot(board[i].x - board[j].x, board[i].y - board[j].y)).toBeGreaterThan(130)
      }
    }
  })
})

// ── the shapes are sound ──────────────────────────────────
describe('every shape is a proper polygon', () => {
  it('no outline crosses itself', () => {
    // The arrow shipped with four vertices that crossed, so it was not a simple
    // polygon. Nothing threw and every test passed, because the tests asked
    // whether two shapes coincide and two equally broken shapes still do.
    const broken = board.filter((i) => !isSimplePolygon(i.shape.vertices))
    expect(broken.length === 0 ? 'ok' : broken.map((i) => i.label).join(', ')).toBe('ok')
  })

  it('every shape has the area its outline implies', () => {
    // The crossed arrow measured 338 where its outline implies 4200, so its
    // overlap, its shading and the percentage on screen were all meaningless.
    const thin = board.filter((i) => polygonArea(i.shape.vertices) < 1000)
    expect(thin.length === 0 ? 'ok' : thin.map((i) => i.label).join(', ')).toBe('ok')
  })

  it('every shape can be triangulated', () => {
    // The shaded region is built from triangles. A shape that yields none has no
    // shading at all, which is exactly what the arrow did.
    const none = board.filter((i) => triangulate(i.shape.vertices).length === 0)
    expect(none.length === 0 ? 'ok' : none.map((i) => i.label).join(', ')).toBe('ok')
  })
})

// ── the five pairs ───────────────────────────────────────
describe('the board offers five pairs', () => {
  it('declares five as the goal', () => {
    expect(TARGET_PAIRS).toBe(5)
  })

  it('contains exactly five congruent pairs as drawn', () => {
    let count = 0
    for (let i = 0; i < board.length; i++) {
      for (let j = i + 1; j < board.length; j++) {
        if (sameOutline(board[i], board[j])) count++
      }
    }
    expect(count).toBe(5)
  })

  it('every pair can be brought into coincidence by the system', () => {
    const problems: string[] = []
    for (let i = 0; i < board.length; i++) {
      for (let j = i + 1; j < board.length; j++) {
        if (!sameOutline(board[i], board[j])) continue
        const s = stack(board[i], board[j])
        if (!isMatch(judge(s.reference, s.held, CANVAS))) {
          problems.push(board[i].label + '+' + board[j].label)
        }
      }
    }
    expect(problems.length === 0 ? 'ok' : problems.join(', ')).toBe('ok')
  })

  it('none of them coincides before the child does anything', () => {
    for (let i = 0; i < board.length; i++) {
      for (let j = i + 1; j < board.length; j++) {
        if (!sameOutline(board[i], board[j])) continue
        expect(measureOverlap(shapePoints(board[i]), shapePoints(board[j])).contained).toBeFalsy()
      }
    }
  })

  it('uses rectangles and mixed triangles, not squares and equilateral ones', () => {
    // squares are too symmetric and an equilateral triangle gives nothing to
    // judge, so both were replaced
    expect(board.some((i) => i.shape.kind === 'rectangle')).toBeTruthy()
    expect(board.filter((i) => i.shape.kind === 'triangle').length).toBe(2)
    const tris = board.filter((i) => i.shape.kind === 'triangle')
    expect(tris.length).toBe(2)
    // three unequal sides, so the child must read the shape
    const v = tris[0].shape.vertices
    const side = (i: number, j: number) => Math.hypot(v[i].x - v[j].x, v[i].y - v[j].y)
    const sides = [side(0, 1), side(1, 2), side(2, 0)].sort((a, b) => a - b)
    // the shortest and longest differ clearly
    expect(sides[2] - sides[0]).toBeGreaterThan(25)
    // and so do the middle one
    expect(sides[1] - sides[0]).toBeGreaterThan(8)
  })
})

// ── distractors ──────────────────────────────────────────
describe('distractors are rejected', () => {
  it('the small rectangle is not congruent to the wide one', () => {
    expect(sameOutline(at('rect-wide'), at('rect-small'))).toBeFalsy()
  })

  it('stacking the small rectangle over the wide one still fails', () => {
    // Both checks are required. Overlap alone would accept it, because the
    // small rectangle sits wholly inside the wide one; congruence alone
    // rejects it. Requiring both is what keeps the answer honest.
    const wide = at('rect-wide')
    const s = stack(wide, at('rect-small'))

    // The small rectangle sits wholly inside the wide one, which is why
    // overlap alone cannot be trusted: it reports one-sided coverage.
    expect(measureOverlap(s.reference, s.held).oneInsideOther).toBeTruthy()
    expect(measureOverlap(s.reference, s.held).contained).toBeFalsy()

    // The system still names the reason, instead of shrugging.
    const r = judge(s.reference, s.held, CANVAS)
    expect(r.verdict).toBe('same-shape-different-size')
    expect(isMatch(r)).toBeFalsy()
  })

  it('the pentagon matches nothing', () => {
    const pentagon = board.find((i) => i.shape.kind === 'pentagon')!
    for (const other of board) {
      if (other.id === pentagon.id) continue
      expect(sameOutline(pentagon, other)).toBeFalsy()
    }
  })

  it('neither distractor is so close to a pair member that it looks like a pair', () => {
    // A distractor has to be wrong in a way the child can reason about: no
    // turn or mirror may turn it into a match against any pair member.
    for (const distractorId of ['rect-small']) {
      const distractor = at(distractorId)
      for (const other of board) {
        if (other.id === distractor.id) continue
        const s = stack(other, distractor)
        expect(isMatch(judge(s.reference, s.held, CANVAS))).toBeFalsy()
      }
    }
  })
})

// ── the child chooses nothing ────────────────────────────
describe('the child is not asked to choose an angle', () => {
  function source(path: string): string {
    return readFileSync(join(process.cwd(), path), 'utf8')
  }

  it('the screen has no rotate or flip control', () => {
    const stage = source('src/modes/CongruenceStage.tsx')
    expect(stage.includes('onRotate')).toBeFalsy()
    expect(stage.includes('onFlip')).toBeFalsy()
    expect(stage.includes('90')).toBeFalsy()
    expect(stage.includes('45')).toBeFalsy()
  })

  it('the hook offers only applyTurn, which the system uses', () => {
    const hook = source('src/modes/useBoard.ts')
    expect(hook.includes('applyTurn')).toBeTruthy()
    expect(hook.includes('rotateBy')).toBeFalsy()
  })

  it('the turn search pivots on the polygon centroid', () => {
    // Rotating about the vertex mean leaves an arrow askew after a half turn,
    // which made real pairs report as a size mismatch.
    const verdict = source('src/geometry/verdict.ts')
    expect(verdict.includes('polygonCentroid')).toBeTruthy()
  })

  it('the turn search seats the rotated shape on the target', () => {
    const verdict = source('src/geometry/verdict.ts')
    expect(verdict.includes('seat(')).toBeTruthy()
  })
})

const { report } = await import('../harness/spec.mjs')
report()