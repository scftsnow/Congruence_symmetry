/**
 * Verdict spec — the system judges the stack, not the child.
 *
 * The child only moves shapes. Every quarter turn, with and without a mirror,
 * is tried here and the result must be the one the screen reports.
 */

import { describe, it, expect } from '../harness/api'
import { judge, isMatch } from '../../src/geometry/verdict'
import { buildBoard, shapePoints } from '../../src/modes/useBoard'
import { sameCongruence } from '../../src/geometry/pairs'
import { polygonArea } from '../../src/geometry/overlap'
import { applyTransform } from '../../src/geometry/transforms'
import type { BoardShape } from '../../src/modes/useBoard'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const board = buildBoard()
const CANVAS = 1100

/** Place `item` on top of `onto`, optionally after a turn and a mirror. */
function stack(onto: BoardShape, item: BoardShape, degrees = 0, flip = false): {
  reference: ReturnType<typeof shapePoints>
  held: ReturnType<typeof shapePoints>
} {
  const reference = shapePoints(onto)
  const held = applyTransform(item.shape.vertices, {
    cx: onto.x,
    cy: onto.y,
    rotation: item.rotation + degrees,
    flipped: item.flipped !== flip,
    scale: 1,
  })
  return { reference, held }
}

const byId = (id: string) => board.find((i) => i.shape.id === id)!

// ── the direct case ──────────────────────────────────────
describe('shapes already stacked need no turn', () => {
  it('reports match-direct when they coincide as they lie', () => {
    const a = byId('rect-wide')
    const b = board.find((i) => i.shape.id === 'rect-tall')!
    // bring the tall one onto the wide one with the turn already applied
    const reference = shapePoints(a)
    const held = applyTransform(b.shape.vertices, {
      cx: a.x,
      cy: a.y,
      rotation: 90,
      flipped: false,
      scale: 1,
    })
    const r = judge(reference, held, CANVAS)
    expect(r.verdict).toBe('match-direct')
    expect(r.coincident).toBeTruthy()
    expect(isMatch(r)).toBeTruthy()
  })
})

// ── the turn is found automatically ──────────────────────
describe('the system finds the turn itself', () => {
  it('suggests a quarter turn for wide and tall rectangles', () => {
    const wide = byId('rect-wide')
    const tall = board.find((i) => i.shape.id === 'rect-tall')!
    const { reference, held } = stack(wide, tall)
    const r = judge(reference, held, CANVAS)

    expect(isMatch(r)).toBeTruthy()
    expect(r.verdict).toBe('match-by-turn')
    expect(r.solution).toBeTruthy()
    expect([90, 180, 270]).toContain(r.solution!.degrees)
    expect(r.solution!.flipped).toBeFalsy()
  })

  it('suggests a turn for the trapezoid pair', () => {
    const lying = byId('trap-lying')
    const side = board.find((i) => i.shape.id === 'trap-side')!
    const s = stack(lying, side)
    const r = judge(s.reference, s.held, CANVAS)
    expect(isMatch(r)).toBeTruthy()
  })

  it('suggests a turn for the arrow pair', () => {
    const right = byId('arrow-right')
    const up = board.find((i) => i.shape.id === 'arrow-up')!
    const { reference, held } = stack(right, up)
    const r = judge(reference, held, CANVAS)
    expect(isMatch(r)).toBeTruthy()
  })

  it('recognises the mirrored triangle pair', () => {
    // The triangle is scalene, so the mirror is genuinely part of the answer.
    const a = byId('tri-scalene')
    const mirrored = board.find((i) => i.shape.id === 'tri-scalene-2')!
    const s = stack(a, mirrored)
    const r = judge(s.reference, s.held, CANVAS)
    expect(isMatch(r)).toBeTruthy()
    expect(r.solution).toBeTruthy()
  })

  it('recognises the mirrored fish pair', () => {
    const a = byId('fish-right')
    const mirrored = board.find((i) => i.shape.id === 'fish-left')!
    const s = stack(a, mirrored)
    const r = judge(s.reference, s.held, CANVAS)
    expect(isMatch(r)).toBeTruthy()
  })

  it('resolves every genuine pair and rejects everything else', () => {
    // Twelve shapes give sixty-six combinations and all must be decidable.
    // A congruent pair must come back as a match with a turn; anything else
    // must come back as a rejection. Neither half may slip through.
    const unresolved: string[] = []
    const falseMatch: string[] = []

    for (let i = 0; i < board.length; i++) {
      for (let j = i + 1; j < board.length; j++) {
        const a = board[i]
        const b = board[j]
        const s = stack(a, b)
        const r = judge(s.reference, s.held, CANVAS)

        const sameSize = Math.abs(polygonArea(shapePoints(a)) - polygonArea(shapePoints(b))) <= 1
        const sameLook = sameCongruence(shapePoints(a), shapePoints(b), CANVAS)

        if (sameLook && sameSize && !isMatch(r)) {
          unresolved.push(a.label + '+' + b.label + '=' + r.verdict)
        }
        if (!sameLook && isMatch(r)) {
          falseMatch.push(a.label + '+' + b.label)
        }
      }
    }

    const problem = unresolved.concat(falseMatch)
    expect(problem.length === 0 ? 'ok' : problem.join(', ')).toBe('ok')
  })
})

// ── failures are named, not solved ───────────────────────
describe('failures name the problem', () => {
  it('reports different-shape for unrelated outlines', () => {
    const rect = byId('rect-wide')
    const pentagon = board.find((i) => i.shape.kind === 'pentagon')!
    const { reference, held } = stack(rect, pentagon)
    const r = judge(reference, held, CANVAS)
    expect(r.verdict).toBe('different-shape')
    expect(r.solution).toBe(null)
    expect(isMatch(r)).toBeFalsy()
  })

  it('reports same-shape-different-size for the small rectangle', () => {
    const wide = byId('rect-wide')
    const small = board.find((i) => i.shape.id === 'rect-small')!
    const { reference, held } = stack(wide, small)
    const r = judge(reference, held, CANVAS)
    expect(r.verdict).toBe('same-shape-different-size')
    expect(r.solution).toBe(null)
  })

  it('reports apart when the shapes are far from each other', () => {
    const a = byId('rect-wide')
    const b = board.find((i) => i.shape.id === 'rect-tall')!
    const r = judge(shapePoints(a), shapePoints(b), CANVAS)
    // they are congruent but nowhere near each other
    expect(r.coverage).toBeLessThan(0.1)
    expect(r.coincident).toBeFalsy()
  })
})

// ── the child has no controls for angle ──────────────────
describe('the child never chooses the angle', () => {
  function source(path: string): string {
    return readFileSync(join(process.cwd(), path), 'utf8')
  }

  it('the board screen exposes no rotate or flip buttons', () => {
    const stage = source('src/modes/CongruenceStage.tsx')
    expect(stage.includes('onRotate')).toBeFalsy()
    expect(stage.includes('onFlip')).toBeFalsy()
    expect(stage.includes('90')).toBeFalsy()
  })

  it('the board hook exposes no rotate or flip actions', () => {
    const hook = source('src/modes/useBoard.ts')
    expect(hook.includes('rotateBy')).toBeFalsy()
    expect(hook.includes('const flip')).toBeFalsy()
  })

  it('the verdict lives in the geometry layer', () => {
    const verdict = source('src/geometry/verdict.ts')
    expect(verdict.includes('judge')).toBeTruthy()
    // the search must cover mirror and non-mirror, not just rotation
    expect(verdict.includes('mirror')).toBeTruthy()
  })
})

const { report } = await import('../harness/spec.mjs')
report()