/**
 * The facts board drawn — one shape, its axis, and the marks that are the claims.
 *
 * The right angle and the equal-length ticks are the whole lesson here, so they
 * are drawn here and nowhere else: a claim the child cannot see is a claim they
 * are told. Nothing on this board prints a length or an angle, because a number
 * a child cannot make with their own hands is one they can only be told, and
 * degrees belong to a later unit in fifth grade.
 */

import { useMemo, useRef } from 'react'
import { pointsToPath } from './svgPath'
import { Grid } from './BoardGrid'
import { Celebration } from './Celebration'
import { footOnAxis, rightAnglePath, tickPath } from '../geometry/symmetryParts'
import type { Line } from '../geometry/symmetryParts'
import type { Point } from '../geometry/types'

const W = 1100
const H = 600
/** the side of the right-angle square, and the half-length of an equal tick */
const MARK = 18

export function SymmetryFactsScene({
  vertices,
  axis,
  color,
  draft,
  joined,
  spanned,
  waitingOn,
  resolved,
  justFound,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
}: {
  vertices: Point[]
  axis: Line
  color: string
  /** the finger's line, while it is being drawn */
  draft: { p: Point; q: Point } | null
  /** the pair that has been joined, as two corner indices */
  joined: [number, number] | null
  /** the corners spanned to the axis */
  spanned: number[]
  /** the corner whose partner must be spanned next */
  waitingOn: number | null
  resolved: boolean
  justFound: boolean
  onDrawStart: (p: Point) => void
  onDrawMove: (p: Point) => void
  onDrawEnd: () => void
}) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const corners = useMemo(() => vertices.map((v, i) => ({ v, i })), [vertices])

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

  /*
   * A tick is only a claim of equality once there are two spans to compare.
   *
   * The first span carries none: a single mark on a single line says nothing
   * about length, and showing one there would promise a comparison that has not
   * been made yet.
   */
  const compared = resolved && spanned.length >= 2

  return (
    <svg
      ref={svgRef}
      className="canvas"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="대칭축과 마주 보는 점"
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

      <path className="sym-shape" d={pointsToPath(vertices)} fill={color} />
      <line className="sym-axis sym-axis--given" x1={axis.a.x} y1={axis.a.y} x2={axis.b.x} y2={axis.b.y} />

      {corners.map(({ v, i }) => (
        <circle
          key={i}
          className={i === waitingOn ? 'sym-corner sym-corner--wait' : 'sym-corner'}
          cx={v.x}
          cy={v.y}
          r={8}
        />
      ))}

      {/* the segment joining the pair, and the square that names what it is */}
      {joined && (
        <g className="sym-proved">
          <line
            className="sym-join"
            x1={vertices[joined[0]].x}
            y1={vertices[joined[0]].y}
            x2={vertices[joined[1]].x}
            y2={vertices[joined[1]].y}
          />
          <path
            className="sym-right"
            d={rightAnglePath(
              footOnAxis(vertices[joined[0]], axis),
              axis,
              vertices[joined[0]],
              MARK,
            )}
          />
        </g>
      )}

      {/* the spans to the axis, each with a tick once there are two to compare */}
      {spanned.map((i) => {
        const foot = footOnAxis(vertices[i], axis)
        return (
          <g key={`sp${i}`} className="sym-proved">
            <line className="sym-span" x1={vertices[i].x} y1={vertices[i].y} x2={foot.x} y2={foot.y} />
            {compared && <path className="sym-tick" d={tickPath(vertices[i], foot, MARK)} />}
          </g>
        )
      })}

      {draft && (
        <line className="sym-draft" x1={draft.p.x} y1={draft.p.y} x2={draft.q.x} y2={draft.q.y} />
      )}
      {justFound && <Celebration x={550} y={300} />}
    </svg>
  )
}