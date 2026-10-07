/**
 * Overlap geometry — where do two shapes actually coincide?
 *
 * WHY THIS EXISTS
 * ---------------
 * The child proves congruence by stacking, so "they overlap" has to be visible
 * rather than asserted. An earlier build drew a fixed circle at the midpoint of
 * the two centroids, which appeared even when the shapes did not touch and
 * never grew or shrank with the real overlap.
 *
 * WHAT THIS COMPUTES
 * ------------------
 *   - agreement   : how much the two shapes agree, 0..1, symmetric
 *   - coverage    : fraction of A covered by B
 *   - intersection: the shared region, as pieces, for drawing
 *
 * AGREEMENT, NOT COVERAGE
 * -----------------------
 * Neither coverage nor reverseCoverage can be read alone. A small shape
 * dropped inside a large one covers all of itself, so its own coverage reads
 * 100% while nothing has been proved. agreement takes the worse of the two
 * directions, which is the only reading that punishes one shape swallowing
 * another, and it is symmetric, so it does not matter which is held.
 *
 * IT IS SAMPLED, AND IT HAS TO BE
 * ------------------------------
 * coverage and reverseCoverage come from sampling a grid, not from the clipped
 * region, and that is deliberate. Two arrows crossing at right angles share two
 * separate lobes, and asking for their area through a single outline cannot
 * work. Sampling also sidesteps the clipping problem below entirely.
 *
 * THE CLIPPER WAS WRONG FOR CONCAVE SHAPES
 * ----------------------------------------
 * Sutherland-Hodgman is only exact when the polygon being clipped is convex.
 * The arrow is concave, so clipping it produced nothing at all: two arrows
 * stacked dead centre reported zero shared area while genuinely overlapping,
 * and the shaded region on screen was meaningless.
 *
 * The intersection is now built by splitting both polygons into triangles and
 * clipping triangle against triangle, which is exact, at the cost of returning
 * a list of pieces instead of one outline.
 *
 * A MALFORMED SHAPE ARRIVED INVISIBLY
 * -----------------------------------
 * The arrow shipped for weeks with four vertices that crossed each other, so it
 * was not a simple polygon. Its area came out as 338 instead of 4200 and its
 * overlap as zero. No test caught it, because every test asked whether two
 * shapes coincide, and they still did — both were equally wrong.
 * `isSimplePolygon` is here so that kind of mistake fails a test.
 */

import type { Point } from './types'

/** Areas below this are slivers from triangulation, not real overlap. */
const AREA_EPSILON = 0.5

/**
 * How close two centroids must be, as a fraction of the shapes' own size,
 * before the child counts as having put them together.
 *
 * One whole reach. Read off the board rather than guessed, and the gap it sits
 * in is wide. Measuring each case against the average of the two shapes' own
 * reach gives:
 *
 *   - a drop 30px off, the sloppiest a hand leaves:  0.27 to 0.82
 *   - a drop 60px off:                               0.38 to 1.22
 *   - the closest two shapes where they stand:       2.77
 *
 * The fish is what sets the upper end: at 57px reach it is the smallest shape
 * on the board, so the same 30px that is four tenths of a rectangle is eight
 * tenths of a fish. A single pixel limit would have had to be either too tight
 * for the fish or too loose for the rectangle, and normalising by size is what
 * lets one number serve both.
 *
 * One accepts every 30px drop, rejects the closest pair on the board by a
 * factor of nearly three, and rejects 60px on the fish, which at that distance
 * the child has not really placed it.
 */
const TOUCH = 1

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
 *
 * Exact only when the subject is convex, which is why the caller clips
 * triangles rather than shapes.
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

type Triangle = [Point, Point, Point]

/** Is p inside the triangle, which is assumed counter-clockwise? */
function inTriangle(p: Point, a: Point, b: Point, c: Point): boolean {
  return side(a, b, p) >= 0 && side(b, c, p) >= 0 && side(c, a, p) >= 0
}

/**
 * Does every corner turn the same way?
 *
 * Assumes a counter-clockwise outline, so a convex polygon turns left at every
 * corner and never has a negative cross product.
 */
function isConvex(pts: Point[]): boolean {
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[(i - 1 + pts.length) % pts.length]
    const curr = pts[i]
    const next = pts[(i + 1) % pts.length]
    if (side(prev, curr, next) < 0) return false
  }
  return true
}

/**
 * Split a simple polygon into triangles by clipping ears.
 *
 * Ear clipping needs no library and the shapes here are small. It gives up
 * rather than spinning when the outline is not simple, which is the safe
 * failure: a missing triangle costs a little shading, a hung loop costs the
 * whole app.
 */
export function triangulate(poly: Point[]): Triangle[] {
  const pts = toCounterClockwise(poly)
  if (pts.length < 3) return []

  // A convex outline is already a fan of triangles. Routing one through the ear
  // loop is what made most of the board's shapes come back as zero triangles:
  // the ear test rejects any corner that contains another vertex, and in a
  // convex polygon every such triangle reaches a neighbour, so nothing was ever
  // accepted and the loop gave up. Rectangles, trapezoids, fish and pentagons
  // all came back empty, and with them every shaded overlap region on the board.
  if (isConvex(pts)) {
    const fan: Triangle[] = []
    for (let i = 1; i + 1 < pts.length; i++) {
      fan.push([pts[0], pts[i], pts[i + 1]])
    }
    return fan
  }

  let remaining = pts.map((_, i) => i)
  const out: Triangle[] = []
  // Each successful clip removes one vertex, so this is a generous bound.
  let guard = pts.length * pts.length + 4

  while (remaining.length > 3 && guard-- > 0) {
    let clipped = false

    for (let i = 0; i < remaining.length; i++) {
      const prevIndex = remaining[(i - 1 + remaining.length) % remaining.length]
      const currIndex = remaining[i]
      const nextIndex = remaining[(i + 1) % remaining.length]
      const prev = pts[prevIndex]
      const curr = pts[currIndex]
      const next = pts[nextIndex]

      // On a counter-clockwise outline a reflex corner turns right, which is a
      // negative cross product, and cannot be an ear.
      if (side(prev, curr, next) <= 0) continue

      // All three corners have to be excluded, not just the one under test.
      // A triangle counts its own corners as inside — the test is inclusive —
      // so testing prev or next against the triangle finds a hit every time and
      // no ear is ever accepted. That is what left the arrow with no triangles
      // and no shaded region at all.
      let blocked = false
      for (const index of remaining) {
        if (index === prevIndex || index === currIndex || index === nextIndex) continue
        if (inTriangle(pts[index], prev, curr, next)) {
          blocked = true
          break
        }
      }
      if (blocked) continue

      out.push([prev, curr, next])
      remaining = remaining.filter((_, k) => k !== i)
      clipped = true
      break
    }

    // No corner was an ear, so the outline is not simple. Stop rather than loop.
    if (!clipped) break
  }

  if (remaining.length === 3) {
    out.push([pts[remaining[0]], pts[remaining[1]], pts[remaining[2]]])
  }
  return out
}

/**
 * The shared region of two simple polygons, as a list of pieces.
 *
 * Null when they do not meet. More than one piece is normal rather than a
 * defect: two arrows crossing at right angles share two separate lobes, and a
 * single outline could not describe them.
 */
export function intersectPolygons(subject: Point[], clip: Point[]): Point[][] | null {
  if (subject.length < 3 || clip.length < 3) return null

  const clipTriangles = triangulate(clip)
  const pieces: Point[][] = []

  for (const triangle of triangulate(subject)) {
    for (const clipper of clipTriangles) {
      // Both are convex here, which is the condition Sutherland-Hodgman needs.
      let poly: Point[] = triangle
      for (let i = 0; i < 3 && poly.length > 0; i++) {
        poly = clipToEdge(poly, clipper[i], clipper[(i + 1) % 3])
      }
      if (poly.length >= 3 && Math.abs(signedArea(poly)) > AREA_EPSILON) {
        pieces.push(poly)
      }
    }
  }

  return pieces.length > 0 ? pieces : null
}

/** Total area of a set of pieces. */
export function intersectionArea(pieces: Point[][] | null): number {
  if (!pieces) return 0
  return pieces.reduce((sum, piece) => sum + Math.abs(signedArea(piece)), 0)
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

/**
 * Does this outline cross itself?
 *
 * Added after an arrow shipped with four vertices that crossed. Nothing threw
 * and every test passed, because the tests asked whether shapes coincide and
 * two equally broken shapes still coincide. This is what catches the shape
 * itself rather than the consequences.
 */
export function isSimplePolygon(poly: Point[]): boolean {
  const n = poly.length
  if (n < 3) return false

  for (let i = 0; i < n; i++) {
    const a1 = poly[i]
    const a2 = poly[(i + 1) % n]

    for (let j = i + 1; j < n; j++) {
      // Two edges that share a vertex cannot be evidence of a crossing.
      if (j === i + 1) continue
      if (i === 0 && j === n - 1) continue
      if (segmentsCross(a1, a2, poly[j], poly[(j + 1) % n])) return false
    }
  }
  return true
}

/** Do two segments cross strictly, ignoring shared endpoints? */
function segmentsCross(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d1 = side(p3, p4, p1)
  const d2 = side(p3, p4, p2)
  const d3 = side(p1, p2, p3)
  const d4 = side(p1, p2, p4)

  const straddles1 = (d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)
  const straddles2 = (d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0)
  return straddles1 && straddles2
}

/**
 * Has the child brought these two shapes together?
 *
 * Measured by where they are, not by how much they overlap, and the reason is
 * that overlap cannot answer this question. Two arrows pointing different ways,
 * stacked dead centre, genuinely share only about a fifth of the smaller one,
 * because two crossed shafts overlap in a small square. Two rectangles left 60px
 * apart share half of theirs. So the same gesture of "brought them together"
 * measures anywhere from 0.19 to 0.57, and any threshold on overlap either
 * rejects the arrow pair outright or accepts rectangles sitting on the far side
 * of the board.
 *
 * Overlap answers a different and important question — how much do these two
 * agree — and that one is measured, sampled and shown, as `agreement`.
 * Proximity answers whether the child has made the attempt at all.
 */
export function touching(a: Point[], b: Point[]): boolean {
  const ca = polygonCentroid(a)
  const cb = polygonCentroid(b)
  const reach = (reachOf(a) + reachOf(b)) / 2
  if (reach <= 0) return false
  return Math.hypot(ca.x - cb.x, ca.y - cb.y) <= TOUCH * reach
}

/**
 * How far a shape extends from its own middle.
 *
 * Half the bounding-box diagonal, so the measure means the same thing for a
 * long thin arrow as for a square. Using it normalises the proximity test: a
 * 60px gap is a miss on a small arrow and a stack on a wide rectangle, which is
 * exactly right, and no fixed pixel threshold could express that.
 */
function reachOf(points: Point[]): number {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  return Math.hypot(maxX - minX, maxY - minY) / 2
}

export interface OverlapInfo {
  /** the shared region as pieces, or null when the shapes are apart */
  intersection: Point[][] | null
  /** fraction of A covered by B, 0..1 */
  coverage: number
  /** fraction of B covered by A, 0..1 */
  reverseCoverage: number
  /**
   * How much the two agree, 0..1. The worse of the two directions, so that one
   * shape swallowing another does not read as a perfect overlap.
   */
  agreement: number
  /** do the two shapes coincide (both directions almost fully covered) */
  contained: boolean
  /** is one shape wholly inside the other (only one direction covered) */
  oneInsideOther: boolean
}

/**
 * Measure how much two polygons coincide.
 *
 * The grid spans the union of both bounding boxes, not their intersection. Over
 * the intersection each shape would only be counted where the other already
 * reaches, so two squares offset by half their width would report full coverage
 * when they plainly overlap by half.
 */
export function measureOverlap(a: Point[], b: Point[]): OverlapInfo {
  const apart: OverlapInfo = {
    intersection: null,
    coverage: 0,
    reverseCoverage: 0,
    agreement: 0,
    contained: false,
    oneInsideOther: false,
  }
  if (a.length < 3 || b.length < 3) return apart

  if (polygonArea(a) === 0 || polygonArea(b) === 0) return apart

  const lo = {
    x: Math.min(Math.min(...a.map((p) => p.x)), Math.min(...b.map((p) => p.x))),
    y: Math.min(Math.min(...a.map((p) => p.y)), Math.min(...b.map((p) => p.y))),
  }
  const hi = {
    x: Math.max(Math.max(...a.map((p) => p.x)), Math.max(...b.map((p) => p.x))),
    y: Math.max(Math.max(...a.map((p) => p.y)), Math.max(...b.map((p) => p.y))),
  }

  if (hi.x <= lo.x || hi.y <= lo.y) return apart

  const SAMPLES = 48
  let inA = 0
  let inB = 0
  let inBoth = 0

  for (let iy = 0; iy < SAMPLES; iy++) {
    for (let ix = 0; ix < SAMPLES; ix++) {
      const p = {
        x: lo.x + ((ix + 0.5) / SAMPLES) * (hi.x - lo.x),
        y: lo.y + ((iy + 0.5) / SAMPLES) * (hi.y - lo.y),
      }
      const insideA = pointInPolygon(p, a)
      const insideB = pointInPolygon(p, b)
      if (insideA) inA++
      if (insideB) inB++
      if (insideA && insideB) inBoth++
    }
  }

  const coverage = inA === 0 ? 0 : inBoth / inA
  const reverseCoverage = inB === 0 ? 0 : inBoth / inB

  // Coincident requires BOTH directions to be almost fully covered.
  // A one-sided test is wrong: a small square inside a larger one leaves the
  // larger only partly covered, so "contained" would be reported for shapes
  // that merely overlap. The child must see the difference.
  const coincident = coverage > 0.97 && reverseCoverage > 0.97

  return {
    intersection: intersectPolygons(a, b),
    coverage,
    reverseCoverage,
    agreement: Math.min(coverage, reverseCoverage),
    contained: coincident,
    // one shape sits wholly inside the other when only one side is covered
    oneInsideOther: coverage > 0.97 || reverseCoverage > 0.97,
  }
}

/**
 * Geometric centre of mass (the polygon's centroid).
 *
 * Distinct from the mean of the vertices, which is only equal to the centroid
 * for a regular polygon. For an arrow, whose vertices bunch up at the tail,
 * the two differ enough that rotating about the mean leaves the shape
 * visibly askew after a half turn. Rotation must pivot on this one.
 */
export function polygonCentroid(poly: Point[]): Point {
  if (poly.length === 0) return { x: 0, y: 0 }

  let crossSum = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const cross = a.x * b.y - b.x * a.y
    crossSum += cross
    cx += (a.x + b.x) * cross
    cy += (a.y + b.y) * cross
  }

  // A degenerate polygon (all points collinear) has no area to divide by.
  if (Math.abs(crossSum) < 1e-12) {
    let sx = 0
    let sy = 0
    for (const p of poly) {
      sx += p.x / poly.length
      sy += p.y / poly.length
    }
    return { x: sx, y: sy }
  }

  const factor = 1 / (3 * crossSum)
  return { x: cx * factor, y: cy * factor }
}
