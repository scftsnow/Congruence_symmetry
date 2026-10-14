/**
 * The picture of one shape and the line across it.
 *
 * A single shape in the middle, the child's line over it, and a copy of the
 * shape that folds along that line. Nothing here is decided — the hook owns the
 * axis, the fold and the verdict, and this only draws what it is handed.
 *
 * THE FOLD IS ONE HALF IN MOTION
 * ------------------------------
 * The folding copy is the half on one side of the axis, with a CSS transform
 * that interpolates its across-axis scale from 1 to -1. Halfway it lies flat on
 * the axis; at the end it is the mirror image. The other half never moves, and
 * it is the still half that makes the motion read as paper folding rather than
 * as one picture flipping over. The landing proves the claim: on a true axis the
 * travelling half settles exactly onto the still one, and on any other line it
 * visibly does not.
 *
 * The axis is drawn edge to edge, not as the segment the finger drew. A segment
 * would make "the axis" look like something with ends, and its ends are wherever
 * the finger stopped, which is nothing to do with the answer.
 */

import { useMemo, useRef } from 'react'
import { extendAxisToRect, foldTransform, splitByAxis } from '../geometry/symmetry'
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
  const placed = useMemo(
    () => applyTransform(shape.vertices, identity(SYMM_CENTER.x, SYMM_CENTER.y)),
    [shape],
  )
  const shown = axis ? extendAxisToRect(axis, W, H) : null
  /*
   * One half stays, the other folds.
   *
   * Folding the whole outline squashed both halves toward the axis at once,
   * which read as the shape flipping over rather than as paper folding. Paper
   * has a half that does not move, and it is the still half that makes the
   * travelling half read as travelling.
   */
  const halves = useMemo(() => (axis ? splitByAxis(placed, axis) : null), [axis, placed])

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

      {/*
       * One paper, never two.
       *
       * The full outline is drawn only while no axis exists. The moment a line
       * is drawn it is replaced by its two halves: the still one and the one
       * about to travel. Drawing the full shape underneath as well would show
       * the moving half twice — once where it was and once where it is going —
       * which reads as the paper splitting in two. At s = 1 the halves recompose
       * the whole exactly, so the swap itself is invisible.
       */}
      {!axis ? (
        <path className="sym-shape" d={pointsToPath(placed)} fill={shape.color} />
      ) : (
        halves && (
          <>
            {halves.stay.length >= 3 && (
              <path className="sym-shape" d={pointsToPath(halves.stay)} fill={shape.color} />
            )}
            {halves.fold.length >= 3 && (
              <g
                className="sym-fold"
                style={{ transform: foldTransform(axis, folded ? -1 : 1) }}
              >
                <path className="sym-shape sym-shape--fold" d={pointsToPath(halves.fold)} fill={shape.color} />
              </g>
            )}
          </>
        )
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
