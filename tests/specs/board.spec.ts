/**
 * Board spec — the single-screen congruence act.
 *
 * The child drags a shape onto another and rotates or flips until they
 * coincide. This proves the board is solvable and, more importantly, that
 * the distractors cannot be forced into a match.
 */

import { describe, it, expect } from '../harness/api'
import { buildBoard, shapePoints, transformOf, TARGET_PAIRS } from '../../src/modes/useBoard'
import { checkCongruence, EPSILON_STACK } from '../../src/geometry/compare'
import { measureOverlap } from '../../src/geometry/overlap'
import type { BoardShape } from '../../src/modes/useBoard'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const board = buildBoard()

const at = (item: BoardShape, patch: Partial<BoardShape>): BoardShape => ({ ...item, ...patch })

const pts = (item: BoardShape) => shapePoints(item)

/** What the screen requires: congruent in outline AND fully covering. */
function isMatch(a: BoardShape, b: BoardShape): boolean {
  const pa = pts(a)
  const pb = pts(b)
  return checkCongruence(pa, pb, EPSILON_STACK, 1000, false).isCongruent && measureOverlap(pa, pb).contained
}

/** Congruence alone, ignoring whether they are stacked on each other. */
function sameOutline(a: BoardShape, b: BoardShape): boolean {
  return checkCongruence(pts(a), pts(b), EPSILON_STACK, 1000, false).isCongruent
}

// ── layout ───────────────────────────────────────────────
describe('the board is laid out', () => {
  it('lays out eight shapes', () => {
    expect(board.length).toBe(8)
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

  it('keeps every shape fully inside the canvas', () => {
    // a shape clipped by the edge cannot be judged by eye
    for (const item of board) {
      for (const p of pts(item)) {
        expect(p.x).toBeGreaterThan(0)
        expect(p.x).toBeLessThan(1000)
        expect(p.y).toBeGreaterThan(0)
        expect(p.y).toBeLessThan(680)
      }
    }
  })

  it('spreads shapes apart so nothing hides behind anything else', () => {
    for (let i = 0; i < board.length; i++) {
      for (let j = i + 1; j < board.length; j++) {
        expect(Math.hypot(board[i].x - board[j].x, board[i].y - board[j].y)).toBeGreaterThan(120)
      }
    }
  })
})

// ── the three pairs ──────────────────────────────────────
describe('the board offers exactly three pairs', () => {
  it('declares three as the goal', () => {
    expect(TARGET_PAIRS).toBe(3)
  })

  it('contains exactly three congruent pairs as drawn', () => {
    const matches: Array<[string, string]> = []
    for (let i = 0; i < board.length; i++) {
      for (let j = i + 1; j < board.length; j++) {
        if (sameOutline(board[i], board[j])) matches.push([board[i].label, board[j].label])
      }
    }
    expect(matches.length).toBe(3)
  })

  it('the square pair already matches as drawn', () => {
    const squares = board.filter((i) => i.shape.id === 'square')
    expect(squares.length).toBe(2)
    expect(sameOutline(squares[0], squares[1])).toBeTruthy()
  })

  it('the triangle pair already matches as drawn', () => {
    const tris = board.filter((i) => i.shape.vertices.length === 3)
    expect(tris.length).toBe(2)
    expect(sameOutline(tris[0], tris[1])).toBeTruthy()
  })

  it('the trapezoid pair is not solved as drawn', () => {
    const traps = board.filter((i) => i.shape.kind === 'custom')
    expect(traps.length).toBe(2)
    const [flat, tipped] = traps

    // Both are congruent in outline; that part is never the challenge.
    expect(sameOutline(flat, tipped)).toBeTruthy()
    // But they do not coincide as placed, so there is real work to do.
    const stacked = at(tipped, { x: flat.x, y: flat.y })
    expect(measureOverlap(pts(flat), pts(stacked)).contained).toBeFalsy()
  })

  it('a quarter turn is what makes the trapezoid pair coincide', () => {
    const traps = board.filter((i) => i.shape.kind === 'custom')
    const [flat, tipped] = traps

    const turned = at(flat, { x: tipped.x, y: tipped.y, rotation: 90 })
    expect(isMatch(tipped, turned)).toBeTruthy()

    // 180 degrees is not enough: the parallel sides still disagree
    const half = at(flat, { x: tipped.x, y: tipped.y, rotation: 180 })
    expect(measureOverlap(pts(tipped), pts(half)).contained).toBeFalsy()
  })

  it('the trapezoid pair is worth finding because it needs the turn', () => {
    const traps = board.filter((i) => i.shape.kind === 'custom')
    const [lying, tipped] = traps

    // `tipped` sits on the board already turned 90 degrees. Stacking the
    // lying one on top without turning it does not match; turning it does.
    const untouched = at(lying, { x: tipped.x, y: tipped.y })
    expect(isMatch(tipped, untouched)).toBeFalsy()

    const turned = at(lying, { x: tipped.x, y: tipped.y, rotation: 90 })
    expect(isMatch(tipped, turned)).toBeTruthy()
  })
})

// ── distractors ──────────────────────────────────────────
describe('distractors are rejected', () => {
  it('the large square is not congruent to the small one', () => {
    const small = board.find((i) => i.shape.id === 'square')!
    const large = board.find((i) => i.label === '\uB9C8')!
    expect(sameOutline(small, large)).toBeFalsy()
  })

  it('stacking the large square over the small one still fails', () => {
    // This is the case that makes both checks necessary.
    // Overlap alone says "contained", because the small square is fully
    // covered. Congruence alone says "no", because the sizes differ.
    // Requiring both is what rejects it.
    const small = board.find((i) => i.shape.id === 'square')!
    const large = board.find((i) => i.label === '\uB9C8')!
    const placed = at(large, { x: small.x, y: small.y })

    expect(measureOverlap(pts(small), pts(placed)).contained).toBeTruthy()
    expect(checkCongruence(pts(small), pts(placed), EPSILON_STACK, 1000, false).isCongruent).toBeFalsy()
    expect(isMatch(small, placed)).toBeFalsy()
  })

  it('the pentagon matches nothing', () => {
    const pentagon = board.find((i) => i.shape.kind === 'pentagon')!
    for (const other of board) {
      if (other.id === pentagon.id) continue
      expect(sameOutline(pentagon, other)).toBeFalsy()
    }
  })
})

// ── every pair is reachable ──────────────────────────────
describe('each pair can be brought into coincidence', () => {
  it('all three pairs pass the full match test when placed', () => {
    const pairs: Array<[BoardShape, BoardShape, Partial<BoardShape>]> = [
      // squares, as drawn
      [board.find((i) => i.shape.id === 'square')!, board.find((i) => i.label === '\uC0AC')!, {}],
      // triangles, as drawn
      [
        board.find((i) => i.label === '\uB098')!,
        board.find((i) => i.label === '\uB77C')!,
        {},
      ],
      // trapezoids, after a quarter turn of the lying one
      [
        board.find((i) => i.label === '\uBC14')!,
        board.find((i) => i.label === '\uB2E4')!,
        { rotation: 90 },
      ],
    ]

    for (const [a, b, patch] of pairs) {
      const placed = at(b, { x: a.x, y: a.y, ...patch })
      expect(isMatch(a, placed)).toBeTruthy()
    }
  })

  it('a square turned 45 degrees does not count', () => {
    // a square is symmetric every 90 degrees, not every 45
    const [a, b] = [board.find((i) => i.shape.id === 'square')!, board.find((i) => i.label === '\uC0AC')!]
    const placed = at(b, { x: a.x, y: a.y, rotation: 45 })
    expect(isMatch(a, placed)).toBeFalsy()
  })

  it('flipping a triangle does not break the match', () => {
    const a = board.find((i) => i.label === '\uB098')!
    const b = board.find((i) => i.label === '\uB77C')!
    const placed = at(b, { x: a.x, y: a.y, flipped: true })
    expect(sameOutline(a, placed)).toBeTruthy()
  })
})

// ── screen structure ─────────────────────────────────────
describe('the screen is one act, not two', () => {
  function source(path: string): string {
    return readFileSync(join(process.cwd(), path), 'utf8')
  }

  it('no shape picker stands between the child and the board', () => {
    expect(source('src/App.tsx').includes('ShapePicker')).toBeFalsy()
  })

  it('every shape takes a pointer down', () => {
    expect(source('src/modes/CongruenceStage.tsx').includes('onPointerDown')).toBeTruthy()
  })

  it('rotate and flip act on the held shape', () => {
    const stage = source('src/modes/CongruenceStage.tsx')
    expect(stage.includes('board.rotateBy(held.id')).toBeTruthy()
    expect(stage.includes('board.flip(held.id')).toBeTruthy()
  })

  it('the tools stay inert until a shape is held', () => {
    expect(source('src/modes/CongruenceStage.tsx').includes('disabled={!held}')).toBeTruthy()
  })

  it('a pair is recorded only when both conditions hold', () => {
    const pairs = source('src/geometry/pairs.ts')
    expect(pairs.includes('sameCongruence')).toBeTruthy()
    expect(pairs.includes('fullyCovered')).toBeTruthy()
  })

  it('derived state is updated in an effect, not during render', () => {
    expect(source('src/modes/useBoard.ts').includes('useEffect')).toBeTruthy()
  })

  it('the transform carries rotation and flip', () => {
    const t = transformOf(board[0])
    expect(typeof t.rotation).toBe('number')
    expect(typeof t.flipped).toBe('boolean')
  })
})

const { report } = await import('../harness/spec.mjs')
report()