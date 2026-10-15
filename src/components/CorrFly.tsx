/**
 * The part that travels from its own place to its partner's.
 *
 * Shared by both places the correspondence unit appears. Two congruent shapes side
 * by side send a side or an angle across by turning it; one shape folded over an
 * axis sends it by folding it. The move is handed in as a transform rather than
 * worked out here, because choosing between a turn and a fold is a decision, and
 * a component must not make one.
 *
 * The destination is shown pale behind it so the part has somewhere visible to
 * arrive; without that the travel is a mark sliding across empty space and the
 * landing has nothing to be judged against.
 *
 * The move is a CSS transform rather than a change of coordinates so the browser
 * interpolates it — the same reason the congruence stage's turns animate.
 */

import { angleTransform, angleWedge, sideTransform, type Angle } from '../geometry/correspondence'
import type { Point } from '../geometry/types'

/** A side or an angle, either side of the pair. */
export type Flyable =
  | { kind: 'side'; a: [Point, Point]; b: [Point, Point] }
  | { kind: 'angle'; a: Angle; b: Angle }

export function CorrFly({
  part,
  landed,
  move,
  wedge = 90,
}: {
  part: Flyable | null
  landed: boolean
  /** the transform to travel by; the turn is worked out from the part if absent */
  move?: string
  wedge?: number
}) {
  if (!part) return null
  const travel =
    move ??
    (part.kind === 'side' ? sideTransform(part.a, part.b) : angleTransform(part.a, part.b))

  return (
    <g className="corr-fly" style={{ transform: landed ? travel : undefined }}>
      {part.kind === 'side' ? (
        <line
          className="corr-ghost"
          x1={part.b[0].x}
          y1={part.b[0].y}
          x2={part.b[1].x}
          y2={part.b[1].y}
        />
      ) : (
        <path className="corr-ghost" d={angleWedge(part.b, wedge)} />
      )}
      {part.kind === 'side' ? (
        <line
          className="corr-flyline"
          x1={part.a[0].x}
          y1={part.a[0].y}
          x2={part.a[1].x}
          y2={part.a[1].y}
        />
      ) : (
        <path className="corr-wedge corr-wedge--fly" d={angleWedge(part.a, wedge)} />
      )}
    </g>
  )
}