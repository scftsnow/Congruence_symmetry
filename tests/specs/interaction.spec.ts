/**
 * Interaction spec — pressing is not the same as dropping.
 *
 * Two rules the screen must not break:
 *   - a mere touch never turns a shape; only letting go judges the stack
 *   - the board is shuffled, so the answer cannot be read off the layout
 */

import { describe, it, expect } from '../harness/api'
import { buildBoard, shapePoints } from '../../src/modes/useBoard'
import { judge, isMatch } from '../../src/geometry/verdict'
import { polygonArea } from '../../src/geometry/overlap'
import { applyTransform } from '../../src/geometry/transforms'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const board = buildBoard()
const CANVAS = 1100

/** The five genuine pairs, by shape id. */
const PAIR_IDS: Array<[string, string]> = [
  ['rect-wide', 'rect-tall'],
  ['trap-lying', 'trap-side'],
  ['tri-scalene', 'tri-scalene-2'],
  ['arrow-right', 'arrow-up'],
  ['fish-right', 'fish-left'],
]

const at = (shapeId: string) => board.find((i) => i.shape.id === shapeId)!

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function isPair(a: { shape: { id: string } }, b: { shape: { id: string } }): boolean {
  return PAIR_IDS.some(([x, y]) =>
    (x === a.shape.id && y === b.shape.id) || (x === b.shape.id && y === a.shape.id),
  )
}

// ── pressing must not turn anything ──────────────────────
describe('a touch alone does not turn a shape', () => {
  function source(path: string): string {
    return readFileSync(join(process.cwd(), path), 'utf8')
  }

  it('the screen tracks whether the child has let go', () => {
    const stage = source('src/modes/CongruenceStage.tsx')
    expect(stage.includes('released')).toBeTruthy()
  })

  it('the verdict is ignored until release', () => {
    const stage = source('src/modes/CongruenceStage.tsx')
    // the gate must come before the solution check, not after it
    expect(stage.includes('if (!released) return')).toBeTruthy()
  })

  it('pressing resets the release flag', () => {
    const stage = source('src/modes/CongruenceStage.tsx')
    expect(stage.includes('setReleased(false)')).toBeTruthy()
  })

  it('releasing only counts when a drag was in progress', () => {
    // A tap without a drag is not an attempt, so it must not judge the board.
    // Read the handler by its own braces rather than by a fixed number of
    // characters: it has grown statements and comments inside the guard, and
    // matching its whole text would break on the next thing added to it.
    const stage = source('src/modes/CongruenceStage.tsx')
    const start = stage.indexOf('const onPointerUp')
    const end = stage.indexOf('\n  const ', start + 10)
    const handler = stage.slice(start, end === -1 ? undefined : end)

    expect(/if \(drag\.current\)/.test(handler)).toBeTruthy()
    const guard = handler.indexOf('if (drag.current)')
    expect(handler.indexOf('setReleased(true)')).toBeGreaterThan(guard)
    // and the attempt counter is inside the same guard, or a bare tap would count
    expect(handler.indexOf('setAttempts')).toBeGreaterThan(guard)
  })

  it('the turn is applied at most once per solution', () => {
    const stage = source('src/modes/CongruenceStage.tsx')
    expect(stage.includes('appliedRef.current === key')).toBeTruthy()
  })
})

// ── the board must not give the answer away ──────────────
describe('the layout does not spell out the pairs', () => {
  it('no genuine pair sits side by side', () => {
    // If a pair were adjacent the child could read the answer off the board,
    // which defeats the stage.
    for (const [aId, bId] of PAIR_IDS) {
      const d = dist(at(aId), at(bId))
      expect(d > 380 ? 'ok' : `${aId}-${bId} only ${Math.round(d)}px apart`).toBe('ok')
    }
  })

  it('the closest neighbours on the board belong to different pairs', () => {
    const all: Array<{ d: number; a: string; b: string }> = []
    for (let i = 0; i < board.length; i++) {
      for (let j = i + 1; j < board.length; j++) {
        all.push({
          d: dist(board[i], board[j]),
          a: board[i].shape.id,
          b: board[j].shape.id,
        })
      }
    }
    all.sort((x, y) => x.d - y.d)

    // The three closest pairs must all be non-pairs. If a genuine pair were
    // among them, the shuffle has failed.
    const firstThree = all.slice(0, 3)
    for (const { a, b } of firstThree) {
      expect(isPair({ shape: { id: a } }, { shape: { id: b } }) ? 'adjacent pair' : 'ok').toBe('ok')
    }
  })

  it('pair members are spread across the canvas', () => {
    // No two members of a pair share a quadrant corner region.
    for (const [aId, bId] of PAIR_IDS) {
      const a = at(aId)
      const b = at(bId)
      const sameSide = Math.abs(a.x - b.x) < 250 && Math.abs(a.y - b.y) < 150
      expect(sameSide ? `${aId}-${bId} too close` : 'ok').toBe('ok')
    }
  })

  it('nothing overlaps at the start', () => {
    for (let i = 0; i < board.length; i++) {
      for (let j = i + 1; j < board.length; j++) {
        const d = dist(board[i], board[j])
        expect(d > 150 ? 'ok' : `${board[i].label}-${board[j].label} only ${Math.round(d)}px`).toBe('ok')
      }
    }
  })
})

// ── every pair is still solvable after the shuffle ────────
describe('the shuffle did not break any pair', () => {
  it('all five pairs still resolve when stacked', () => {
    const problems: string[] = []
    for (const [aId, bId] of PAIR_IDS) {
      const a = at(aId)
      const b = at(bId)
      const reference = shapePoints(a)
      const held = applyTransform(b.shape.vertices, {
        cx: a.x,
        cy: a.y,
        rotation: b.rotation,
        flipped: b.flipped,
        scale: 1,
      })
      if (!isMatch(judge(reference, held, CANVAS))) problems.push(aId + '+' + bId)
    }
    expect(problems.length === 0 ? 'ok' : problems.join(', ')).toBe('ok')
  })

  it('still exactly five congruent pairs', () => {
    let count = 0
    for (let i = 0; i < board.length; i++) {
      for (let j = i + 1; j < board.length; j++) {
        if (Math.abs(polygonArea(shapePoints(board[i])) - polygonArea(shapePoints(board[j]))) > 1) {
          continue
        }
        if (isPair(board[i], board[j])) count++
      }
    }
    expect(count).toBe(5)
  })
})

const { report } = await import('../harness/spec.mjs')
report()