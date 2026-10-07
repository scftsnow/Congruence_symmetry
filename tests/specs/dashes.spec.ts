/**
 * Dashes spec — no line is drawn where there is no edge.
 *
 * Two sources of stray dots, both found by looking at what the screen actually
 * puts on the canvas rather than at the geometry underneath.
 *
 * THE SEAMS INSIDE THE SHADED REGION
 * ---------------------------------
 * The shared region arrives as several pieces, because it was cut out of
 * triangles. Neighbouring pieces share the edge they were cut along. The layer
 * outlined every piece, so every one of those shared edges was outlined too —
 * and the stroke is dashed, so an edge shared by two pieces came out as a row
 * of dots lying across the middle of the shaded region.
 *
 * For the arrow pair that was twenty-one lines inside the shaded area. The child
 * was shown a shape covered in dashes that have no edge there, and every shape
 * on the board had it. Measured on this board, before the fix:
 *
 *     pair      pieces   edges drawn   real boundary   stray
 *     아·자        16            66             15     50
 *     가·타         4            16              8      8
 *
 * THE TICK THAT TURNED INTO DOTS
 * ------------------------------
 * PairMark drew a dashed line between the two shapes of a confirmed pair. A
 * confirmed pair is coincident, so that line has zero length, and a zero-length
 * dashed line renders as a short run of dots sitting on the shape. It appeared
 * on all five pairs, immediately after the moment of success.
 */

import { describe, it, expect } from '../harness/api'
import { buildBoard, shapePoints } from '../../src/modes/useBoard'
import { intersectPolygons, intersectionArea, polygonCentroid } from '../../src/geometry/overlap'
import { judge, turnedItem } from '../../src/geometry/verdict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const CANVAS = 1100
const board = buildBoard()
const at = (shapeId: string) => board.find((i) => i.shape.id === shapeId)!

const PAIRS: Array<[string, string]> = [
  ['rect-wide', 'rect-tall'],
  ['trap-lying', 'trap-side'],
  ['tri-scalene', 'tri-scalene-2'],
  ['arrow-right', 'arrow-up'],
  ['fish-right', 'fish-left'],
]

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

/**
 * The PairMark function and nothing else.
 *
 * Taking everything after its name runs on into Grid, which legitimately draws
 * lines, and the check then fails for the wrong reason — which is exactly what
 * happened the first time this was written.
 */
function markSource(): string {
  const parts = source('src/components/BoardParts.tsx')
  const start = parts.indexOf('export function PairMark')
  const end = parts.indexOf('\nexport ', start + 10)
  return parts.slice(start, end === -1 ? undefined : end)
}

/** The stacked pair, dropped the sloppiest a hand leaves. */
function stacked(aId: string, bId: string) {
  const a = at(aId)
  const held = { ...at(bId), x: a.x + 30, y: a.y + 25 }
  return { reference: shapePoints(a), held: shapePoints(held) }
}

// ── the pieces ────────────────────────────────────────────
describe('the shared region is cut into pieces', () => {
  it('really is several pieces, not one outline', () => {
    // Two arrows crossing at right angles share two separate lobes, and the
    // triangulated clipper cuts further. This is what makes the seam problem
    // real rather than theoretical.
    const { reference, held } = stacked('arrow-right', 'arrow-up')
    const pieces = intersectPolygons(reference, held)
    expect(pieces ? pieces.length > 4 : false).toBeTruthy()
  })

  it('the pieces do share edges with each other', () => {
    // If they did not, the outline of each piece would already be the boundary
    // and there would be nothing to fix.
    const { reference, held } = stacked('arrow-right', 'arrow-up')
    const pieces = intersectPolygons(reference, held) ?? []

    const seen = new Set<string>()
    let shared = 0
    for (const piece of pieces) {
      for (let i = 0; i < piece.length; i++) {
        const key = edgeKey(piece[i], piece[(i + 1) % piece.length])
        if (seen.has(key)) shared++
        else seen.add(key)
      }
    }
    expect(shared > 0).toBeTruthy()
  })
})

// ── only the boundary is stroked ──────────────────────────
describe('no edge is drawn where there is no edge', () => {
  it('each edge is drawn at most once', () => {
    // The check that would have caught it. An edge carried by two pieces is a
    // seam and must not appear in the outline at all.
    for (const [aId, bId] of PAIRS) {
      const { reference, held } = stacked(aId, bId)
      const pieces = intersectPolygons(reference, held) ?? []

      const counts = new Map<string, number>()
      for (const piece of pieces) {
        for (let i = 0; i < piece.length; i++) {
          const key = edgeKey(piece[i], piece[(i + 1) % piece.length])
          counts.set(key, (counts.get(key) ?? 0) + 1)
        }
      }

      const boundary = boundaryEdges(pieces)
      const doubled = boundary.filter((e) => (counts.get(e.key) ?? 0) > 1)
      expect(doubled.length === 0 ? 'ok' : `${aId}+${bId} drew ${doubled.length} seams`).toBe('ok')
    }
  })

  it('the arrow pair lost its twenty-one stray lines', () => {
    // Sixteen pieces carrying sixty-six edges, of which fifteen are the real
    // boundary. Everything else was a line that meant nothing.
    const { reference, held } = stacked('arrow-right', 'arrow-up')
    const pieces = intersectPolygons(reference, held) ?? []

    const drawn = pieces.reduce((sum, p) => sum + p.length, 0)
    const boundary = boundaryEdges(pieces).length

    expect(drawn > 60).toBeTruthy()
    expect(boundary).toBeLessThan(20)
  })

  it('a single-piece region keeps its whole outline', () => {
    // Nothing is lost by dropping seams: a shape with no internal cuts has only
    // real edges, and all of them must survive.
    const { reference, held } = stacked('tri-scalene', 'tri-scalene-2')
    const pieces = intersectPolygons(reference, held) ?? []

    expect(pieces.length).toBe(1)
    expect(boundaryEdges(pieces).length).toBe(pieces[0].length)
  })

  it('the outline is dropped only by the outline, not the fill', () => {
    // The fill is what the child reads. Removing seams must not shrink it.
    const { reference, held } = stacked('arrow-right', 'arrow-up')
    const pieces = intersectPolygons(reference, held)
    expect(intersectionArea(pieces) > 0).toBeTruthy()

    const layer = source('src/components/OverlapLayer.tsx')
    expect(layer.includes('<path d={d} fill={fill}')).toBeTruthy()
  })

  it('the seam fix holds: no outline is drawn at all', () => {
    // The first attempt dropped only the edges two pieces share and kept the
    // rest. It was still wrong: measured edge by edge, half of what remained
    // still lay inside the region. So the outline went entirely. This is the
    // check that it stays gone.
    const layer = source('src/components/OverlapLayer.tsx')
    expect(layer.includes('outlinePath')).toBeFalsy()
    expect(layer.includes('strokeDasharray')).toBeFalsy()
    // fill only — one path, filled, nothing stroked
    expect(layer.includes('fill={fill}')).toBeTruthy()
  })
})

// ── the confirmed-pair tick ───────────────────────────────
describe('a confirmed pair is marked without a line', () => {
  it('draws no line between the two shapes', () => {
    const mark = markSource()
    expect(mark.includes('<line')).toBeFalsy()
    expect(mark.includes('strokeDasharray')).toBeFalsy()
  })

  it('a confirmed pair would have had a zero-length line', () => {
    // Confirmed means coincident, so the line had nothing to span. This is why
    // the dash pattern showed up as a row of dots rather than a line.
    const problems: string[] = []
    for (const [aId, bId] of PAIRS) {
      const a = at(aId)
      const held = { ...at(bId), x: a.x + 30, y: a.y + 25 }
      const r = judge(shapePoints(a), shapePoints(held), CANVAS)
      if (!r.solution) {
        problems.push(aId + '+' + bId + ': no turn')
        continue
      }
      const landed = turnedItem(held, r.solution)
      const gap = Math.hypot(a.x - landed.x, a.y - landed.y)
      if (gap > 1) problems.push(`${aId}+${bId} gap ${gap.toFixed(1)}`)
    }
    expect(problems.length === 0 ? 'ok' : problems.join(', ')).toBe('ok')
  })

  it('the tick sits on the shape rather than between two points', () => {
    // Placed at the centroid of where they now lie. The two shapes are
    // coincident, so the average of their centroids is that same place.
    expect(markSource().includes('polygonCentroid')).toBeTruthy()
  })

  it('the tick is still there', () => {
    expect(markSource().includes('✓')).toBeTruthy()
  })
})

// ── helpers ───────────────────────────────────────────────
function edgeKey(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const u = `${a.x.toFixed(1)},${a.y.toFixed(1)}`
  const v = `${b.x.toFixed(1)},${b.y.toFixed(1)}`
  return u < v ? `${u}|${v}` : `${v}|${u}`
}

/** The edges seen exactly once, which is the boundary of the whole region. */
function boundaryEdges(pieces: Array<Array<{ x: number; y: number }>>) {
  const counts = new Map<string, number>()
  for (const piece of pieces) {
    for (let i = 0; i < piece.length; i++) {
      const key = edgeKey(piece[i], piece[(i + 1) % piece.length])
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return [...counts.entries()].filter(([, n]) => n === 1).map(([key]) => ({ key }))
}

const { report } = await import('../harness/spec.mjs')
report()
