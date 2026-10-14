/**
 * The shapes for the line-symmetry unit.
 *
 * WHAT MAKES A SHAPE GOOD HERE
 * ----------------------------
 * The opposite of the correspondence unit. There, every part had to differ so
 * the child could tell them apart; here, parts have to coincide in pairs across
 * a line, so that "which line folds it" is a real question rather than a guess.
 * No symmetry at all would leave nothing to find; symmetry everywhere (a circle
 * has more axes than a child can count) would leave nothing to choose.
 *
 * So each shape carries its answer in its outline, and the count differs:
 *
 *   - 이등변삼각형: one axis. First, because one answer is the easiest question.
 *   - 직사각형: two axes. Either counts, which is itself something to discover.
 *   - 하트: one axis, on a shape that reads as a picture rather than a polygon.
 *   - 정사각형: four axes — vertical, horizontal, both diagonals, which is to say
 *     every direction the grid allows. Last of the symmetric ones, because "more
 *     than one" is the discovery that ends the sequence.
 *   - 부등변삼각형: no axis at all. Last, because it asks the opposite question:
 *     the fold itself shows the mismatch, and the lesson is that some shapes
 *     simply have no such line.
 *
 * WHERE THE SHAPES COME FROM
 * --------------------------
 * The four symmetric outlines are shapes.ts definitions under a uniform scale.
 * Scaling every coordinate by the same factor moves no direction and breaks no
 * mirror, so what was symmetric stays symmetric with the same axes. They are
 * re-declared here rather than imported because this unit needs its own sizes
 * and its own order, and reaching into another unit's catalogue for both would
 * couple the two.
 *
 * Every true axis of every shape here runs in one of the eight snapped
 * directions through a lattice point. A shape whose only axis ran at some odd
 * angle would be genuinely symmetric and genuinely unanswerable, since the child
 * can only draw what the grid allows — the pentagon and the star are out for
 * exactly this reason.
 */

import type { Point, Shape } from './types'

function shape(id: string, name: string, color: string, vertices: Point[]): Shape {
  return { id, name, kind: 'custom', color, vertices }
}

function scaled(vertices: Point[], factor: number): Point[] {
  return vertices.map((p) => ({ x: p.x * factor, y: p.y * factor }))
}

/**
 * A tall, narrow isosceles triangle: one unmistakable vertical axis.
 *
 * Deliberately NOT shapes.ts's triangle. That one scales to sides of
 * 227, 227 and 223 — close enough to equilateral that it reads as having
 * three axes, of which only the vertical one can be drawn on the eight-way
 * grid. A child who sees either of the other two would be marked wrong for a
 * reasonable idea. This one (250, 250, 140) suggests exactly one line.
 */
const ISO_TRIANGLE: Point[] = [
  { x: 0, y: -130 },
  { x: 70, y: 110 },
  { x: -70, y: 110 },
]

/** shapes.ts 직사각형 */
const RECTANGLE: Point[] = scaled(
  [
    { x: -82, y: -45 },
    { x: 82, y: -45 },
    { x: 82, y: 45 },
    { x: -82, y: 45 },
  ],
  1.6,
)

/** shapes.ts 하트 */
const HEART: Point[] = scaled(
  [
    { x: 0, y: 45 },
    { x: -54, y: -6 },
    { x: -37.2, y: -51 },
    { x: -12, y: -36 },
    { x: 0, y: -16.8 },
    { x: 12, y: -36 },
    { x: 37.2, y: -51 },
    { x: 54, y: -6 },
  ],
  1.8,
)

/** shapes.ts 정사각형 */
const SQUARE: Point[] = scaled(
  [
    { x: -50, y: -50 },
    { x: 50, y: -50 },
    { x: 50, y: 50 },
    { x: -50, y: 50 },
  ],
  1.8,
)

/**
 * A scalene triangle: three unequal sides, no axis at all.
 *
 * Not one of the symmetric outlines above, and deliberately so. It is the shape
 * that teaches the other half of the definition — that "folds exactly onto
 * itself" is a claim some shapes fail, and failing it is an answer.
 */
const SCALENE: Point[] = [
  { x: -105, y: -140 },
  { x: 105, y: 110 },
  { x: -105, y: 140 },
]

export interface SymmetryItem {
  id: string
  shape: Shape
  /** how many axes the outline really has, for the caption and the spec */
  axes: number
  /** what the shape is called where the child can read it */
  note: string
}

/**
 * Where every item sits on the canvas.
 *
 * One centre for the whole unit, on a lattice crossing, so every true axis
 * runs through lattice points in a snapped direction. The scene and the hook
 * only have to agree on this one point; the judgement itself runs in the
 * shape's own frame and never depends on screen layout.
 */
export const SYMM_CENTER = { x: 550, y: 300 }

/**
 * The items, easiest first.
 *
 * One axis, then a choice of two, then one on a picture, then four, then none.
 * The last one is not harder drawing — any fold shows the mismatch — it is a
 * harder idea, which is why it comes after the hand has learned the gesture.
 */
export const SYMMETRY_ITEMS: SymmetryItem[] = [
  { id: 'sym-tri', shape: shape('sym-tri', '이등변삼각형', '#ffd166', ISO_TRIANGLE), axes: 1, note: '이등변삼각형' },
  { id: 'sym-rect', shape: shape('sym-rect', '직사각형', '#a3d5a1', RECTANGLE), axes: 2, note: '직사각형' },
  { id: 'sym-heart', shape: shape('sym-heart', '하트', '#ff8fa3', HEART), axes: 1, note: '하트' },
  { id: 'sym-square', shape: shape('sym-square', '정사각형', '#8ecae6', SQUARE), axes: 4, note: '정사각형' },
  { id: 'sym-scalene', shape: shape('sym-scalene', '부등변삼각형', '#cdb4db', SCALENE), axes: 0, note: '부등변삼각형' },
]
