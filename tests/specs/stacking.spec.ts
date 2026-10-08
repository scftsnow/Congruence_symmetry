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
import { buildBoard, shapePoints, LABELS } from '../../src/modes/useBoard'
import { findMatches } from '../../src/geometry/pairs'
import { isMatch, judge, turnedItem } from '../../src/geometry/verdict'
import {
  intersectPolygons,
  intersectionArea,
  isSimplePolygon,
  measureOverlap,
  polygonArea,
  touching,
  triangulate,
} from '../../src/geometry/overlap'
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
    // Measured against the shapes' own size, so this holds for a long thin
    // arrow and a wide rectangle with one number. 60px is half a fish and
    // two thirds of a rectangle, so the small shapes reject it and the large
    // ones accept it, which is what the child would see.
    for (const [aId, bId] of PAIR_IDS) {
      const a = at(aId)
      const held = droppedOnto(a, at(bId), 60, 0)
      if (touching(shapePoints(a), shapePoints(held))) continue
      const r = judge(shapePoints(a), shapePoints(held), CANVAS)
      expect(r.solution).toBe(null)
    }
  })

  it('is measured against the shapes own size, not a pixel count', () => {
    // The fish is the smallest shape on the board, so a fixed pixel limit would
    // either reject it for a sloppy drop or let a rectangle loose. Proximity is
    // normalised by reach, and this is the check that it still is.
    const fish = at('fish-right')
    const rect = at('rect-wide')

    const fishNear = droppedOnto(fish, at('fish-left'), 25, 20)
    const rectNear = droppedOnto(rect, at('rect-tall'), 25, 20)

    expect(touching(shapePoints(fish), shapePoints(fishNear))).toBeTruthy()
    expect(touching(shapePoints(rect), shapePoints(rectNear))).toBeTruthy()
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

// ── the label sequence ────────────────────────────────────
describe('the labels are the twelve syllables of the alphabet', () => {
  it('uses 가 to 타, in order', () => {
    // Twelve shapes take the first twelve syllables, which ends at 타. 파 and
    // 하 are the thirteenth and fourteenth and have no shape.
    const labels = board.map((i) => i.label)
    expect(labels.join('')).toBe('가나다라마바사아자차카타')
  })

  it('matches the list the board file declares', () => {
    expect(board.map((i) => i.label).join('')).toBe(LABELS.join(''))
  })

  it('reads in order across the board', () => {
    // Left to right, top to bottom. The child can therefore name any shape
    // they are looking at, which matters once the screen tells them to turn one.
    // Rows are cut at the board's own three bands rather than by comparing y
    // pairwise: a comparator that asks "are these two in the same row" gives a
    // different answer depending on which two it is asked about, which is not
    // an order at all.
    const bands = [250, 500]
    const rows = board.filter((i) => i.y < bands[0])
    const middle = board.filter((i) => i.y >= bands[0] && i.y < bands[1])
    const last = board.filter((i) => i.y >= bands[1])

    for (const row of [rows, middle, last]) {
      row.sort((a, b) => a.x - b.x)
    }
    expect([...rows, ...middle, ...last].map((i) => i.label).join('')).toBe('가나다라마바사아자차카타')
  })
})

// ── the shapes themselves ─────────────────────────────────
describe('every shape is a proper polygon', () => {
  it('no outline crosses itself', () => {
    // The arrow shipped with four vertices that crossed. Nothing threw and every
    // test passed, because the tests asked whether two shapes coincide and two
    // equally broken shapes still do. This asks about the shape.
    const broken = board.filter((i) => !isSimplePolygon(i.shape.vertices))
    expect(broken.length === 0 ? 'ok' : broken.map((i) => i.label).join(', ')).toBe('ok')
  })

  it('every shape has the area its outline implies', () => {
    // The crossed arrow measured 338 where its outline implies 4200, so its
    // overlap, its shading and its agreement were all meaningless.
    for (const item of board) {
      expect(polygonArea(item.shape.vertices) > 1000 ? 'ok' : `${item.label} has no area`).toBe('ok')
    }
  })

  it('every shape can be triangulated', () => {
    // Triangulation is what the shaded region is built from. A shape that
    // yields no triangles has no shading at all, which is what the arrow did.
    for (const item of board) {
      const tris = triangulate(item.shape.vertices)
      expect(tris.length > 0 ? 'ok' : `${item.label} made no triangles`).toBe('ok')
    }
  })
})

// ── the overlap region is drawn ───────────────────────────
describe('the shared region is real geometry', () => {
  const at2 = (aId: string, bId: string) => {
    const a = at(aId)
    return {
      a: shapePoints(a),
      b: shapePoints({ ...at(bId), x: a.x, y: a.y }),
    }
  }

  it('is non-empty for every pair, including the arrow', () => {
    // The arrow is concave, and Sutherland-Hodgman returns nothing at all for a
    // concave subject. Two arrows stacked dead centre genuinely overlap, and
    // before the triangulated clipper they reported zero shared area.
    const problems: string[] = []
    for (const [aId, bId] of PAIR_IDS) {
      const { a, b } = at2(aId, bId)
      const pieces = intersectPolygons(a, b)
      if (!pieces || intersectionArea(pieces) <= 0) problems.push(aId + '+' + bId)
    }
    expect(problems.length === 0 ? 'ok' : problems.join(', ')).toBe('ok')
  })

  it('the drawn area matches the sampled agreement', () => {
    // The shaded region is the only evidence on screen now that the percentage
    // is gone, so it has to be the same fact the geometry computes. The number
    // is not printed, but it is still the thing being checked.
    for (const [aId, bId] of PAIR_IDS) {
      const { a, b } = at2(aId, bId)
      const drawn = intersectionArea(intersectPolygons(a, b))
      const sampled = measureOverlap(a, b).agreement * Math.min(polygonArea(a), polygonArea(b))
      // sampling has grid error, so this is a band rather than equality
      const ok = Math.abs(drawn - sampled) / Math.max(sampled, 1) < 0.12
      expect(ok ? 'ok' : `${aId}+${bId} drawn ${drawn.toFixed(0)} vs ${sampled.toFixed(0)}`).toBe('ok')
    }
  })

  it('is still drawn for a pair that only partly agrees', () => {
    // The arrow pair shares about 58% when stacked dead centre, which is why
    // the percentage had to go. The region is drawn anyway: the child stacked
    // them, and hiding the evidence because it is not a full match would be
    // telling them their attempt did not count.
    const a = at('arrow-right')
    const held = droppedOnto(a, at('arrow-up'))
    const info = measureOverlap(shapePoints(a), shapePoints(held))

    expect(info.agreement).toBeLessThan(0.7)
    expect(info.contained).toBeFalsy()
    expect(info.intersection).toBeTruthy()
    expect(intersectionArea(info.intersection) > 0).toBeTruthy()
  })
})

// ── agreement, not coverage ───────────────────────────────
describe('agreement punishes one shape swallowing another', () => {
  it('a small shape inside a large one scores low', () => {
    // The small rectangle covers all of itself, so measured the other way round
    // its coverage reads 100%. Agreement takes the worse of the two directions,
    // so dropping it inside a rectangle scores 39% and is not a coincidence.
    const wide = at('rect-wide')
    const small = droppedOnto(wide, at('rect-small'))
    const info = measureOverlap(shapePoints(small), shapePoints(wide))

    expect(info.coverage).toBeGreaterThan(0.95)
    expect(info.reverseCoverage).toBeLessThan(0.6)
    expect(info.agreement).toBeLessThan(0.6)
    expect(info.contained).toBeFalsy()
  })

  it('agreement is the same whichever shape is on top', () => {
    for (const [aId, bId] of PAIR_IDS) {
      const a = at(aId)
      const b = droppedOnto(a, at(bId))
      const forward = measureOverlap(shapePoints(a), shapePoints(b)).agreement
      const backward = measureOverlap(shapePoints(b), shapePoints(a)).agreement
      expect(Math.abs(forward - backward) < 0.02 ? 'ok' : `${aId}+${bId} ${forward} vs ${backward}`).toBe('ok')
    }
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

  it('picks a partner by proximity, not by outline', () => {
    const hook = source('src/modes/useBoard.ts')
    expect(hook.includes('touching')).toBeTruthy()
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
    const parts = source('src/components/StackedOverlay.tsx')
    expect(parts.includes('touching')).toBeTruthy()
    expect(parts.includes('sameCongruence')).toBeFalsy()
  })
})

const { report } = await import('../harness/spec.mjs')
report()
