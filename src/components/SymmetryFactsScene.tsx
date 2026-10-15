/**
 * The facts board drawn — one shape, its axis, and the two facts arriving.
 *
 * The child joins one pair of corresponding points, and then the board shows
 * what that joining proves: first the square where the segment meets the axis,
 * then each span folding across onto its partner, all three pairs in turn. Each
 * mark grows in with its sentence, because the sentence names what was just
 * seen arriving.
 *
 * The travelling span is the correspondence unit's flying part, not a copy of
 * it: the move is the same fold the axis board folds along, handed in as a
 * transform, and one span becoming the other is what "the same distance" means.
 *
 * Nothing on this board prints a length or an angle, because a number a child
 * cannot make with their own hands is one they can only be told, and degrees
 * belong to a later unit in fifth grade.
 */

import { useMemo, useRef } from 'react'
import { pointsToPath } from './svgPath'
import { Grid } from './BoardGrid'
import { Celebration } from './Celebration'
import { CorrFly } from './CorrFly'
import { foldTransform } from '../geometry/symmetry'
import { footOnAxis, rightAnglePath, tickPath } from '../geometry/symmetryParts'
import type { Line, MirrorPairs } from '../geometry/symmetryParts'
import type { Point } from '../geometry/types'
import type { FactsStage } from '../modes/useSymmetryFacts'

const W = 1100
const H = 600
/** the side of the right-angle square, and the half-length of an equal tick */
const MARK = 18

export function SymmetryFactsScene({
  vertices,
  axis,
  color,
  stage,
  pairs,
  equalStep,
  landed,
  draft,
  joined,
  justFound,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
}: {
  vertices: Point[]
  axis: Line
  color: string
  stage: FactsStage
  /** every corresponding pair — each takes the trip in turn */
  pairs: MirrorPairs
  /** which pair's span is travelling */
  equalStep: number
  /** the span has landed on its partner */
  landed: boolean
  /** the finger's line, while it is being drawn */
  draft: { p: Point; q: Point } | null
  /** the pair that has been joined, as two corner indices */
  joined: [number, number] | null
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

  /* The pair now proving the second fact: its segment, and each end's span. */
  const [pa, pb] = pairs.points[Math.min(equalStep, pairs.points.length - 1)] ?? [0, 0]
  const fa = footOnAxis(vertices[pa], axis)
  const fb = footOnAxis(vertices[pb], axis)

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
        <circle key={i} className="sym-corner" cx={v.x} cy={v.y} r={8} />
      ))}

      {/* the segment joining the pair, drawn by the child */}
      {joined && (
        <line
          className="sym-join"
          x1={vertices[joined[0]].x}
          y1={vertices[joined[0]].y}
          x2={vertices[joined[1]].x}
          y2={vertices[joined[1]].y}
        />
      )}

      {/* the square where the segment meets the axis: the first fact */}
      {joined && stage !== 'join' && (
        <path
          key={`sq-${joined[0]}-${joined[1]}`}
          className="sym-right sym-in"
          d={rightAnglePath(
            footOnAxis(vertices[joined[0]], axis),
            axis,
            vertices[joined[0]],
            MARK,
          )}
        />
      )}

      {/* one span becoming the other: the second fact, every pair in turn */}
      {stage === 'equal' && (
        <g>
          <line
            className="sym-join"
            x1={vertices[pa].x}
            y1={vertices[pa].y}
            x2={vertices[pb].x}
            y2={vertices[pb].y}
          />
          <CorrFly
            key={`fly-${pa}-${pb}`}
            part={{
              kind: 'side',
              a: [vertices[pa], fa],
              b: [vertices[pb], fb],
            }}
            landed={landed}
            move={foldTransform({ a: axis.a, b: axis.b }, -1)}
          />
          {landed && (
            <g className="sym-proved sym-in">
              <path className="sym-tick" d={tickPath(vertices[pa], fa, MARK)} />
              <path className="sym-tick" d={tickPath(vertices[pb], fb, MARK)} />
            </g>
          )}
        </g>
      )}

      {draft && (
        <line className="sym-draft" x1={draft.p.x} y1={draft.p.y} x2={draft.q.x} y2={draft.q.y} />
      )}
      {justFound && <Celebration x={550} y={300} />}
    </svg>
  )
}