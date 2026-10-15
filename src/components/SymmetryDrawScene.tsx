/**
 * The drawing board drawn — a half figure, its axis, and the half taking shape.
 *
 * The full outline is never shown while the child is working: it would be the
 * answer, painted underneath. It appears whole at the end, when there is nothing
 * left to copy, and the line joining each found point to its partner is what
 * says why it is the same figure — the same two facts the board before proved.
 */

import { useRef } from 'react'
import { pointsToPath } from './svgPath'
import { Grid } from './BoardGrid'
import { Celebration } from './Celebration'
import { footOnAxis, rightAnglePath, tickPath } from '../geometry/symmetryParts'
import type { Line } from '../geometry/symmetryParts'
import type { Point } from '../geometry/types'

const W = 1100
const H = 600
const MARK = 16

export function SymmetryDrawScene({
  half,
  links,
  axis,
  resolved,
  justFound,
  demo,
  walk,
  flying,
  onPlace,
}: {
  /** the half the child is given, with the axis as its straight edge */
  half: Point[]
  /** each found point with the given one it mirrors */
  links: Array<{ given: Point; placed: Point }>
  axis: Line
  /** every point is in, so the whole figure is shown */
  resolved: boolean
  justFound: boolean
  /** the example walk: the given corner, its foot, its mirror */
  demo: { from: Point; foot: Point; to: Point }
  /** where the walk has got to: corner, foot, mirror, then placing */
  walk: number
  /** the point now flying across, from its given corner to its mirror spot */
  flying: { from: Point; to: Point } | null
  onPlace: (p: Point) => void
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

  const press = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault()
    onPlace(toCanvas(e.clientX, e.clientY))
  }

  const walking = walk < 3
  const carry = { x: demo.foot.x - demo.from.x, y: demo.foot.y - demo.from.y }

  /*
   * Down only, never up. A tap is one press and one release, and answering both
   * would place two points for one finger: the second press lands where the
   * first did, which is near enough to count as the NEXT point as well.
   */
  return (
    <svg
      ref={svgRef}
      className="canvas"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="반대쪽을 완성할 도형"
      onPointerDown={press}
    >
      <Grid width={W} height={H} />

      {resolved && (
        <path
          className="sym-shape sym-shape--whole"
          d={pointsToPath([...links.map((l) => l.placed), ...half.slice().reverse()])}
          fill="#ff8fa3"
        />
      )}
      <path className="sym-shape" d={pointsToPath(half)} fill="#ff8fa3" />
      <line className="sym-axis sym-axis--given" x1={axis.a.x} y1={axis.a.y} x2={axis.b.x} y2={axis.b.y} />

      {half.map((p, i) => (
        <circle key={`h${i}`} className="sym-corner" cx={p.x} cy={p.y} r={7} />
      ))}

      {/* the walk: the corner lit, the square leg drawn, the leg carried across */}
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
              x2={demo.foot.x}
              y2={demo.foot.y}
            />
          )}
          {walk >= 1 && (
            <line
              className="sym-carry"
              x1={demo.from.x}
              y1={demo.from.y}
              x2={demo.foot.x}
              y2={demo.foot.y}
              style={{
                /* hidden until its turn: it sits exactly on the leg being drawn,
                 * and would cover the drawing with a finished line. */
                opacity: walk >= 2 ? 1 : 0,
                transform: walk >= 2 ? `translate(${carry.x}px, ${carry.y}px)` : undefined,
              }}
            />
          )}
          {/* where the carried leg lands is the mirror point, so it is marked */}
          {walk >= 2 && (
            <g>
              <circle className="corr-mark" cx={demo.to.x} cy={demo.to.y} r={13} />
              <circle className="corr-fresh" cx={demo.to.x} cy={demo.to.y} r={26} />
            </g>
          )}
        </g>
      )}

      {/* each found point, joined to the one it mirrors, with the two marks */}
      {links.map((l, i) => {
        const foot = footOnAxis(l.placed, axis)
        return (
          <g key={`p${i}`} className="sym-proved">
            <circle className="sym-placed" cx={l.placed.x} cy={l.placed.y} r={13} />
            <line className="sym-join sym-draw" pathLength={1} x1={l.placed.x} y1={l.placed.y} x2={l.given.x} y2={l.given.y} />
            <path className="sym-right" d={rightAnglePath(foot, axis, l.placed, MARK)} />
            {resolved && <path className="sym-tick" d={tickPath(l.placed, foot, MARK)} />}
          </g>
        )
      })}

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

      {justFound && <Celebration x={550} y={300} />}
    </svg>
  )
}