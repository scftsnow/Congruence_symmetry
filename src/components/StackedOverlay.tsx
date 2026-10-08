/**
 * The region the held shape shares with the shape it is lying on.
 *
 * This is the proof the child reads: a solid shared region grows as the two
 * coincide.
 *
 * Pure presentation, with one exception that is worth stating: it picks the
 * partner. The partner is the shape actually covered, not merely the first one
 * with a matching outline — a region drawn against a shape on the far side of
 * the board would show the child an overlap that is not there. Everything after
 * that choice is handed over: the geometry is measured in the hook, and this only
 * draws the region it is given.
 *
 * The colour carries the answer — amber while they only partly agree, teal when
 * they coincide — and there is deliberately no outline of its own, because the
 * shared region is cut from triangles and every attempt at outlining it drew
 * seams across the middle.
 */

import type { BoardShape } from '../modes/useBoard'
import { shapePoints } from '../geometry/pairs'
import { measureOverlap, polygonCentroid, touching } from '../geometry/overlap'
import type { Point } from '../geometry/types'
import { OverlapLayer } from './OverlapLayer'

export function StackedOverlay({
  held,
  items,
}: {
  held: BoardShape
  items: BoardShape[]
}) {
  const heldPoints = shapePoints(held)
  const heldAt = polygonCentroid(heldPoints)

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

  return <OverlapLayer intersection={info.intersection} coincident={info.contained} />
}