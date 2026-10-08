/**
 * The shapes for the correspondence unit.
 *
 * WHAT MAKES A SHAPE GOOD HERE
 * ----------------------------
 * The child has to be able to tell the parts apart, so that "which one
 * corresponds" is a real question rather than a guess:
 *
 *   - every side a different length, so no two sides look interchangeable
 *   - every angle a different size, for the same reason
 *   - no symmetry, because a symmetric shape has parts that are genuinely
 *     indistinguishable and the child would be right to be unsure
 *
 * So no square, no rectangle, no isosceles triangle, no regular polygon. The
 * congruence board already rejected all of those for the same reason.
 *
 * HOW A PAIR IS BUILT
 * -------------------
 * Each pair is one shape and a transform of it. The transform is what makes
 * the correspondence non-obvious — the same shape turned round or mirrored —
 * and it is also what fixes the answer, since vertex i of the original is the
 * point that lands on vertex i of the copy.
 *
 * The pairs get harder: three corners, then four, then four with a mirror,
 * which is the hardest thing on the board because a mirrored shape reads as
 * "the same shape" while its corners run the other way round.
 */

import type { Point, Shape } from './types'
import { applyTransform } from './transforms'

function shape(id: string, name: string, color: string, vertices: Point[]): Shape {
  return { id, name, kind: 'custom', color, vertices }
}

/** A scalene triangle: three unequal sides, three unequal angles. */
const TRIANGLE: Point[] = [
  { x: 0, y: -60 },
  { x: 70, y: 50 },
  { x: -50, y: 40 },
]

/**
 * An irregular quadrilateral.
 *
 * A trapezoid was considered and rejected: its two parallel sides make it
 * look like it has a "right way up", which gives the child a clue that has
 * nothing to do with correspondence.
 */
const QUADRILATERAL: Point[] = [
  { x: -60, y: -40 },
  { x: 50, y: -50 },
  { x: 70, y: 40 },
  { x: -40, y: 60 },
]

export interface CorrespondencePair {
  id: string
  /** the shape the child reads from */
  a: Shape
  /** the same shape after a transform, which the child matches against */
  b: Shape
  /** what was done to a to get b, for the caption */
  transformNote: string
}

function pair(
  id: string,
  name: string,
  color: string,
  vertices: Point[],
  transform: { rotation?: number; flipped?: boolean },
  transformNote: string,
): CorrespondencePair {
  const a = shape(`${id}-a`, name, color, vertices)
  const b = shape(`${id}-b`, name, color, vertices)
  const moved = applyTransform(vertices, {
    cx: 0,
    cy: 0,
    rotation: transform.rotation ?? 0,
    flipped: transform.flipped ?? false,
    scale: 1,
  })
  b.vertices = moved
  return { id, a, b, transformNote }
}

/**
 * The pairs, easiest first.
 *
 * The order is the textbook's: a plain turn first, so the child learns what
 * correspondence means before having to cope with a mirror, and the mirror
 * last, because it is the case where the shapes look most alike and the
 * correspondence is hardest to see.
 *
 * The notes name what was done without saying how many degrees. Measuring in
 * degrees is a later unit in fifth grade, so a number here would be teaching the
 * wrong chapter — and it would not help anyway: for an irregular shape, knowing
 * it was turned a quarter turn does not tell you which corner landed on which.
 * That is the whole question, and it has to be read off the drawing.
 */
export const CORRESPONDENCE_PAIRS: CorrespondencePair[] = [
  pair('tri', '삼각형', '#ffd166', TRIANGLE, { rotation: 90 }, '삼각형을 돌려 놓은 모습'),
  pair('quad', '사각형', '#bde0fe', QUADRILATERAL, { rotation: 180 }, '사각형을 돌려 놓은 모습'),
  pair(
    'quad-mirror',
    '사각형',
    '#cdb4db',
    QUADRILATERAL,
    { flipped: true, rotation: 90 },
    '사각형을 뒤집고 돌려 놓은 모습',
  ),
]
