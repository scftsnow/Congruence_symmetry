/**
 * The facts board drawn — one shape, its middle, and the two facts arriving.
 *
 * The child joins one pair of corresponding points, and then the board shows
 * what that joining proves: first the middle landing on the segment, then one
 * span travelling about the middle onto its partner. Joined pairs stay on screen
 * with their middles, so the rounds add up where the child can see them. Each
 * mark grows in with its sentence, because the sentence names what was just
 * seen arriving.
 *
 * THE FIGURE STAYS, ONE SPAN TRAVELS
 * ------------------------------------
 * The second fact is proved the way the line unit proves it: the figure never
 * moves, and one span lifts off, turns halfway round the middle and lands
 * exactly on the other — one span becoming the other is what "the same
 * distance" means.
 */

import { useRef } from 'react'
import { pointsToPath } from './svgPath'
import { clientToCanvas } from './canvasPoint'
import { Grid } from './BoardGrid'
import { Celebration } from './Celebration'
import { CorrFly } from './CorrFly'
import { tickPath } from '../geometry/symmetryParts'
import { turnTransform } from '../geometry/pointSymmetry'
import type { MirrorPairs } from '../geometry/symmetryParts'
import type { Point } from '../geometry/types'
import type { PointFactsStage } from '../modes/usePointSymmetryFacts'

const W = 1100
const H = 600
const MARK = 16

export function PointFactsScene({
  vertices,
  center,
  stage,
  pairs,
  current,
  landed,
  draft,
  joinedList,
  justFound,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
}: {
  vertices: Point[]
  center: Point
  stage: PointFactsStage
  /** every corresponding pair — one round each */
  pairs: MirrorPairs
  /** which pair's round is running, as an index into the pairs */
  current: number
  /** the span has landed on its partner */
  landed: boolean
  /** the finger's line, while it is being drawn */
  draft: { p: Point; q: Point } | null
  /** every pair joined so far, staying on screen as the rounds add up */
  joinedList: Array<[number, number]>
  justFound: boolean
  onDrawStart: (p: Point) => void
  onDrawMove: (p: Point) => void
  onDrawEnd: () => void
}) {
  const svgRef = useRef<SVGSVGElement | null>(null)

  const toCanvas = (clientX: number, clientY: number): Point => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    return clientToCanvas(svg, clientX, clientY)
  }

  /* The pair now proving the second fact: each end's span to the middle —
   * the one that travels, and the one it lands on. */
  const [pa, pb] = pairs.points[Math.min(current, pairs.points.length - 1)] ?? [0, 0]

  return (
    <svg
      ref={svgRef}
      className="canvas"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="대칭의 중심과 마주 보는 점"
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

      <path className="sym-shape" d={pointsToPath(vertices)} fill="#bde0fe" />

      {/* every pair joined so far, each proving the middle once more */}
      {joinedList.map(([a, b]) => (
        <line
          key={`jd-${a}-${b}`}
          className="sym-join sym-draw sym-proved"
          pathLength={1}
          x1={vertices[a].x}
          y1={vertices[a].y}
          x2={vertices[b].x}
          y2={vertices[b].y}
        />
      ))}
      <circle className="sym-hub sym-hub--given" cx={center.x} cy={center.y} r={10} />

      {joinedList.length > 0 && stage !== 'join' && (
        <circle className="sym-hub sym-in" cx={center.x} cy={center.y} r={10} />
      )}

      {/* one span becoming the other: the second fact, each round in turn */}
      {stage === 'equal' && (
        <g>
          <CorrFly
            key={`fly-${pa}-${pb}`}
            part={{
              kind: 'side',
              a: [vertices[pa], center],
              b: [vertices[pb], center],
            }}
            landed={landed}
            move={{ from: turnTransform(center, 0), to: turnTransform(center, 180) }}
          />
          {landed && (
            <g className="sym-proved sym-in">
              <path className="sym-tick" d={tickPath(vertices[pa], center, MARK)} />
              <path className="sym-tick" d={tickPath(vertices[pb], center, MARK)} />
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
