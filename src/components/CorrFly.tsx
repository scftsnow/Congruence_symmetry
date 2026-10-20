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
 * TWO ENDS, WRITTEN THE SAME WAY
 * -------------------------------
 * A part travels from one place to another, and the two ends of that travel are
 * written as two lists of the same transform functions. That matters more than
 * it sounds: when the two ends are written the same way the browser
 * interpolates the functions themselves, so a part turns about its own middle
 * while it slides across. Written any other way — a matrix against no transform,
 * or a matrix against a matrix — the browser has to break the matrix into a
 * turn, a slide and a stretch of its own choosing, and what it picks is a
 * rotation about the corner of the canvas. The part then swings a long way
 * round the top-left corner on its way to a place a few hundred pixels away,
 * which is the one motion nobody can follow.
 *
 * WHY THE TWO SWAP
 * ----------------
 * The first version sent one part travelling onto the other, which reads as the
 * traveller doing something to the one that stays: a rotation one way. But a
 * correspondence runs both ways — each is the other's partner — so the two
 * exchange places, each landing where the other stood. Neither is the original
 * and neither is the copy, which is exactly what 대응 means.
 *
 * ONE MOTION, NOT TWO
 * -------------------
 * The exchange is one thing that happens, not two that happen in turn. Taken in
 * turns — the first part travelling and resting on its partner, and only then
 * the second setting off — the picture in between is the picture at the start,
 * because the two parts are mirror images of each other, so the child watches a
 * swap half-finished rather than the swap itself.
 */

import { angleTransform, angleWedge, sideTransform, type Angle } from '../geometry/correspondence'
import type { Point } from '../geometry/types'

/** A side or an angle, either side of the pair. */
export type Flyable =
  | { kind: 'side'; a: [Point, Point]; b: [Point, Point] }
  | { kind: 'angle'; a: Angle; b: Angle }

/**
 * The two ends of a travel, each a list of the same transform functions.
 *
 * The starting end is the identity written the same way as the landing, so the
 * browser can interpolate one list into the other.
 */
export interface Travel {
  /** where the part starts */
  from: string
  /** where the part lands */
  to: string
}

/** The travel of one side or angle from one place to another. */
function travelOf(part: Flyable, to: 'a' | 'b'): Travel {
  if (part.kind === 'side') {
    const from = part.a
    const end = part.b
    return to === 'a'
      ? { from: sideTransform(end, end), to: sideTransform(end, from) }
      : { from: sideTransform(from, from), to: sideTransform(from, end) }
  }
  const from = part.a
  const end = part.b
  return to === 'a'
    ? { from: angleTransform(end, end), to: angleTransform(end, from) }
    : { from: angleTransform(from, from), to: angleTransform(from, end) }
}

export function CorrFly({
  part,
  landed,
  move,
  wedge = 45,
  swap = false,
}: {
  part: Flyable | null
  landed: boolean
  /** the travel to make; it is worked out from the part if absent */
  move?: Travel
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
  const travel = move ?? travelOf(part, 'b')

  if (swap) {
    const back = move ?? travelOf(part, 'a')
    return (
      <>
        <g className="corr-fly" style={{ transform: landed ? travel.to : travel.from }}>
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
        <g
          className="corr-fly"
          style={{
            transform: landed ? back.to : back.from,
          }}
        >
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
    <g className="corr-fly" style={{ transform: landed ? travel.to : travel.from }}>
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