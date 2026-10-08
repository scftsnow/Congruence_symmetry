/**
 * Correspondence — which point, side and angle of one shape matches which of
 * another.
 *
 * WHY THIS EXISTS
 * ---------------
 * Congruence says two shapes coincide. Correspondence says which part of one
 * lands on which part of the other, and that is a different and harder thing
 * to see. A child can watch two shapes overlap and still not know that this
 * corner is the one that met that corner.
 *
 * The textbook order is points, then sides, then angles, and the point is that
 * each follows from the last: once the corners are paired, the sides between
 * paired corners are the corresponding sides, and the angles at paired
 * corners are the corresponding angles.
 *
 * HOW CORRESPONDENCE IS DEFINED HERE
 * ----------------------------------
 * Shape B is shape A after a transform — a rotation, a mirror, a move. So the
 * correspondence is fixed by construction rather than discovered: vertex i of
 * A is the point that lands on vertex i of B.
 *
 * That is the honest way to build this. Asking the child to find a
 * correspondence between two independently drawn shapes would mean the answer
 * was already decided by how the shapes were drawn, and the child would be
 * guessing at the drawer's intent rather than reading the shapes.
 *
 * WHAT THIS COMPUTES
 * ------------------
 *   vertices : vertex i of A ↔ vertex i of B
 *   sides    : side i of A (vertex i to vertex i+1) ↔ side i of B
 *   angles   : the angle at vertex i of A ↔ the angle at vertex i of B
 *
 * The angle is stored as its vertex and its two neighbours, which is all the
 * renderer needs to draw the arc and all the animator needs to move it.
 */

import type { Point } from './types'

/** An angle, by the corner it sits at and the two corners either side of it. */
export interface Angle {
  vertex: Point
  prev: Point
  next: Point
}

export interface Correspondence {
  vertices: Array<{ a: Point; b: Point }>
  sides: Array<{ a: [Point, Point]; b: [Point, Point] }>
  angles: Array<{ a: Angle; b: Angle }>
}

/**
 * The correspondence between two congruent shapes.
 *
 * @param a vertices of the first shape, in outline order
 * @param b vertices of the second, which is `a` after some transform
 */
export function correspondence(a: Point[], b: Point[]): Correspondence {
  const n = a.length
  if (n !== b.length) {
    throw new Error(`correspondence needs two shapes with the same number of vertices, got ${n} and ${b.length}`)
  }

  const vertices = a.map((pa, i) => ({ a: pa, b: b[i] }))

  const sides = a.map((pa, i) => {
    const j = (i + 1) % n
    return { a: [pa, a[j]] as [Point, Point], b: [b[i], b[j]] as [Point, Point] }
  })

  const angles = a.map((pa, i) => ({
    a: { vertex: pa, prev: a[(i - 1 + n) % n], next: a[(i + 1) % n] },
    b: { vertex: b[i], prev: b[(i - 1 + n) % n], next: b[(i + 1) % n] },
  }))

  return { vertices, sides, angles }
}

/**
 * The arc that marks an angle, as an SVG path.
 *
 * A sector of a circle centred on the corner, running from one ray to the
 * other. Drawn as a wedge rather than a bare arc so the angle reads as a
 * region the child can compare, which is what "same size" means.
 *
 * The sweep flag follows the sign of the turn between the rays, so this works
 * for a shape wound either way round and for a concave corner.
 */
export function angleWedge(angle: Angle, radius: number): string {
  const { vertex, prev, next } = angle

  const a1 = Math.atan2(prev.y - vertex.y, prev.x - vertex.x)
  const a2 = Math.atan2(next.y - vertex.y, next.x - vertex.x)

  const p1 = { x: vertex.x + radius * Math.cos(a1), y: vertex.y + radius * Math.sin(a1) }
  const p2 = { x: vertex.x + radius * Math.cos(a2), y: vertex.y + radius * Math.sin(a2) }

  let diff = a2 - a1
  while (diff <= -Math.PI) diff += 2 * Math.PI
  while (diff > Math.PI) diff -= 2 * Math.PI

  const largeArc = Math.abs(diff) > Math.PI ? 1 : 0
  const sweep = diff > 0 ? 1 : 0

  return [
    `M ${vertex.x} ${vertex.y}`,
    `L ${p1.x} ${p1.y}`,
    `A ${radius} ${radius} 0 ${largeArc} ${sweep} ${p2.x} ${p2.y}`,
    'Z',
  ].join(' ')
}

/**
 * The transform that carries one angle onto its corresponding angle.
 *
 * This is what makes the comparison visible. The wedge is drawn at the first
 * angle, then this transform moves it onto the second, and because the two
 * angles are the same size it lands exactly. The child watches the angle from
 * one shape travel and fit the other, which is a stronger claim than being
 * told the two numbers match.
 *
 * WHY IT LINES UP ON THE BISECTOR, NOT ON A RAY
 * ----------------------------------------------
 * The obvious move is to rotate until one ray lands on its partner. That works
 * for a rotated pair and silently fails for a mirrored one, because a reflection
 * is not a rotation: the turn from the first ray round to the second goes the
 * other way round in the mirror image. Aligning one ray then leaves the wedge
 * mirrored, and it arrives looking as though it does not fit — on the one pair
 * where the child most needs to see that it does.
 *
 * A wedge is symmetric about its own bisector, so turning the bisector onto the
 * other bisector puts the whole region exactly on top, mirrored pair or not. The
 * bisector is the mean of the two ray directions taken the short way round,
 * which for a convex corner is the middle of the interior angle.
 */
export function angleTransform(from: Angle, to: Angle): string {
  const bisector = (angle: Angle) => {
    const a1 = Math.atan2(angle.prev.y - angle.vertex.y, angle.prev.x - angle.vertex.x)
    const a2 = Math.atan2(angle.next.y - angle.vertex.y, angle.next.x - angle.vertex.x)
    return a1 + normalize(a2 - a1) / 2
  }

  const rotation = normalize(bisector(to) - bisector(from))
  return `translate(${to.vertex.x}px, ${to.vertex.y}px) rotate(${deg(rotation)}deg) translate(${-from.vertex.x}px, ${-from.vertex.y}px)`
}

/**
 * The transform that carries one side onto its corresponding side.
 *
 * Same idea as angleTransform, for a line. The side is drawn at the first
 * position and this moves it onto the second, where it lies exactly along the
 * corresponding side — the two have the same length, which is the point.
 *
 * Turning the first end onto the first end and the heading onto the heading is
 * enough here, mirror or no mirror: two equal-length vectors always differ by a
 * rotation, whatever it was that did the moving.
 */
export function sideTransform(from: [Point, Point], to: [Point, Point]): string {
  const heading = (side: [Point, Point]) =>
    Math.atan2(side[1].y - side[0].y, side[1].x - side[0].x)

  const rotation = normalize(heading(to) - heading(from))
  return `translate(${to[0].x}px, ${to[0].y}px) rotate(${deg(rotation)}deg) translate(${-from[0].x}px, ${-from[0].y}px)`
}

/** Fold an angle into (-π, π]. */
function normalize(angle: number): number {
  let a = angle
  while (a <= -Math.PI) a += 2 * Math.PI
  while (a > Math.PI) a -= 2 * Math.PI
  return a
}

/**
 * Degrees, with the arithmetic noise taken off.
 *
 * The transform string is read by people as well as by the browser, and a
 * `90.00000000000001deg` in it is both noise and a distraction. Two decimals is
 * far finer than one pixel on this canvas.
 */
function deg(radians: number): number {
  return Math.round(((radians * 180) / Math.PI) * 100) / 100
}
