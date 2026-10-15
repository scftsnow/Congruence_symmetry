/**
 * The parts of a line-symmetric figure — 대응점, 대응변, 대응각 — and the two
 * facts the textbook sets beside them: the segment joining corresponding points
 * is square to the axis, and a point and its image stand the same distance from
 * it.
 *
 * WHY NOTHING HERE IS DEFINED TWICE
 * ---------------------------------
 * The pairs of a line-symmetric figure are just the correspondence between a
 * shape and its own mirror image. So every pair is computed by handing
 * correspondence() the outline and its reflection, and the wedge, side-move and
 * angle-move helpers already built for the congruence unit are reused as they
 * are. What differs between the two units is only where the second shape is —
 * opposite side of the screen, or folded across one line — and where the child
 * touches it. The pairing itself is the same mathematics both times.
 *
 * THE TWO FACTS, WITHOUT A NUMBER
 * -------------------------------
 * Squareness and equal distance are judged as tolerances, in pixels and degrees,
 * because geometry has to be measured in something. None of it reaches the
 * screen: the right angle is drawn as a small square and the equal lengths as a
 * single tick on each, never as a figure or a measure.
 */

import { correspondence, type Correspondence } from './correspondence'
import { distance, reflectAcrossLine } from './transforms'
import type { Point } from './types'

/** A straight line, as two points on it. Structurally the unit's `Axis`. */
export interface Line {
  a: Point
  b: Point
}

/** How far a vertex may sit from its true mirror image and still be its partner. */
export const MIRROR_TOLERANCE = 2
/** How near a pressed or dropped point must be to count as aimed at a vertex. */
export const GRAB_TOLERANCE = 48
/** How square a drawn segment must stand to an axis, in degrees either way. */
export const SQUARE_TOLERANCE = 12
/**
 * How near the axis a drawn span must land, in pixels.
 *
 * Generous, because the end of a stroke is where a finger is least precise, and
 * the point being made is where the span STOPS — not that a child can hit a
 * target the width of a pencil. A span that stops well short is a different
 * answer and gets a different hint.
 */
export const SPAN_TOLERANCE = 45

/** The mirror image of one point. */
export function mirrorOf(p: Point, line: Line): Point {
  return reflectAcrossLine(p, line.a, line.b)
}

/** The mirror image of a whole outline: the same shape folded over the line. */
export function mirroredOutline(vertices: Point[], line: Line): Point[] {
  return vertices.map((p) => mirrorOf(p, line))
}

/**
 * The correspondence of a line-symmetric figure with its own mirror image.
 *
 * Thin on purpose: the work is correspondence()'s, and this only says which two
 * outlines it is being asked about.
 */
export function lineCorrespondence(vertices: Point[], line: Line): Correspondence {
  return reflectionCorrespondence(vertices, (p) => mirrorOf(p, line))
}

/**
 * The correspondence of a figure with its own mirror image, by any mirror.
 *
 * A reflection across a line and a half turn about a center are both mirrors —
 * each applied twice is back where it started — so one function pairs both
 * kinds of figure with their own image.
 */
export function reflectionCorrespondence(
  vertices: Point[],
  imageOf: (p: Point) => Point,
): Correspondence {
  return correspondence(
    vertices,
    vertices.map((p) => imageOf(p)),
  )
}

/**
 * For every vertex, which vertex is its partner.
 *
 * A vertex sitting on the axis is its own partner, and the index says so. That is
 * not a special case to be excused — it is the truth about such a point, and the
 * axis board has to agree with the folding about it.
 */
export function mirrorIndex(vertices: Point[], line: Line): number[] {
  return partnerIndexOf(vertices, (p) => mirrorOf(p, line))
}

/**
 * For every vertex, which vertex a mirror sends it to.
 *
 * The pairing of a line-symmetric figure is one case of this: the mirror is a
 * reflection across a line. The pairing of a point-symmetric figure is the
 * other: the mirror is a half turn about a center. One function serves both,
 * because both ask the same question — where does this corner land.
 */
export function partnerIndexOf(vertices: Point[], imageOf: (p: Point) => Point): number[] {
  return vertices.map((p, k) => {
    const image = imageOf(p)
    let best = k
    let bestGap = MIRROR_TOLERANCE
    vertices.forEach((v, j) => {
      const gap = distance(v, image)
      if (gap < bestGap) {
        bestGap = gap
        best = j
      }
    })
    return best
  })
}

/**
 * The pairs of a line-symmetric figure: which corners face each other, and which
 * sides face each other, across the axis.
 *
 * One index per pair is what the parts board asks about, so asking every corner
 * would ask every pair twice — once from each end. And a side whose mirror image
 * is itself, an edge crossing the axis squarely like the flat top of this unit's
 * pentagon, has no partner at all: a pair is two, so it is never a 대응변
 * question. The same holds for the pentagon's bottom apex standing on the axis,
 * which is why the board asks two point questions of five corners.
 */
export interface MirrorPairs {
  /** corner pairs, each the lower index first, in outline order */
  points: Array<[number, number]>
  /** side pairs by side index, each the lower index first, in outline order */
  sides: Array<[number, number]>
}

/**
 * The pairs a partner list makes.
 *
 * A corner whose partner is itself and a side whose mirror is itself have no
 * partner: a pair is two. Extracted because both mirrors — the line and the
 * half turn — pair the same way once the partners are known.
 */
export function pairsFromPartners(partners: number[]): MirrorPairs {
  const n = partners.length
  const points: Array<[number, number]> = []
  for (let i = 0; i < n; i++) {
    if (partners[i] > i) points.push([i, partners[i]])
  }
  const endsKey = (i: number) => [i, (i + 1) % n].sort((a, b) => a - b).join(',')
  const partnerSide = (i: number) => {
    const want = [partners[i], partners[(i + 1) % n]].sort((a, b) => a - b).join(',')
    return Array.from({ length: n }, (_, k) => k).find((k) => endsKey(k) === want) ?? i
  }
  const sides: Array<[number, number]> = []
  for (let i = 0; i < n; i++) {
    const j = partnerSide(i)
    if (j > i) sides.push([i, j])
  }
  return { points, sides }
}

export function mirrorPairs(vertices: Point[], line: Line): MirrorPairs {
  return pairsFromPartners(mirrorIndex(vertices, line))
}

/** Where a square dropped from a point meets the line. */
export function footOnAxis(p: Point, line: Line): Point {
  const dx = line.b.x - line.a.x
  const dy = line.b.y - line.a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return { ...p }
  const t = ((p.x - line.a.x) * dx + (p.y - line.a.y) * dy) / lenSq
  return { x: line.a.x + t * dx, y: line.a.y + t * dy }
}

/**
 * How far a drawn segment falls from standing square to the axis.
 *
 * Returned in degrees away from a right angle, so zero is perfect. Measuring
 * there rather than comparing raw angles keeps a line drawn the other way round
 * — the same segment, entered from its other end — from reading as a mistake.
 */
export function angleOffRight(a: Point, b: Point, line: Line): number {
  const segment = Math.atan2(b.y - a.y, b.x - a.x)
  const along = Math.atan2(line.b.y - line.a.y, line.b.x - line.a.x)
  let apart = Math.abs(segment - along) % Math.PI
  if (apart > Math.PI / 2) apart = Math.PI - apart
  return Math.abs(90 - (apart * 180) / Math.PI)
}

/** Does a drawn segment stand square to the axis? */
export function isSquareToAxis(a: Point, b: Point, line: Line): boolean {
  return angleOffRight(a, b, line) <= SQUARE_TOLERANCE
}

/**
 * The little square that says 직각, as an SVG path.
 *
 * The mark a child already knows from paper, drawn on the side of the axis the
 * segment came from. It is a shape rather than a figure because no figure is
 * spoken or printed anywhere in this unit — the claim is made by the drawing
 * sitting square, and this only names it.
 */
export function rightAnglePath(foot: Point, axis: Line, toward: Point, size: number): string {
  const len = Math.hypot(axis.b.x - axis.a.x, axis.b.y - axis.a.y)
  if (len === 0) return ''
  const ux = (axis.b.x - axis.a.x) / len
  const uy = (axis.b.y - axis.a.y) / len
  const nx = -uy
  const ny = ux
  // put the square on the side the segment actually lies, so it never floats away
  const side = (toward.x - foot.x) * nx + (toward.y - foot.y) * ny >= 0 ? 1 : -1
  const along = { x: foot.x + ux * size, y: foot.y + uy * size }
  const corner = { x: along.x + nx * size * side, y: along.y + ny * size * side }
  const across = { x: foot.x + nx * size * side, y: foot.y + ny * size * side }
  return `M ${foot.x} ${foot.y} L ${along.x} ${along.y} L ${corner.x} ${corner.y} L ${across.x} ${across.y} Z`
}

/**
 * The single tick that says 두 선분의 길이가 같다, as an SVG path.
 *
 * One tick on each, which is how congruence is marked on paper before anyone
 * counts anything. No number is involved: the marks are equal because the lines
 * between them are, and the child is meant to see that rather than read it.
 */
export function tickPath(a: Point, b: Point, size: number): string {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  if (len === 0) return ''
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const px = (-dy / len) * size
  const py = (dx / len) * size
  return `M ${mid.x - px} ${mid.y - py} L ${mid.x + px} ${mid.y + py}`
}

/**
 * Which vertex a press was aiming at, or -1.
 *
 * The outline is the only place on this board a child can mean to touch, so a
 * press is read as the nearest corner rather than as a free point. A press with
 * no corner near it is not an attempt and is reported as none.
 */
export function nearestVertexIndex(p: Point, vertices: Point[]): number {
  let best = -1
  let bestGap = GRAB_TOLERANCE
  vertices.forEach((v, i) => {
    const gap = distance(p, v)
    if (gap < bestGap) {
      bestGap = gap
      best = i
    }
  })
  return best
}