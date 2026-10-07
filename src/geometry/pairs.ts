/**
 * Pair detection for the congruence board.
 *
 * Lives in geometry/ rather than in the hook so it can be tested with no
 * React and no state, which is the reason the layer boundary exists.
 *
 * A pair counts only when two conditions both hold:
 *   1. the shapes are congruent in outline and size
 *   2. they fully cover each other
 *
 * Condition 2 is not redundant. A small square resting exactly inside a
 * larger one is fully covered, so overlap alone would accept it, but the two
 * are not congruent. Both tests together are what separate "same shape" from
 * "same shape and size, stacked".
 */

import type { Point, Shape, Transform } from './types'
import { applyTransform } from './transforms'
import { checkCongruence, EPSILON_STACK } from './compare'
import { measureOverlap, polygonCentroid, touching } from './overlap'

export interface Matchable {
  id: string
  shape: Shape
  x: number
  y: number
  rotation: number
  flipped: boolean
}

/** Symmetric key, so (a,b) and (b,a) name the same pair. */
export function pairKey(a: string, b: string): string {
  return a < b ? a + '|' + b : b + '|' + a
}

export function transformOf(item: Matchable): Transform {
  return { cx: item.x, cy: item.y, rotation: item.rotation, flipped: item.flipped, scale: 1 }
}

export function shapePoints(item: Matchable): Point[] {
  return applyTransform(item.shape.vertices, transformOf(item))
}

/** Does this shape have the same outline and size as the reference? */
export function sameCongruence(a: Point[], b: Point[], canvasSize: number): boolean {
  return checkCongruence(a, b, EPSILON_STACK, canvasSize, false).isCongruent
}

/** Do the two shapes sit on top of each other completely? */
export function fullyCovered(a: Point[], b: Point[]): boolean {
  return measureOverlap(a, b).contained
}

export interface MatchedPair<T extends Matchable> {
  key: string
  a: T
  b: T
}

/** Every pair currently coincident on the board. */
export function findMatches<T extends Matchable>(
  items: T[],
  canvasSize: number,
): Array<MatchedPair<T>> {
  const out: Array<MatchedPair<T>> = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const pa = shapePoints(items[i])
      const pb = shapePoints(items[j])
      if (!sameCongruence(pa, pb, canvasSize)) continue
      if (!fullyCovered(pa, pb)) continue
      out.push({ key: pairKey(items[i].id, items[j].id), a: items[i], b: items[j] })
    }
  }
  return out
}

/**
 * The overlap between a held shape and a same-outline partner, or null.
 *
 * Only shapes with a matching outline are considered: an intersection with a
 * differently shaped figure would be discarded anyway, and the child gains
 * nothing from a region that can never become a match.
 */
export function heldOverlap<T extends Matchable>(
  held: T,
  items: T[],
): { intersection: Point[][]; agreement: number; contained: boolean } | null {
  const heldPoints = shapePoints(held)
  const heldAt = polygonCentroid(heldPoints)

  // The partner is the shape the child has actually brought this one to, which
  // is a question about position. Choosing by outline instead would report an
  // overlap against a shape on the far side of the board.
  let best: { points: Point[]; near: number } | null = null
  for (const other of items) {
    if (other.id === held.id) continue
    const otherPoints = shapePoints(other)
    if (!touching(heldPoints, otherPoints)) continue

    const otherAt = polygonCentroid(otherPoints)
    const near = Math.hypot(heldAt.x - otherAt.x, heldAt.y - otherAt.y)
    if (!best || near < best.near) best = { points: otherPoints, near }
  }
  if (!best) return null

  const info = measureOverlap(heldPoints, best.points)
  if (!info.intersection) return null
  return { intersection: info.intersection, agreement: info.agreement, contained: info.contained }
}