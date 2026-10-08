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
 * HOW BIG THE GAPS HAVE TO BE
 * --------------------------
 * The first pair here was drawn by eye and measured afterwards: its four sides
 * came out within 1.3px of each other and two of its angles within 3.2 degrees.
 * At the size it was drawn on screen that is a smudge, and "which side is the
 * partner" had no answer — several sides would do. Both shapes below were found
 * by searching for the widest spread of side lengths and of angles that still
 * fits a sensible box, and the spec now refuses anything under a 25px gap
 * between the two closest sides or a 15 degree gap between the two closest
 * angles. Those numbers are the floor, not a target.
 *
 * A quad cannot spread as far as a triangle, because its four angles sum to 360
 * and its adjacent-arc sums pair to 360 as well. Pushing all four apart means
 * pushing two of them well below and well above 90 degrees, so the quad settles
 * for a 27px and an 18 degree gap where the triangle manages 46px and 18. That
 * is the shape of the problem, not a choice.
 */

import type { Point, Shape } from './types'
import { applyTransform } from './transforms'

function shape(id: string, name: string, color: string, vertices: Point[]): Shape {
  return { id, name, kind: 'custom', color, vertices }
}

/**
 * A scalene triangle: three clearly unequal sides, three clearly unequal angles.
 *
 * Ordinary enough to look like something a child would draw, which matters
 * because a needle with a 121 degree corner spreads well but reads as a trick.
 */
const TRIANGLE: Point[] = [
  { x: -105, y: -140 },
  { x: 105, y: 110 },
  { x: -105, y: 140 },
]

/**
 * An irregular quadrilateral.
 *
 * A trapezoid was considered and rejected: its two parallel sides make it look
 * like it has a "right way up", which gives the child a clue that has nothing to
 * do with correspondence.
 */
const QUADRILATERAL: Point[] = [
  { x: -14, y: -110 },
  { x: 106, y: -69 },
  { x: 141, y: 111 },
  { x: -141, y: 111 },
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
