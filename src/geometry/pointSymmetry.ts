/**
 * Point symmetry — which point turns a shape exactly onto itself.
 *
 * The mirror image of the line unit. There the child drew a line and watched the
 * shape fold along it; here the child taps a point and watches the shape turn
 * halfway round it. The direction of nothing is in question this time — a half
 * turn is a half turn — so what is judged is the middle alone: close enough to
 * the true one, and the copy lands exactly; anywhere else, and it visibly does
 * not.
 *
 * HOW A CENTER IS JUDGED
 * ----------------------
 * The true center is found, not declared: the middle of a point-symmetric figure
 * is the only point a half turn about it maps every corner onto a corner, and
 * for these outlines that point is the centroid. A tap counts when it falls
 * close to it; a tap off the figure entirely is a different kind of miss from a
 * wrong middle, and gets a different hint.
 *
 * NO FIGURES IN THE UI
 * --------------------
 * The tolerance below is in pixels because geometry has to be measured in
 * something. None of it reaches the screen: no length, no angle, no degree is
 * printed or spoken anywhere in this unit, for the same reason the overlap
 * percentage was removed from the congruence stage.
 */

import type { Point } from './types'
import { polygonCentroid } from './overlap'
import { distance, rotate180 } from './transforms'
import { CENTER_TOLERANCE, paddedBox } from './symmetry'
import { partnerIndexOf } from './symmetryParts'
import { POINT_SYMM_CENTER } from './pointSymmetryShapes'

/** A half turn about the middle proves it: close enough counts. */
/** How far a tap may fall from a corner and still count as aimed at the figure. */
export const TAP_TOLERANCE = 48
/** How far a vertex may sit from its true half-turn image and still be its partner. */
export const TURN_TOLERANCE = 2

/** The half-turn image of one point. */
export function turnOf(p: Point, center: Point): Point {
  return rotate180(p, center)
}

/** The middle a half turn about it would have to fix. */
export function pointCenterOf(vertices: Point[]): Point {
  return polygonCentroid(vertices)
}

/**
 * For every vertex, which vertex a half turn about the center sends it to.
 *
 * The same pairing question the line unit asks, with the other mirror: where
 * each corner lands, rather than which line it folds across.
 */
export function turnIndex(vertices: Point[], center: Point): number[] {
  return partnerIndexOf(vertices, (p) => turnOf(p, center))
}

/** Does some center turn this outline exactly onto itself. */
export function isPointSymmetric(vertices: Point[]): boolean {
  const center = pointCenterOf(vertices)
  return turnIndex(vertices, center).every((j, i) => {
    const image = turnOf(vertices[i], center)
    return distance(vertices[j], image) < TURN_TOLERANCE
  })
}

/**
 * The center of a point-symmetric figure, or null.
 *
 * Found by checking, not by trusting the middle: the centroid of any outline is
 * some point, and only a true center maps every corner onto a corner.
 */
export function symmetryCenterOf(vertices: Point[]): Point | null {
  if (!isPointSymmetric(vertices)) return null
  return pointCenterOf(vertices)
}

/**
 * Which true center a tapped point counts as, judged in the shape's own frame.
 *
 * The tap arrives in screen coordinates while the outline lives in its own, so
 * both are shifted once — and only once — into the same frame before anything
 * is measured. Shifting either twice moved the shape a whole screen away, which
 * is how the axis unit once answered every right line with "draw it on the
 * shape".
 */
export function judgeCenter(vertices: Point[], tap: Point): 'off' | 'miss' | 'hit' {
  const sub = (p: Point): Point => ({ x: p.x - POINT_SYMM_CENTER.x, y: p.y - POINT_SYMM_CENTER.y })
  const t = sub(tap)
  const box = paddedBox(vertices, 10)
  if (t.x < box.minX || t.x > box.maxX || t.y < box.minY || t.y > box.maxY) return 'off'
  const center = symmetryCenterOf(vertices)
  if (!center) return 'hit'
  return distance(t, center) <= CENTER_TOLERANCE ? 'hit' : 'miss'
}

/** The half turn as a CSS transform, so the browser interpolates it. */
export function turnTransform(center: Point, deg: number): string {
  const rounded = Math.round(deg * 1000) / 1000
  return (
    `translate(${center.x}px, ${center.y}px) ` +
    `rotate(${rounded}deg) ` +
    `translate(${-center.x}px, ${-center.y}px)`
  )
}
