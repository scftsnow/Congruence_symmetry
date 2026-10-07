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

/** A confirmed pair, tied together so the child can see what they found. */
export function PairMark({ a, b }: { a: BoardShape; b: BoardShape }) {
  const cx = (a.x + b.x) / 2
  const cy = (a.y + b.y) / 2
  return (
    <g pointerEvents="none">
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke="#2a9d8f"
        strokeWidth={4}
        strokeDasharray="14 9"
        strokeLinecap="round"
        opacity={0.75}
      />
      <circle cx={cx} cy={cy} r={20} fill="#2a9d8f" />
      <text x={cx} y={cy + 8} fontSize={24} fontWeight={700} fill="#fff" textAnchor="middle">
        ✓
      </text>
    </g>
  )
}

/**
 * The overlap between the held shape and whatever it is sitting on.
 *
 * This is the proof the child reads: a solid shared region grows as the two
 * coincide, and the coverage bar reports the percentage. Dashed means
 * partial, solid means complete.
 */
/**
 * Draws the shared region between the held shape and a matching shape.
 *
 * Pure presentation: the geometry is computed in useBoard and handed over.
 * A solid region with a solid outline means complete coincidence; a dashed
 * outline means partial, so the child can see there is still work to do.
 */
export function HeldOverlap({
  overlap,
}: {
  overlap: { intersection: Point[][]; agreement: number; contained: boolean } | null
}) {
  if (!overlap) return null
  return (
    <OverlapLayer
      intersection={overlap.intersection}
      agreement={overlap.agreement}
      coincident={overlap.contained}
    />
  )
}
/** One shape on the board. Pressing it holds it. */
export function BoardShapeView({
  item,
  held,
  onPointerDown,
}: {
  item: BoardShape
  held: boolean
  onPointerDown: (item: BoardShape, e: React.PointerEvent) => void
}) {
  const pts = shapePoints(item)
  return (
    <g
      onPointerDown={(e) => onPointerDown(item, e)}
      style={{ cursor: 'grab', touchAction: 'none' }}
    >
      {/* generous hit area, sized for a child's finger */}
      <path d={pointsToPath(pts)} fill="transparent" stroke="transparent" strokeWidth={48} />
      <path
        d={pointsToPath(pts)}
        fill={item.shape.color}
        fillOpacity={held ? 0.55 : 0.75}
        stroke={held ? '#023047' : '#1d3557'}
        strokeWidth={held ? 4.5 : 2.5}
        strokeLinejoin="round"
      />
      {held && pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={6} fill="#023047" />)}
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
 * Pure presentation: the geometry is computed in the hook and handed over. A
 * solid region with a solid outline means complete coincidence; a dashed one
 * means partial, so the child can see there is still work to do.
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

  return (
    <OverlapLayer
      intersection={info.intersection}
      agreement={info.agreement}
      coincident={info.contained}
    />
  )
}