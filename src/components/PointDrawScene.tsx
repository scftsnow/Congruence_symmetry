/**
 * The drawing board drawn — a half figure, its middle, and the half taking shape.
 *
 * The full outline is never shown while the child is working: it would be the
 * answer, painted underneath. It appears whole at the end, when there is nothing
 * left to copy, and the line joining each found point through the middle is what
 * says why it is the same figure — the same two facts the board before proved.
 */

import { useRef } from 'react'
import { pointsToPath } from './svgPath'
import { Grid } from './BoardGrid'
import { Celebration } from './Celebration'
import { tickPath } from '../geometry/symmetryParts'
import type { Point } from '../geometry/types'

const W = 1100
const H = 600
const MARK = 16

export function PointDrawScene({
  half,
  links,
  center,
  color,
  resolved,
  justFound,
  demo,
  walk,
  flying,
  legDrawn,
  onPlace,
}: {
  /** the half the child is given, with the middle on its straight edge */
  half: Point[]
  /** each found point with the given one it mirrors */
  links: Array<{ given: Point; placed: Point }>
  center: Point
  color: string
  /** every point is in, so the whole figure is shown */
  resolved: boolean
  justFound: boolean
  /** the example walk: the given corner, straight through, its mirror */
  demo: { from: Point; to: Point }
  /** where the walk has got to: corner, mirror, then placing */
  walk: number
  /** the point now flying across, from its given corner to its mirror spot */
  flying: { from: Point; to: Point } | null
  /** the walk has reached the mirror, so its mark may arrive */
  legDrawn: boolean
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

      {/* each found point, joined through the middle to the one it mirrors */}
      {links.map((l, i) => {
        return (
          <g key={`p${i}`} className="sym-proved">
            <circle className="sym-placed" cx={l.placed.x} cy={l.placed.y} r={13} />
            <line
              className="sym-join sym-draw"
              pathLength={1}
              x1={l.placed.x}
              y1={l.placed.y}
              x2={l.given.x}
              y2={l.given.y}
            />
            <circle className="sym-hub" cx={center.x} cy={center.y} r={10} />
            {resolved && <path className="sym-tick" d={tickPath(l.placed, center, MARK)} />}
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
