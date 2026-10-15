/**
 * The part that travels from its own place to its partner's.
 *
 * Shared by both places the correspondence unit appears. Two congruent shapes side
 * by side send a side or an angle across by turning it; one shape folded over an
 * axis sends it by folding it. The move is handed in as a transform rather than
 * worked out here, because choosing between a turn and a fold is a decision, and
 * a component must not make one.
 *
 * The move is a CSS transform rather than a change of coordinates so the browser
 * interpolates it — the same reason the congruence stage's turns animate.
 *
 * WHY THE TWO SWAP
 * ----------------
 * The first version sent one part travelling onto the other, which reads as the
 * traveller doing something to the one that stays: a rotation one way. But a
 * correspondence runs both ways — each is the other's partner — so the two
 * exchange places at once, each landing where the other stood. Neither is the
 * original and neither is the copy, which is exactly what 대응 means.
 *
 * The span on the line facts board is the exception, and it stays one-way:
 * there the claim is that one length lands exactly on the other, and two parts
 * crossing mid-way would never land on anything.
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
  swap = false,
}: {
  part: Flyable | null
  landed: boolean
  /** the transform to travel by; the turn is worked out from the part if absent */
  move?: string
  wedge?: number
  /**
   * the two exchange places instead of one travelling onto the other
   *
   * Only for the correspondence demonstrations, where the claim runs both ways.
   * A handed-in fold is its own way back, so it needs no second transform; a
   * turn gets the reverse one worked out the same way as the forward one.
   */
  swap?: boolean
}) {
  if (!part) return null
  const travel =
    move ??
    (part.kind === 'side' ? sideTransform(part.a, part.b) : angleTransform(part.a, part.b))

  if (swap) {
    const back =
      move ??
      (part.kind === 'side' ? sideTransform(part.b, part.a) : angleTransform(part.b, part.a))
    return (
      <>
        <g className="corr-fly" style={{ transform: landed ? travel : undefined }}>
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
        <g className="corr-fly" style={{ transform: landed ? back : undefined }}>
          {part.kind === 'side' ? (
            <line
              className="corr-flyline"
              x1={part.b[0].x}
              y1={part.b[0].y}
              x2={part.b[1].x}
              y2={part.b[1].y}
            />
          ) : (
            <path className="corr-wedge corr-wedge--fly" d={angleWedge(part.b, wedge)} />
          )}
        </g>
      </>
    )
  }

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