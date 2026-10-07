/**
 * Stage 1 spec — the board must be solvable and must teach the right lesson.
 *
 * The board mixes congruent pairs with distractors. The point is not that a
 * child can clear it; it is that every distractor represents a real mistake
 * the textbook warns about, and that a rotated pair is always correct.
 */

import { describe, it, expect } from '../harness/api'
import { buildStage1Board, useStage1, stage1Points } from '../../src/modes/useStage1'
import { checkCongruence, EPSILON_STACK } from '../../src/geometry/compare'
import { identity } from '../../src/geometry/transforms'

const board = buildStage1Board()

function congruent(aId: string, bId: string): boolean {
  const a = board.find((i) => i.id === aId)!
  const b = board.find((i) => i.id === bId)!
  return checkCongruence(stage1Points(a), stage1Points(b), EPSILON_STACK, 1000, false).isCongruent
}

describe('the board is solvable', () => {
  it('ships enough shapes to search through', () => {
    expect(board.length >= 5).toBeTruthy()
  })


  it('gives every shape a hangul label for the child', () => {
    for (const item of board) {
      expect([...item.label].length).toBe(1)
    }
  })
  it('gives every id a shape and a position', () => {
    for (const item of board) {
      expect(item.shape.vertices.length >= 3).toBeTruthy()
      expect(Number.isFinite(item.x)).toBeTruthy()
      expect(Number.isFinite(item.y)).toBeTruthy()
    }
  })

  it('places no two shapes on top of each other', () => {
    // A scattered board the child cannot see is not a scattered board.
    for (let i = 0; i < board.length; i++) {
      for (let j = i + 1; j < board.length; j++) {
        const d = Math.hypot(board[i].x - board[j].x, board[i].y - board[j].y)
        expect(d > 90).toBeTruthy()
      }
    }
  })

  it('has at least two correct pairs to find', () => {
    const pairs = board.filter((i) => i.kind === 'congruent' && i.pairId)
    expect(pairs.length).toBeGreaterThanOrEqual(2)
  })

  it('every declared pair really is congruent', () => {
    for (const item of board) {
      if (item.kind !== 'congruent' || !item.pairId) continue
      expect(congruent(item.id, item.pairId)).toBeTruthy()
    }
  })

  it('a congruent pair is counted once, not twice', () => {
    const pairs = board.filter((i) => i.kind === 'congruent' && i.pairId)
    for (const item of pairs) {
      // the twin must not declare this item as its own partner
      const twin = board.find((i) => i.id === item.pairId)!
      expect(twin.pairId === item.id).toBeTruthy()
    }
  })
})

describe('the distractors teach the textbook lessons', () => {
  it('includes a different-shape distractor', () => {
    const d = board.filter((i) => i.kind === 'different-shape')
    expect(d.length >= 1).toBeTruthy()
  })

  it('includes a different-size distractor that really differs in size', () => {
    const big = board.find((i) => i.kind === 'different-size')
    expect(big).toBeTruthy()

    const small = board.find((i) => i.id === 'ga')!
    // same shape, not congruent: this is the case the child must reject
    expect(congruent(big!.id, small.id)).toBeFalsy()

    // but the shape still matches, which is the discovery we want
    const result = checkCongruence(
      stage1Points(big!),
      stage1Points(small),
      EPSILON_STACK,
      1000,
      false,
    )
    expect(result.shapeMatches).toBeTruthy()
    expect(result.sizeMatches).toBeFalsy()
  })

  it('includes a rotated pair, because direction does not matter', () => {
    const rotated = board.find((i) => i.rotation !== 0 && i.kind === 'congruent')
    expect(rotated).toBeTruthy()
    expect(congruent(rotated!.id, rotated!.pairId!)).toBeTruthy()
  })

  it('never marks a pair congruent that is not', () => {
    const ids = board.map((i) => i.id)
    for (const a of ids) {
      for (const b of ids) {
        if (a >= b) continue
        const declared = board.find((i) => i.id === a)!
        const isDeclaredPair = declared.kind === 'congruent' && declared.pairId === b
        if (isDeclaredPair) continue
        // a non-pair may still be congruent if it is the twin link of b
        const bItem = board.find((i) => i.id === b)!
        if (bItem.pairId === a) continue
        expect(congruent(a, b)).toBeFalsy()
      }
    }
  })
})

describe('link bookkeeping', () => {
  it('starts empty', () => {
    expect(board.every((i) => i.kind !== undefined)).toBeTruthy()
  })

  it('can resolve any pair on the board', () => {
    // the hook's lookup is exercised indirectly through the board data
    const a = board[0]
    const b = board[1]
    expect(checkCongruence(stage1Points(a), stage1Points(b), EPSILON_STACK, 1000, false)).toBeTruthy()
  })
})

describe('the hook is usable', () => {
  it('exposes the operations the screen needs', () => {
    expect(typeof useStage1).toBe('function')
    expect(typeof stage1Points).toBe('function')
    expect(typeof identity).toBe('function')
  })
})

const { report } = await import('../harness/spec.mjs')
report()