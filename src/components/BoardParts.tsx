/**
 * Board pieces.
 *
 * Split out of CongruenceStage.tsx so the screen stays readable as a
 * description of what the child sees, and so each piece stands on its own.
 */

import { OverlapLayer } from './OverlapLayer'
import { pointsToPath } from './svgPath'
import { shapePoints } from '../geometry/pairs'
import { measureOverlap, polygonCentroid, touching } from '../geometry/overlap'
import type { BoardShape } from '../modes/useBoard'
import type { Point } from '../geometry/types'

/**
 * A confirmed pair, marked where they now lie.
 *
 * There is no line between them, because once a pair is confirmed they are
 * coincident and the line has zero length. It was drawn anyway with a dash
 * pattern, so a zero-length dashed line rendered as a short run of dots sitting
 * on the shape — on all five pairs. The tick alone says what happened.
 */
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

/**
 * The overlap between the held shape and whatever it is sitting on.
 *
 * This is the proof the child reads: a solid shared region grows as the two
 * coincide. Amber while they only partly agree, teal when they coincide.
 */
export function HeldOverlap({
  overlap,
}: {
  overlap: { intersection: Point[][]; contained: boolean } | null
}) {
  if (!overlap) return null
  return (
    <OverlapLayer intersection={overlap.intersection} coincident={overlap.contained} />
  )
}
/**
 * One shape on the board. Pressing it holds it.
 *
 * THE SHAPE IS DRAWN IN ITS OWN COORDINATES
 * -----------------------------------------
 * The outline is the shape's local vertices, and CSS moves it into place. It is
 * not the other way round.
 *
 * The earlier version recomputed absolute screen coordinates on every render and
 * drew those, so when the system turned a shape the path simply changed between
 * one frame and the next. There was nothing for a transition to animate: the
 * shape jumped from one angle to another with no indication that a turn had
 * happened at all, and the whole point of the stage is watching the turn.
 *
 * With the transform in CSS the browser interpolates it, so the shape swings
 * round. A quarter turn takes 600ms because that is long enough to follow with
 * a finger on the screen and short enough not to wait for.
 *
 * The label sits outside the transformed group. A syllable that spins with its
 * shape is no longer a name for it.
 */
export function BoardShapeView({
  item,
  held,
  dragging,
  onPointerDown,
}: {
  item: BoardShape
  held: boolean
  /** true while this shape is under the child's finger */
  dragging: boolean
  onPointerDown: (item: BoardShape, e: React.PointerEvent) => void
}) {
  const d = pointsToPath(item.shape.vertices)

  return (
    <g onPointerDown={(e) => onPointerDown(item, e)} style={{ cursor: 'grab', touchAction: 'none' }}>
      <g
        className={
          ['board-shape', dragging ? 'board-shape--dragging' : '', held ? 'board-shape--held' : '']
            .filter(Boolean)
            .join(' ')
        }
        style={{
          transform: `translate(${item.x}px, ${item.y}px) rotate(${item.rotation}deg) scale(${item.flipped ? -1 : 1}, 1)`,
        }}
      >
        {/* generous hit area, sized for a child's finger */}
        <path d={d} fill="transparent" stroke="transparent" strokeWidth={48} />
        <path
          d={d}
          fill={item.shape.color}
          fillOpacity={held ? 0.55 : 0.75}
          stroke={held ? '#023047' : '#1d3557'}
          strokeWidth={held ? 4.5 : 2.5}
          strokeLinejoin="round"
        />
        {held &&
          item.shape.vertices.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={6} fill="#023047" />)}
      </g>
      <text
        x={item.x}
        y={item.y + 82}
        fontSize={26}
        fontWeight={700}
        fill="#023047"
        textAnchor="middle"
        style={{ pointerEvents: 'none' }}
      >
        {item.label}
      </text>
    </g>
  )
}

/** Background grid: orientation only, not a snapping target. */
export function Grid({ width, height }: { width: number; height: number }) {
  const lines = []
  for (let x = 0; x <= width; x += 50) {
    lines.push(
      <line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke="#e2e9f0" strokeWidth={1} />,
    )
  }
  for (let y = 0; y <= height; y += 50) {
    lines.push(
      <line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke="#e2e9f0" strokeWidth={1} />,
    )
  }
  return <g>{lines}</g>
}
/**
 * Draws the region the held shape shares with the shape it is lying on.
 *
 * Pure presentation: the geometry is computed in the hook and handed over. The
 * colour carries the answer — amber while they only partly agree, teal when
 * they coincide — and there is deliberately no outline of its own, because the
 * shared region is cut from triangles and every attempt at outlining it drew
 * seams across the middle.
 *
 * The partner is the shape actually covered, not merely the first one with a
 * matching outline. A region drawn against a shape on the far side of the
 * board would show the child an overlap that is not there.
 */
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