/**
 * Stacking spec — nothing turns until the shapes actually meet.
 *
 * This is the regression file for the bug where letting go of a shape turned
 * it in mid-air. The partner was chosen by outline alone, which ignores where
 * anything is, so picking up 가 and dropping it two pixels away rotated it
 * 900px from 사. Matching outlines are not a reason to move anything.
 *
 * The whole loop is checked here as pure geometry, with no React:
 *
 *     sloppy drop  ->  judge  ->  a turn  ->  turnedItem  ->  the pair matches
 */

import { describe, it, expect } from '../harness/api'
import { buildBoard, shapePoints } from '../../src/modes/useBoard'
import { findMatches } from '../../src/geometry/pairs'
import { isMatch, judge, MIN_STACK, stackShare, turnedItem } from '../../src/geometry/verdict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { BoardShape } from '../../src/modes/useBoard'

const board = buildBoard()
const CANVAS = 1100

const PAIR_IDS: Array<[string, string]> = [
  ['rect-wide', 'rect-tall'],
  ['trap-lying', 'trap-side'],
  ['tri-scalene', 'tri-scalene-2'],
  ['arrow-right', 'arrow-up'],
  ['fish-right', 'fish-left'],
]

const at = (shapeId: string) => board.find((i) => i.shape.id === shapeId)!

/** The held shape dropped at an offset from its partner, as a hand would. */
function droppedOnto(onto: BoardShape, item: BoardShape, dx = 0, dy = 0): BoardShape {
  return { ...item, x: onto.x + dx, y: onto.y + dy }
}

// ── the gate ──────────────────────────────────────────────
describe('a stack has to happen before anything turns', () => {
  it('reports nothing for congruent shapes on opposite sides of the board', () => {
    // The reported bug, exactly: these two match, and they are 900px apart.
    const a = at('rect-wide')
    const b = at('rect-tall')
    const r = judge(shapePoints(a), shapePoints(b), CANVAS)

    expect(r.verdict).toBe('apart')
    expect(r.solution).toBe(null)
    expect(isMatch(r)).toBeFalsy()
  })

  it('reports nothing for a shape that only brushed past on its way', () => {
    for (const [aId, bId] of PAIR_IDS) {
      const a = at(aId)
      const held = droppedOnto(a, at(bId), 60, 0)
      const share = stackShare(shapePoints(a), shapePoints(held))
      if (share >= MIN_STACK) continue // a big shape at 60px is a real stack
      const r = judge(shapePoints(a), shapePoints(held), CANVAS)
      expect(r.solution).toBe(null)
    }
  })

  it('judges no pair on the board as a match where it starts', () => {
    // The invariant the bug broke, stated over the whole board rather than
    // one shape: nothing is stacked, so nothing turns and nothing is claimed.
    const problems: string[] = []
    for (let i = 0; i < board.length; i++) {
      for (let j = i + 1; j < board.length; j++) {
        const r = judge(shapePoints(board[i]), shapePoints(board[j]), CANVAS)
        if (r.solution) problems.push(board[i].label + '+' + board[j].label)
        if (isMatch(r)) problems.push('MATCH ' + board[i].label + '+' + board[j].label)
      }
    }
    expect(problems.length === 0 ? 'ok' : problems.join(', ')).toBe('ok')
  })

  it('is forgiving about a sloppy drop', () => {
    // 30px off is what a hurried hand leaves behind, and it must still work.
    for (const [aId, bId] of PAIR_IDS) {
      const a = at(aId)
      const held = droppedOnto(a, at(bId), 30, 25)
      const r = judge(shapePoints(a), shapePoints(held), CANVAS)
      expect(isMatch(r) ? 'ok' : `${aId}+${bId} rejected a 30px drop`).toBe('ok')
    }
  })

  it('never asks for a turn that does not coincide', () => {
    for (const [aId, bId] of PAIR_IDS) {
      const a = at(aId)
      const held = droppedOnto(a, at(bId), 30, 25)
      const r = judge(shapePoints(a), shapePoints(held), CANVAS)
      expect(r.solution ? 'ok' : `${aId}+${bId} found no turn`).toBe('ok')
    }
  })
})

// ── the whole loop ────────────────────────────────────────
describe('a turn ends in a real coincidence, not just a claim', () => {
  it('lands the shape on its partner for every pair', () => {
    // Without the re-centring, the shape turns where the child's hand stopped,
    // still misses, and the pair never registers. This is the check that
    // would have caught it.
    const problems: string[] = []
    for (const [aId, bId] of PAIR_IDS) {
      const a = at(aId)
      const held = droppedOnto(a, at(bId), 30, 25)
      const r = judge(shapePoints(a), shapePoints(held), CANVAS)
      if (!r.solution) {
        problems.push(aId + '+' + bId + '=no turn')
        continue
      }
      const landed = turnedItem(held, r.solution)
      if (findMatches([a, landed], CANVAS).length !== 1) {
        problems.push(aId + '+' + bId + '=did not land')
      }
    }
    expect(problems.length === 0 ? 'ok' : problems.join(', ')).toBe('ok')
  })

  it('lands the shape on its partner even when dropped dead centre', () => {
    for (const [aId, bId] of PAIR_IDS) {
      const a = at(aId)
      const held = droppedOnto(a, at(bId))
      const r = judge(shapePoints(a), shapePoints(held), CANVAS)
      if (r.solution) {
        const landed = turnedItem(held, r.solution)
        expect(findMatches([a, landed], CANVAS).length).toBe(1)
      }
    }
  })

  it('needs no second turn once it has landed', () => {
    // After the snap the shapes already coincide, so the verdict is
    // match-direct with no solution. Were that not so, the effect that applies
    // the turn would fire again and again and walk the shape across the board.
    for (const [aId, bId] of PAIR_IDS) {
      const a = at(aId)
      const held = droppedOnto(a, at(bId), 30, 25)
      const first = judge(shapePoints(a), shapePoints(held), CANVAS)
      expect(first.solution ? 'ok' : `${aId}+${bId} found no turn`).toBe('ok')
      if (!first.solution) continue

      const landed = turnedItem(held, first.solution)
      const second = judge(shapePoints(a), shapePoints(landed), CANVAS)
      expect(second.verdict).toBe('match-direct')
      expect(second.solution).toBe(null)
      expect(second.coincident).toBeTruthy()
    }
  })

  it('a distractor stacked on a pair member never registers', () => {
    // Same outline, smaller. It sits inside the larger one, so overlap alone
    // would call it a stack; both the size check and the pairing check have
    // to refuse it.
    const wide = at('rect-wide')
    const small = droppedOnto(wide, at('rect-small'))
    const r = judge(shapePoints(wide), shapePoints(small), CANVAS)
    expect(r.verdict).toBe('same-shape-different-size')
    expect(r.solution).toBe(null)
    expect(findMatches([wide, small], CANVAS).length).toBe(0)
  })
})

// ── the hook must not work around the gate ───────────────
describe('the board hook does not bypass the gate', () => {
  function source(path: string): string {
    return readFileSync(join(process.cwd(), path), 'utf8')
  }

  it('never judges a shape against itself', () => {
    // With no partner to hand, the hook used to fall back to judging the held
    // shape against its own points. A shape fully contains itself, so that
    // reported match-direct and announced a match with nothing on the board.
    const hook = source('src/modes/useBoard.ts')
    expect(/judge\(\s*heldPoints\s*,\s*heldPoints/.test(hook)).toBeFalsy()
  })

  it('picks a partner by overlap, not by outline', () => {
    const hook = source('src/modes/useBoard.ts')
    expect(hook.includes('stackShare')).toBeTruthy()
    // sameCongruence ignores position, which is the whole of the bug
    expect(hook.includes('sameCongruence')).toBeFalsy()
  })

  it('falls back to the neutral verdict when nothing was touched', () => {
    const hook = source('src/modes/useBoard.ts')
    expect(hook.includes('APART()')).toBeTruthy()
  })

  it('delegates the turn to geometry so it can be tested', () => {
    const hook = source('src/modes/useBoard.ts')
    expect(hook.includes('turnedItem')).toBeTruthy()
  })

  it('the overlay picks the touched shape too', () => {
    // The shaded overlap region is drawn against this partner, so choosing by
    // outline would shade a region that is not there.
    const parts = source('src/components/BoardParts.tsx')
    expect(parts.includes('stackShare')).toBeTruthy()
    expect(parts.includes('sameCongruence')).toBeFalsy()
  })
})

const { report } = await import('../harness/spec.mjs')
report()
