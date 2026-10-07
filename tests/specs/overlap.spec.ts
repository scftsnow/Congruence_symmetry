/**
 * Overlap spec — the visual proof behind "these are congruent".
 *
 * The child stages two shapes and must be able to SEE that they coincide.
 * That means the overlap has to be real geometry, not a decorative circle.
 */

import { describe, it, expect } from '../harness/api'
import { intersectPolygons, measureOverlap, pointInPolygon, polygonArea } from '../../src/geometry/overlap'
import { applyTransform, identity } from '../../src/geometry/transforms'
import { findShape } from '../../src/geometry/shapes'
import { checkCongruence, EPSILON_STACK } from '../../src/geometry/compare'

const SQUARE = findShape('square')!
const TRIANGLE = findShape('triangle')!

const at = (s: typeof SQUARE, t: Parameters<typeof applyTransform>[1]) => applyTransform(s.vertices, t)

const UNIT_SQUARE = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
]

// ── primitives ───────────────────────────────────────────
describe('polygon helpers', () => {
  it('measures a unit square as 10000', () => {
    expect(polygonArea(UNIT_SQUARE)).toBeCloseTo(10000, 6)
  })

  it('treats winding order as irrelevant', () => {
    expect(polygonArea([...UNIT_SQUARE].reverse())).toBeCloseTo(10000, 6)
  })

  it('tests point containment', () => {
    expect(pointInPolygon({ x: 50, y: 50 }, UNIT_SQUARE)).toBeTruthy()
    expect(pointInPolygon({ x: 150, y: 50 }, UNIT_SQUARE)).toBeFalsy()
    expect(pointInPolygon({ x: 50, y: -10 }, UNIT_SQUARE)).toBeFalsy()
  })
})

// ── intersection ──────────────────────────────────────────
describe('intersection polygons', () => {
  it('identical squares give the whole square back', () => {
    const inter = intersectPolygons(UNIT_SQUARE, UNIT_SQUARE)
    expect(inter).toBeTruthy()
    expect(polygonArea(inter!)).toBeCloseTo(10000, 4)
  })

  it('half-overlapping squares give half the area', () => {
    const shifted = UNIT_SQUARE.map((p) => ({ x: p.x + 50, y: p.y }))
    const inter = intersectPolygons(UNIT_SQUARE, shifted)
    expect(inter).toBeTruthy()
    expect(polygonArea(inter!)).toBeCloseTo(5000, 4)
  })

  it('apart squares do not intersect', () => {
    const far = UNIT_SQUARE.map((p) => ({ x: p.x + 500, y: p.y }))
    expect(intersectPolygons(UNIT_SQUARE, far)).toBe(null)
  })

  it('a fully contained square gives the inner one', () => {
    const small = [
      { x: 25, y: 25 },
      { x: 75, y: 25 },
      { x: 75, y: 75 },
      { x: 25, y: 75 },
    ]
    const inter = intersectPolygons(UNIT_SQUARE, small)
    expect(inter).toBeTruthy()
    expect(polygonArea(inter!)).toBeCloseTo(2500, 4)
  })

  it('survives reversed winding on either input', () => {
    const shifted = UNIT_SQUARE.map((p) => ({ x: p.x + 50, y: p.y }))
    const a = intersectPolygons(UNIT_SQUARE, [...shifted].reverse())
    expect(a).toBeTruthy()
    expect(polygonArea(a!)).toBeCloseTo(5000, 4)
  })

  it('returns null for degenerate input instead of throwing', () => {
    expect(intersectPolygons([], UNIT_SQUARE)).toBe(null)
    expect(intersectPolygons(UNIT_SQUARE, [])).toBe(null)
    expect(intersectPolygons([{ x: 0, y: 0 }], UNIT_SQUARE)).toBe(null)
  })
})

// ── overlap measurement ───────────────────────────────────
describe('overlap measurement', () => {
  it('stacked shapes report near-total coverage', () => {
    const a = at(SQUARE, identity(300, 300))
    const info = measureOverlap(a, a)
    expect(info.coverage).toBeGreaterThan(0.95)
    expect(info.contained).toBeTruthy()
    expect(info.intersection).toBeTruthy()
  })

  it('separated shapes report no overlap', () => {
    const a = at(SQUARE, identity(200, 200))
    const b = at(SQUARE, identity(800, 500))
    const info = measureOverlap(a, b)
    expect(info.coverage).toBeLessThan(0.05)
    expect(info.intersection).toBe(null)
  })

  it('partial overlap lands between the extremes', () => {
    const a = at(SQUARE, identity(300, 300))
    const b = at(SQUARE, identity(360, 300))
    const info = measureOverlap(a, b)
    // a 60px slide on a 100px square leaves roughly two fifths shared
    expect(info.coverage).toBeGreaterThan(0.3)
    expect(info.coverage).toBeLessThan(0.55)
    expect(info.contained).toBeFalsy()
  })

  it('a small shape inside a large one is NOT coincident', () => {
    // The small square covers the large one's middle, so the large shape is
    // NOT fully covered. Two directions must be near-total for coincidence.
    const big = SQUARE.vertices.map((v) => ({ x: v.x * 2, y: v.y * 2 }))
    const a = applyTransform(big, identity(300, 300))
    const b = applyTransform(SQUARE.vertices, identity(300, 300))
    const info = measureOverlap(a, b)
    // B is wholly inside A...
    expect(info.reverseCoverage).toBeGreaterThan(0.95)
    // ...but A is only partly inside B, so they do NOT coincide
    expect(info.coverage).toBeLessThan(0.35)
    expect(info.contained).toBeFalsy()
    expect(info.oneInsideOther).toBeTruthy()
  })

  it('handles degenerate input safely', () => {
    const info = measureOverlap([], [])
    expect(info.coverage).toBe(0)
    expect(info.intersection).toBe(null)
  })
})

// ── the point of the whole screen ─────────────────────────
describe('rotation and flipping still count as overlapping', () => {
  // This is the property that makes "방향이 달라도 합동" visible rather
  // than asserted: a rotated shape must still produce a full overlap.
  it('a 90 degree rotation overlaps completely', () => {
    const a = at(SQUARE, identity(300, 300))
    const b = at(SQUARE, { ...identity(300, 300), rotation: 90 })
    expect(measureOverlap(a, b).coverage).toBeGreaterThan(0.9)
  })

  it('a 45 degree rotation of a square does NOT overlap fully', () => {
    // A square is symmetric under 90 degree steps, not 45. Rotated 45 it
    // becomes a diamond sitting inside the original, covering about 82%.
    // The child must keep rotating to close the gap. This is the visual
    // proof that congruence means the shapes coincide, not that they look
    // vaguely related.
    const a = at(SQUARE, identity(300, 300))
    const b = at(SQUARE, { ...identity(300, 300), rotation: 45 })
    const info = measureOverlap(a, b)
    expect(info.coverage).toBeLessThan(0.9)
    expect(info.coverage).toBeGreaterThan(0.7)
  })

  it('a 45 degree rotation of a triangle does not overlap fully', () => {
    // a triangle is NOT rotationally symmetric at 45 degrees, so the child
    // must rotate the rest of the way. This is the visual proof that
    // congruence requires the shapes to coincide, not merely to look related.
    const a = at(TRIANGLE, identity(300, 300))
    const b = at(TRIANGLE, { ...identity(300, 300), rotation: 45 })
    expect(measureOverlap(a, b).coverage).toBeLessThan(0.9)
  })

  it('a flipped triangle overlaps fully', () => {
    const a = at(TRIANGLE, identity(300, 300))
    const b = at(TRIANGLE, { ...identity(300, 300), flipped: true })
    expect(measureOverlap(a, b).coverage).toBeGreaterThan(0.9)
  })

  it('a triangle inside a square overlaps only as much as it covers', () => {
    // The triangle in this catalogue genuinely sits inside the square:
    // triangle area 6820 vs square 10000. Coverage of the triangle is
    // therefore high, while coverage of the square is about two thirds.
    // These shapes are NOT congruent, which is why the congruence engine
    // is the authority here and coverage alone is not.
    const a = at(TRIANGLE, identity(300, 300))
    const b = at(SQUARE, identity(300, 300))
    const info = measureOverlap(a, b)
    expect(info.coverage).toBeGreaterThan(0.9)
    expect(info.reverseCoverage).toBeLessThan(0.75)

    expect(checkCongruence(a, b, EPSILON_STACK, 1000, false).isCongruent).toBeFalsy()
  })
})

const { report } = await import('../harness/spec.mjs')
report()