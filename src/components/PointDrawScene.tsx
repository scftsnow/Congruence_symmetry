/**
 * The drawing board drawn — a half figure, its middle, and the half taking shape.
 *
 * The full outline is never shown while the child is working: it would be the
 * answer, painted underneath. It appears whole once every edge of the remaining
 * half is joined, and stands for three seconds before the way out appears.
 */

import { useRef } from 'react'
import { pointsToPath } from './svgPath'
import { Grid } from './BoardGrid'
import { Celebration } from './Celebration'
import type { Point } from '../geometry/types'

const W = 1100
const H = 600

export function PointDrawScene({
  half,
  joins,
  placed,
  draft,
  center,
  color,
  complete,
  justFound,
  demo,
  walk,
  flying,
  legDrawn,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
}: {
  /** the half the child is given, with the middle on its straight edge */
  half: Point[]
  /** the outline edges joined so far: the remaining half taking shape */
  joins: Array<{ a: Point; b: Point }>
  /** placed point positions in outline order */
  placed: Point[]
  /** the finger's line, while it is being drawn */
  draft: { p: Point; q: Point } | null
  center: Point
  color: string
  /** every edge is joined, so the whole figure is shown */
  complete: boolean
  justFound: boolean
  /** the example walk: the given corner, the middle it crosses, its mirror */
  demo: { from: Point; mid: Point; to: Point }
  /** where the walk has got to: corner, middle, mirror, then placing */
  walk: number
  /** the point now flying across, from its given corner to its mirror spot */
  flying: { from: Point; to: Point } | null
  /** the walk has reached the mirror, so its mark may arrive */
  legDrawn: boolean
  onDrawStart: (p: Point) => void
  onDrawMove: (p: Point) => void
  onDrawEnd: (up: Point | null) => void
}) {
  const svgRef = useRef<SVGSVGElement | null>(null)

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

  const walking = walk < 3

  return (
    <svg
      ref={svgRef}
      className="canvas"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="반대쪽을 완성할 도형"
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

      {complete && (
        <path
          className="sym-shape sym-shape--whole"
          d={pointsToPath([...placed, ...half.slice().reverse()])}
          fill={color}
        />
      )}
      <path className="sym-shape" d={pointsToPath(half)} fill={color} />
      <circle className="sym-hub sym-hub--given" cx={center.x} cy={center.y} r={10} />

      {half.map((p, i) => (
        <circle key={`h${i}`} className="sym-corner" cx={p.x} cy={p.y} r={7} />
      ))}

      {/* the walk: the corner lit, the straight segment drawn, the mirror marked */}
      {walking && (
        <g className="sym-walk">
          {walk === 0 && (
            <circle className="corr-target" cx={demo.from.x} cy={demo.from.y} r={30} />
          )}
          {walk >= 1 && (
            <line
              className="sym-join sym-draw sym-draw--slow"
              pathLength={1}
              x1={demo.from.x}
              y1={demo.from.y}
              x2={demo.to.x}
              y2={demo.to.y}
            />
          )}
          {walk >= 1 && legDrawn && (
            <circle className="sym-hub sym-in" cx={center.x} cy={center.y} r={10} />
          )}
          {walk >= 2 && (
            <g>
              <circle className="corr-mark" cx={demo.to.x} cy={demo.to.y} r={13} />
              <circle className="corr-fresh" cx={demo.to.x} cy={demo.to.y} r={26} />
            </g>
          )}
        </g>
      )}

      {/* the remaining half taking shape: each edge joined, drawn as it is made */}
      {joins.map((s, i) => (
        <line
          key={`jn${i}`}
          className="sym-join sym-draw"
          pathLength={1}
          x1={s.a.x}
          y1={s.a.y}
          x2={s.b.x}
          y2={s.b.y}
        />
      ))}

      {placed.map((p, i) => (
        <circle key={`pl${i}`} className="sym-placed" cx={p.x} cy={p.y} r={13} />
      ))}

      {/* the point now flying across to its mirror spot */}
      {flying && (
        <g
          className="sym-trip"
          style={
            {
              '--x0': `${flying.from.x}px`,
              '--y0': `${flying.from.y}px`,
              '--x1': `${flying.to.x}px`,
              '--y1': `${flying.to.y}px`,
            } as React.CSSProperties
          }
        >
          <circle className="sym-placed" r={13} />
        </g>
      )}

      {draft && (
        <line className="sym-draft" x1={draft.p.x} y1={draft.p.y} x2={draft.q.x} y2={draft.q.y} />
      )}
      {justFound && <Celebration x={550} y={300} />}
    </svg>
  )
}
