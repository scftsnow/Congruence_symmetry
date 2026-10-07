/**
 * Verdict — what happens when a child stacks one shape on another.
 *
 * THE CHILD NEVER CHOOSES THE ANGLE
 * ----------------------------------
 * An earlier build put rotate and flip buttons on the screen and expected the
 * child to find the right combination. That taught the wrong thing twice
 * over: it turned a judgement about shape into a puzzle about controls, and it
 * signalled that direction matters, which is exactly what the unit exists to
 * disprove.
 *
 * So the child only moves a shape. The system tries every quarter turn, with
 * and without a mirror, and reports what it finds:
 *
 *   match-direct               they already coincide as they lie
 *   match-by-turn              a quarter turn makes them coincide
 *   match-by-turn-and-flip     a turn plus a mirror makes them coincide
 *   same-shape-different-size  the outlines match but nothing fits
 *   different-shape            the outlines differ
 *
 * On success the screen animates the winning turn onto the shape, so the child
 * sees the coincidence rather than being told about it. On failure the problem
 * is named without a recipe for fixing it.
 *
 * A STACK MUST HAPPEN BEFORE ANYTHING IS TURNED
 * ---------------------------------------------
 * The shapes have to be lying on each other first. The turn search used to run
 * whenever two outlines matched, wherever they happened to be on the board, so
 * a child could pick a shape up, drag it two pixels and let go, and watch it
 * spin in mid-air hundreds of pixels from its partner. Congruent outlines are
 * not a reason to move anything; meeting another shape is.
 *
 * ROTATION HAPPENS ABOUT THE SHAPE, NOT THE ORIGIN
 * -------------------------------------------------
 * The points arriving here are already in screen coordinates, so their
 * centroid sits wherever the child dragged the shape. Rotating about the
 * origin would swing it off the canvas and every turn would report "no fit".
 * An earlier draft did exactly that and silently reported
 * same-shape-different-size for genuine pairs.
 */

import type { Point } from './types'
import { measureOverlap, polygonCentroid, touching } from './overlap'
import { checkCongruence, compareShape, EPSILON_STACK, perimeter } from './compare'
import { shapePoints, type Matchable } from './pairs'

export type Verdict =
  | 'match-direct'
  | 'match-by-turn'
  | 'match-by-turn-and-flip'
  | 'same-shape-different-size'
  | 'different-shape'
  | 'apart'

export interface Turn {
  /** degrees added to the child's shape: 90, 180 or 270 */
  degrees: number
  /** whether the mirror is applied */
  flipped: boolean
  /**
   * Where the shape lands, so the turn ends in a real coincidence.
   *
   * Turning alone leaves the shape wherever the child dropped it. A shape
   * dropped a little off-centre would rotate and still miss, so the pair would
   * never actually register. This is the partner's centroid.
   */
  center: Point
}

export interface VerdictResult {
  verdict: Verdict
  /** the turn that achieves coincidence, when one exists */
  solution: Turn | null
  /** 0..1, how much of the shapes coincide right now */
  coverage: number
  /** true when they already coincide without any change */
  coincident: boolean
}

const QUARTER_TURNS = [0, 90, 180, 270]

/**
 * The pivot for turning a shape.
 *
 * This is the polygon's centroid, not the mean of its vertices. They agree
 * only for regular polygons. An arrow bunches its vertices at the tail, and
 * rotating about their mean leaves the shape askew after a half turn, which
 * made genuine pairs report as same-shape-different-size.
 */
function pivotOf(points: Point[]): Point {
  return polygonCentroid(points)
}

/**
 * Turn a shape, then seat it exactly on the target.
 *
 * The alignment step is what makes this work. Rotating in place leaves the
 * shape's centroid where the child dropped it, and a trapezoid or a fish has a
 * centroid that does not sit at its bounding-box centre, so the rotated copy
 * lands a few pixels off and the overlap test fails at 0.9 instead of 1.0.
 * Seating the turned shape on the reference's centroid removes that error.
 */
function seat(points: Point[], degrees: number, mirrored: boolean, target: Point): Point[] {
  let pts = mirrored ? mirrorThrough(points, pivotOf(points)) : points

  if (degrees !== 0) {
    const c = pivotOf(pts)
    const r = (degrees * Math.PI) / 180
    const cos = Math.cos(r)
    const sin = Math.sin(r)
    pts = pts.map((p) => {
      const dx = p.x - c.x
      const dy = p.y - c.y
      return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos }
    })
  }

  const c = pivotOf(pts)
  const dx = target.x - c.x
  const dy = target.y - c.y
  return pts.map((p) => ({ x: p.x + dx, y: p.y + dy }))
}

/** Mirror across the vertical axis through the given pivot. */
function mirrorThrough(points: Point[], pivot: Point): Point[] {
  return points.map((p) => ({ x: 2 * pivot.x - p.x, y: p.y }))
}

function coincide(a: Point[], b: Point[]): boolean {
  return measureOverlap(a, b).contained
}


/** A shape that has met nothing: the neutral prompt, never a match. */
export function APART(): VerdictResult {
  return { verdict: 'apart', solution: null, coverage: 0, coincident: false }
}


/**
 * Do the outlines match, ignoring size?
 *
 * compareShape answers exactly this: it compares form without measuring size.
 * Using it here is what lets "같은 모양인데 크기가 달라" be reported as its
 * own case instead of collapsing into "다른 모양".
 */
function sameOutline(a: Point[], b: Point[]): boolean {
  return compareShape(a, b, EPSILON_STACK * 1000, Math.max(perimeter(a), 1)).matches
}
function congruent(a: Point[], b: Point[], canvasSize: number): boolean {
  return checkCongruence(a, b, EPSILON_STACK, canvasSize, false).isCongruent
}

/**
 * Judge a stack.
 *
 * @param reference  points of the shape underneath, in screen coordinates
 * @param held       points of the shape the child placed
 * @param canvasSize scales the congruence tolerance
 */
export function judge(reference: Point[], held: Point[], canvasSize: number): VerdictResult {
  const current = measureOverlap(reference, held)
  const base: VerdictResult = {
    verdict: 'apart',
    solution: null,
    coverage: current.coverage,
    coincident: current.contained,
  }

  // Nothing has been stacked yet. Congruent outlines do not license a turn,
  // so a shape sitting alone on the board is simply not under discussion.
  // This check comes first: without it, a shape judged against itself would
  // report itself fully contained and announce a match with nothing.
  if (!touching(reference, held)) {
    return base
  }

  // Two different outlines. No turn can rescue these.
  if (!sameOutline(reference, held)) {
    return { ...base, verdict: 'different-shape' }
  }

  // Same outline, but the sizes differ. Congruence fails on size alone, so it
  // must be asked separately or this case is reported as a different shape.
  if (!congruent(reference, held, canvasSize)) {
    return { ...base, verdict: 'same-shape-different-size' }
  }

  // Already stacked.
  if (current.contained) {
    return { ...base, verdict: 'match-direct' }
  }

  // Congruent, so some orientation must fit. Quarter turns first, then the
  // same with a mirror. Each candidate is seated on the reference so the
  // comparison is between shapes, not between shapes and pixels.
  const target = pivotOf(reference)

  for (const degrees of QUARTER_TURNS) {
    if (coincide(reference, seat(held, degrees, false, target))) {
      return { ...base, verdict: 'match-by-turn', solution: { degrees, flipped: false, center: target } }
    }
  }

  for (const degrees of QUARTER_TURNS) {
    if (coincide(reference, seat(held, degrees, true, target))) {
      return {
        ...base,
        verdict: 'match-by-turn-and-flip',
        solution: { degrees, flipped: true, center: target },
      }
    }
  }

  // Congruent in outline, yet nothing fits. A genuinely congruent pair always
  // fits in some orientation, so the sizes must differ.
  return { ...base, verdict: 'same-shape-different-size' }
}

/** True when the verdict is a match of any kind. */
export function isMatch(v: VerdictResult): boolean {
  return (
    v.verdict === 'match-direct' ||
    v.verdict === 'match-by-turn' ||
    v.verdict === 'match-by-turn-and-flip'
  )
}

/**
 * A shape after the system has turned it and seated it on its partner.
 *
 * Turning alone is not enough. The child dropped the shape wherever their hand
 * stopped, which is rarely more than exact, so a shape that merely rotated
 * would still miss and the pair would never register. Re-centring afterwards
 * is what turns the reported match into a real one.
 *
 * The nudge is measured after the turn rather than computed from the shape's
 * own geometry, because how a centroid sits inside its vertices differs
 * between a rectangle, whose centroid is its middle, and a trapezoid, whose
 * is nowhere near it.
 */
export function turnedItem<T extends Matchable>(item: T, turn: Turn): T {
  const turned: T = {
    ...item,
    rotation: item.rotation + turn.degrees,
    flipped: item.flipped !== turn.flipped,
  }
  const landed = polygonCentroid(shapePoints(turned))
  return {
    ...turned,
    x: turned.x + (turn.center.x - landed.x),
    y: turned.y + (turn.center.y - landed.y),
  }
}