/**
 * The center board drawn — one shape, and the copy turning about the drag.
 *
 * Pure presentation. It is handed the snapped middle, which way the drag
 * steered it, and whether the turn has landed, and it decides nothing — the
 * verdict already happened in the hook, so there is no judgement here to get
 * wrong. While the finger is down its gesture previews as a dashed line, the
 * same language as the axis board's preview.
 *
 * ONE PAPER TURNING, NEVER TWO
 * -----------------------------
 * The copy is drawn only while a middle is under discussion. The moment the
 * finger lifts with no drag, there is nothing turning and the shape stands
 * alone — drawing a copy beside it unasked would show two papers where there is
 * one.
 */

import { useMemo, useRef } from 'react'
import { turnTransform } from '../geometry/pointSymmetry'
import type { PointSymmetryItem } from '../geometry/pointSymmetryShapes'
import { POINT_SYMM_CENTER } from '../geometry/pointSymmetryShapes'
import { applyTransform, identity } from '../geometry/transforms'
import type { Point } from '../geometry/types'
import { pointsToPath } from './svgPath'
import { Grid } from './BoardGrid'
import { Celebration } from './Celebration'

const W = 1100
const H = 600

export function CenterScene({
  shape,
  tapped,
  direction,
  draft,
  turned,
  justFound,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
}: {
  shape: PointSymmetryItem
  /** the snapped middle under discussion, if one has been drawn */
  tapped: Point | null
  /** clockwise or back: the drag's direction, and nothing else about it */
  direction: 1 | -1
  /** the finger's gesture before it snaps, while it is being drawn */
  draft: { p: Point; q: Point } | null
  /** the turn has landed */
  turned: boolean
  /** true just after something worth celebrating */
  justFound: boolean
  onDrawStart: (p: Point) => void
  onDrawMove: (p: Point) => void
  onDrawEnd: () => void
}) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const placed = useMemo(
    () => applyTransform(shape.shape.vertices, identity(POINT_SYMM_CENTER.x, POINT_SYMM_CENTER.y)),
    [shape],
  )

  const toCanvas = (clientX: number, clientY: number): Point => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const vb = svg.viewBox.baseVal
    return {
      x: ((clientX - rect.left) / rect.width) * vb.width,
      y: ((clientY - rect.top) / rect.height) * vb.height,
    }
  }

  return (
    <svg
      ref={svgRef}
      className="canvas"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="점대칭 도형"
      onPointerDown={(e) => {
        e.preventDefault()
        onDrawStart(toCanvas(e.clientX, e.clientY))
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
      }}
      onPointerMove={(e) => onDrawMove(toCanvas(e.clientX, e.clientY))}
      onPointerUp={onDrawEnd}
      onPointerCancel={onDrawEnd}
    >
      <Grid width={W} height={H} />

      <path className="sym-shape" d={pointsToPath(placed)} fill={shape.shape.color} />

      {/* the copy turning about whatever was drawn, steered by the drag */}
      {tapped && (
        <g
          className="sym-turn"
          style={{ transform: turnTransform(tapped, turned ? 180 * direction : 0) }}
        >
          <path className="sym-shape sym-shape--fold" d={pointsToPath(placed)} fill={shape.shape.color} />
        </g>
      )}
      {tapped && <circle className="sym-hub" cx={tapped.x} cy={tapped.y} r={10} />}

      {draft && (
        <line className="sym-draft" x1={draft.p.x} y1={draft.p.y} x2={draft.q.x} y2={draft.q.y} />
      )}
      {justFound && <Celebration x={550} y={300} />}
    </svg>
  )
}
