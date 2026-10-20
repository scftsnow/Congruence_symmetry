/**
 * The center board drawn — one shape, and the copy steered by the hand.
 *
 * Pure presentation. It is handed the tapped middle, where the copy stands
 * about it, and whether the finger is still down, and it decides nothing — the
 * verdict already happened in the hook, so there is no judgement here to get
 * wrong. While the finger is down its gesture previews as a dashed line, the
 * same language as the axis board's preview, and the copy tracks the finger
 * with no transition: an animated position under a moving finger lags behind
 * it, which would leave the child turning something that was not under their
 * thumb.
 *
 * ONE PAPER TURNING, NEVER TWO
 * -----------------------------
 * The copy is drawn only while a middle is under discussion. The moment the
 * finger lifts with no drag, the middle is placed and the copy stands exactly
 * where the shape stands — drawing it elsewhere unasked would show two papers
 * where there is one.
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
  rotation,
  dragging,
  draft,
  justFound,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
}: {
  shape: PointSymmetryItem
  /** the middle under discussion, if one has been tapped */
  tapped: Point | null
  /** where the copy stands about the middle, in degrees */
  rotation: number
  /** the finger is down: the copy tracks it exactly, with no transition */
  dragging: boolean
  /** the finger's gesture before it steers, while it is being drawn */
  draft: { p: Point; q: Point } | null
  /** true just after something worth celebrating */
  justFound: boolean
  onDrawStart: (p: Point) => void
  onDrawMove: (p: Point) => void
  onDrawEnd: (up: Point | null) => void
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
      onPointerUp={(e) => onDrawEnd(toCanvas(e.clientX, e.clientY))}
      onPointerCancel={() => onDrawEnd(null)}
    >
      <Grid width={W} height={H} />

      <path className="sym-shape" d={pointsToPath(placed)} fill={shape.shape.color} />

      {/* the copy steered about the tapped middle, following the hand */}
      {tapped && (
        <g
          className={dragging ? 'sym-turn sym-turn--live' : 'sym-turn'}
          style={{ transform: turnTransform(tapped, rotation) }}
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
