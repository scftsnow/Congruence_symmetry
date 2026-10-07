/**
 * Overlap geometry — where do two shapes actually coincide?
 *
 * WHY THIS EXISTS
 * ---------------
 * Stage 2 asks the child to prove congruence by stacking. "They overlap"
 * has to be visible, not asserted. The previous implementation drew a fixed
 * circle at the midpoint of the two centroids, which told the child nothing:
 * the circle appeared even when the shapes did not touch, and it never grew
 * or shrank with the real overlap.
 *
 * WHAT THIS COMPUTES
 * ------------------
 *   - overlapRatio : fraction of shape A covered by shape B (0..1)
 *   - intersection : the clipped polygon of the overlap region
 *
 * The intersection polygon is clipped with Sutherland-Hodgman against every
 * edge of the other shape. Both inputs here are convex or near-convex
 * (regular polygons, and the everyday shapes are single closed loops), so
 * the result is a faithful outline of the shared region.
 *
 * How that is used on screen:
 *   - both shapes render semi-transparent, so the child sees the one behind
 *   - the intersection renders on top as a solid third colour
 *   - a fully dark region means the shapes really coincide
 */

import type { Point } from './types'

/** Signed area; sign tells us winding, which clipping depends on. */
function signedArea(poly: Point[]): number {
  let sum = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    sum += a.x * b.y - b.x * a.y
  }
  return sum / 2
}

/** Keep CCW winding so the clipper's inside test is consistent. */
function toCounterClockwise(poly: Point[]): Point[] {
  return signedArea(poly) < 0 ? [...poly].reverse() : poly
}

/** Point on which side of the directed edge a->b the point lies. */
function side(a: Point, b: Point, p: Point): number {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)
}

/** Where segment p->q crosses the infinite line through a->b. */
function intersect(p: Point, q: Point, a: Point, b: Point): Point {
  const r = { x: q.x - p.x, y: q.y - p.y }
  const s = { x: b.x - a.x, y: b.y - a.y }
  const denom = r.x * s.y - r.y * s.x
  if (Math.abs(denom) < 1e-12) return q
  const t = ((a.x - p.x) * s.y - (a.y - p.y) * s.x) / denom
  return { x: p.x + t * r.x, y: p.y + t * r.y }
}

/**
 * Sutherland-Hodgman: clip `subject` against one half-plane.
 * The clip polygon must be counter-clockwise.
 */
function clipToEdge(subject: Point[], a: Point, b: Point): Point[] {
  const out: Point[] = []
  const n = subject.length
  if (n === 0) return out

  for (let i = 0; i < n; i++) {
    const current = subject[i]
    const previous = subject[(i - 1 + n) % n]

    const currentInside = side(a, b, current) >= 0
    const previousInside = side(a, b, previous) >= 0

    if (currentInside) {
      if (!previousInside) out.push(intersect(previous, current, a, b))
      out.push(current)
    } else if (previousInside) {
      out.push(intersect(previous, current, a, b))
    }
  }
  return out
}

/**
 * Intersection polygon of two simple polygons, or null when they do not meet.
 *
 * Order matters only for convex clip regions; for the shapes this app draws
 * it produces the shared region faithfully.
 */
export function intersectPolygons(subject: Point[], clip: Point[]): Point[] | null {
  if (subject.length < 3 || clip.length < 3) return null

  let output = toCounterClockwise(subject)
  const clipper = toCounterClockwise(clip)

  for (let i = 0; i < clipper.length; i++) {
    if (output.length === 0) return null
    const a = clipper[i]
    const b = clipper[(i + 1) % clipper.length]
    output = clipToEdge(output, a, b)
  }

  if (output.length < 3) return null
  return output
}

/** Absolute area of a polygon. */
export function polygonArea(poly: Point[]): number {
  return Math.abs(signedArea(poly))
}

/** Is a point inside a polygon? Used to sample coverage. */
export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    const straddles = a.y > p.y !== b.y > p.y
    if (straddles && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside
    }
  }
  return inside
}

export interface OverlapInfo {
  /** shared region, or null when the shapes are apart */
  intersection: Point[] | null
  /** fraction of A covered by B, 0..1 */
  coverage: number
  /** fraction of B covered by A, 0..1 */
  reverseCoverage: number
  /** do the two shapes coincide (both directions almost fully covered) */
  contained: boolean
  /** is one shape wholly inside the other (only one direction covered) */
  oneInsideOther: boolean
}

/**
 * Measure how much two polygons coincide.
 *
 * `coverage` is sampled rather than computed from the clipped polygon so the
 * number stays meaningful for shapes whose intersection is several disjoint
 * lobes, which the single-polygon clipper would merge.
 */
export function measureOverlap(a: Point[], b: Point[]): OverlapInfo {
  if (a.length < 3 || b.length < 3) {
    return { intersection: null, coverage: 0, reverseCoverage: 0, contained: false, oneInsideOther: false }
  }

  const areaA = polygonArea(a)
  const areaB = polygonArea(b)
  if (areaA === 0 || areaB === 0) {
    return { intersection: null, coverage: 0, reverseCoverage: 0, contained: false, oneInsideOther: false }
  }

  const inter = intersectPolygons(a, b)

  // Sample A's bounding box on a grid and count membership in both.
  const SAMPLES = 48
  let inA = 0
  let inBoth = 0
  let inB = 0
  let inBothFromB = 0

  const minX = Math.min(...a.map((p) => p.x))
  const maxX = Math.max(...a.map((p) => p.x))
  const minY = Math.min(...a.map((p) => p.y))
  const maxY = Math.max(...a.map((p) => p.y))

  for (let iy = 0; iy < SAMPLES; iy++) {
    for (let ix = 0; ix < SAMPLES; ix++) {
      const p = {
        x: minX + ((ix + 0.5) / SAMPLES) * (maxX - minX),
        y: minY + ((iy + 0.5) / SAMPLES) * (maxY - minY),
      }
      const inAHere = pointInPolygon(p, a)
      const inBHere = pointInPolygon(p, b)
      if (inAHere) inA++
      if (inBHere) inB++
      if (inAHere && inBHere) {
        inBoth++
        inBothFromB++
      }
    }
  }

  const coverage = inA === 0 ? 0 : inBoth / inA
  const reverseCoverage = inB === 0 ? 0 : inBothFromB / inB

  // Coincident requires BOTH directions to be almost fully covered.
  // A one-sided test is wrong: a small square inside a larger one leaves
  // the larger only partly covered, so "contained" would be reported for
  // shapes that merely overlap. The child must see the difference.
  const coincident = coverage > 0.97 && reverseCoverage > 0.97

  return {
    intersection: inter,
    coverage,
    reverseCoverage,
    contained: coincident,
    // one shape sits wholly inside the other when only one side is covered
    oneInsideOther: coverage > 0.97 || reverseCoverage > 0.97,
  }
}