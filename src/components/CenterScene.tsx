/**
 * The center board drawn — one shape, and the copy turning about the tap.
 *
 * Pure presentation. It is handed the tapped middle and whether the turn has
 * landed, and it decides nothing — the verdict already happened in the hook, so
 * there is no judgement here to get wrong.
 *
 * ONE PAPER TURNING, NEVER TWO
 * -----------------------------
 * The copy is drawn only while a middle is under discussion. The moment the
 * finger lifts with nowhere tapped, there is nothing turning and the shape
 * stands alone — drawing a copy beside it unasked would show two papers where
 * there is one.
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
  turned,
  justFound,
  onTap,
}: {
  shape: PointSymmetryItem
  /** the tapped middle under discussion, if one has been tapped */
  tapped: Point | null
  /** the turn has landed */
  turned: boolean
  /** true just after something worth celebrating */
  justFound: boolean
  onTap: (p: Point) => void
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
        onTap(toCanvas(e.clientX, e.clientY))
      }}
    >
      <Grid width={W} height={H} />

      <path className="sym-shape" d={pointsToPath(placed)} fill={shape.shape.color} />

      {/* the copy turning about whatever was tapped */}
      {tapped && (
        <g
          className="sym-turn"
          style={{ transform: turnTransform(tapped, turned ? 180 : 0) }}
        >
          <path className="sym-shape sym-shape--fold" d={pointsToPath(placed)} fill={shape.shape.color} />
        </g>
      )}
      {tapped && <circle className="sym-hub" cx={tapped.x} cy={tapped.y} r={10} />}

      {justFound && <Celebration x={550} y={300} />}
    </svg>
  )
}
