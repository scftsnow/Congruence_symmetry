/**
 * A confirmed pair, marked where they now lie.
 *
 * There is no line between them, because once a pair is confirmed they are
 * coincident and the line has zero length. It was drawn anyway with a dash
 * pattern, so a zero-length dashed line rendered as a short run of dots sitting
 * on the shape — on all five pairs. The tick alone says what happened.
 */

import type { BoardShape } from '../modes/useBoard'
import { shapePoints } from '../geometry/pairs'
import { polygonCentroid } from '../geometry/overlap'

export function PairMark({ a, b }: { a: BoardShape; b: BoardShape }) {
  // The centre of where they actually lie, which is the centroid of the region
  // they share rather than the average of two placements that are now identical.
  const cx = (polygonCentroid(shapePoints(a)).x + polygonCentroid(shapePoints(b)).x) / 2
  const cy = (polygonCentroid(shapePoints(a)).y + polygonCentroid(shapePoints(b)).y) / 2

  return (
    <g pointerEvents="none">
      <circle cx={cx} cy={cy} r={22} fill="#2a9d8f" />
      <text x={cx} y={cy + 9} fontSize={26} fontWeight={700} fill="#fff" textAnchor="middle">
        ✓
      </text>
    </g>
  )
}