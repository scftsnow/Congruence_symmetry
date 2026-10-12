/**
 * The picture of one shape and the line across it.
 *
 * A single shape in the middle, the child's line over it, and a copy of the
 * shape that folds along that line. Nothing here is decided — the hook owns the
 * axis, the fold and the verdict, and this only draws what it is handed.
 *
 * THE FOLD IS A MIRROR IN MOTION
 * ------------------------------
 * The folding copy is the whole shape with a CSS transform that interpolates
 * its across-axis scale from 1 to -1. Halfway it lies flat on the axis; at the
 * end it is the mirror image. That is what makes the motion read as paper
 * folding rather than as one picture fading into another — and it is why the
 * landing proves the claim: on a true axis the copy settles exactly onto the
 * base shape, and on any other line it visibly does not.
 *
 * The axis is drawn edge to edge, not as the segment the finger drew. A segment
 * would make "the axis" look like something with ends, and its ends are wherever
 * the finger stopped, which is nothing to do with the answer.
 */

import { useRef } from 'react'
import { extendAxisToRect, foldTransform } from '../geometry/symmetry'
import type { Axis } from '../geometry/symmetry'
import { SYMM_CENTER } from '../geometry/symmetryShapes'
import { applyTransform, identity } from '../geometry/transforms'
import type { Point, Shape } from '../geometry/types'
import { pointsToPath } from './svgPath'
import { Celebration } from './Celebration'
import { Grid } from './BoardGrid'

const W = 1100
const H = 600

export function SymmetryScene({
  shape,
  axis,
  draft,
  folded,
  justFound,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
}: {
  shape: Shape
  /** the snapped axis, once the finger has left */
  axis: Axis | null
  /** the finger's line, while it is being drawn */
  draft: { p: Point; q: Point } | null
  /** the fold has landed */
  folded: boolean
  /** true just after something worth celebrating */
  justFound: boolean
  onDrawStart: (p: Point) => void
  onDrawMove: (p: Point) => void
  onDrawEnd: () => void
}) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const placed = applyTransform(shape.vertices, identity(SYMM_CENTER.x, SYMM_CENTER.y))
  const shown = axis ? extendAxisToRect(axis, W, H) : null

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
      aria-label="선대칭 도형"
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

      <path className="sym-shape" d={pointsToPath(placed)} fill={shape.color} />

      {axis && (
        <g
          className="sym-fold"
          style={{ transform: foldTransform(axis, folded ? -1 : 1) }}
        >
          <path className="sym-shape sym-shape--fold" d={pointsToPath(placed)} fill={shape.color} />
        </g>
      )}

      {shown && (
        <line
          className="sym-axis"
          x1={shown.a.x}
          y1={shown.a.y}
          x2={shown.b.x}
          y2={shown.b.y}
        />
      )}
      {draft && (
        <line
          className="sym-draft"
          x1={draft.p.x}
          y1={draft.p.y}
          x2={draft.q.x}
          y2={draft.q.y}
        />
      )}

      {justFound && <Celebration x={SYMM_CENTER.x} y={SYMM_CENTER.y} />}
    </svg>
  )
}
