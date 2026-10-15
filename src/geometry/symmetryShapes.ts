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
import type { Line } from './symmetryParts'

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

/**
 * An irregular hexagon, symmetric about a vertical axis.
 *
 * The shape the parts board asks about, because its parts must come in pairs and
 * each pair must be findable: six corners in three mirrored pairs, and six sides
 * in three mirrored pairs, with nothing sitting on the axis. A corner on the axis
 * is its own mirror image, and one of those teaches a different thing — it is
 * what the axis board means when the fold leaves a point where it was.
 *
 * No corner is left unpaired, and no two pairs look alike either: the top pair
 * is nearly level with its partner, the middle pair is the widest apart and the
 * bottom pair is the shortest, so "which one faces this one across the line" is
 * a real question rather than a guess.
 */
const HEXAGON: Point[] = [
  { x: -70, y: -140 },
  { x: 130, y: -40 },
  { x: 70, y: 130 },
  { x: -70, y: 130 },
  { x: -130, y: -40 },
  { x: 70, y: -140 },
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

/* ── the rest of the unit ────────────────────────────────
 *
 * Finding the axis is only the first half of what the textbook asks of 선대칭.
 * After it come the parts of the figure — 대응점, 대응변, 대응각 — then the two
 * facts about them, then drawing one. So the unit is a run of boards of
 * different kinds rather than a list of shapes, and the shape alone no longer
 * says what the child is being asked.
 */

const VERTICAL: Line = {
  a: { x: SYMM_CENTER.x, y: SYMM_CENTER.y - 250 },
  b: { x: SYMM_CENTER.x, y: SYMM_CENTER.y + 250 },
}

const HEX_SHAPE = shape('sym-hex', '육각형', '#bde0fe', HEXAGON)
const HEART_SHAPE = shape('sym-heart2', '하트', '#ff8fa3', HEART)

/**
 * The boards of the unit, in the textbook's order.
 *
 * Four ask for a line to be drawn, and then four ask something else about a
 * figure that already has one: the parts that face each other across it, the two
 * facts about those parts, and finally the drawing of one from the other side.
 *
 * The hexagon comes first of the new boards because every corner of it has a
 * partner, so 대응점 is a question with an answer; the heart carries the two
 * facts, where its two corners standing on the axis are exactly the ones that
 * have no partner and so cannot be joined to anything; and the heart again
 * closes the unit, because a half of a heart is the most obvious drawing of all.
 */
export type SymmetryBoard =
  | { kind: 'axis'; item: SymmetryItem }
  | { kind: 'parts'; id: string; shape: Shape; axis: Line; note: string }
  | { kind: 'facts'; id: string; shape: Shape; axis: Line; note: string }
  | { kind: 'draw'; id: string; shape: Shape; axis: Line; note: string; half: Point[]; place: number[] }

export const SYMM_BOARDS: SymmetryBoard[] = [
  { kind: 'axis', item: SYMMETRY_ITEMS[0] },
  { kind: 'axis', item: SYMMETRY_ITEMS[1] },
  { kind: 'axis', item: SYMMETRY_ITEMS[2] },
  { kind: 'axis', item: SYMMETRY_ITEMS[3] },
  { kind: 'parts', id: 'sym-parts', shape: HEX_SHAPE, axis: VERTICAL, note: '육각형' },
  { kind: 'facts', id: 'sym-facts', shape: HEART_SHAPE, axis: VERTICAL, note: '하트' },
  { kind: 'axis', item: SYMMETRY_ITEMS[4] },
  {
    kind: 'draw',
    id: 'sym-draw',
    shape: HEART_SHAPE,
    axis: VERTICAL,
    note: '하트',
    /**
     * The right half of the heart, which is the part the child is given.
     *
     * The two corners it starts and ends on stand ON the axis, so they are their
     * own mirror images and need no partner; the three between them are the ones
     * to be found, and they are the ones with somewhere to go.
     */
    half: [
      { x: 0, y: -16.8 },
      { x: 12, y: -36 },
      { x: 37.2, y: -51 },
      { x: 54, y: -6 },
      { x: 0, y: 45 },
    ].map((p) => ({ x: p.x * 1.8, y: p.y * 1.8 })),
    place: [5, 6, 7],
  },
]

/* ── the rows on the home screen ─────────────────────────
 *
 * One unit in the textbook, five doors on the home screen: finding the axis,
 * finding what faces what across it, the two facts about it together, the figure
 * with no axis, and the drawing that closes the unit. Each row runs its own
 * boards and ends its own way, so a child who finished the axes yesterday starts
 * today's pairs without walking through yesterday again — and so the home screen
 * says what each row asks, which one flat list of eight never could.
 */

/** 3번: 대칭축으로 선대칭도형 찾기 — the four shapes with axes */
export const SYMM_AXIS_BOARDS: SymmetryBoard[] = SYMM_BOARDS.filter(
  (b) => b.kind === 'axis' && b.item.id !== 'sym-scalene',
)

/** 4번: 대응점·대응변·대응각 찾기 — the one figure whose parts face each other */
export const SYMM_PARTS_BOARDS: SymmetryBoard[] = SYMM_BOARDS.filter((b) => b.kind === 'parts')

/** 5번: 선대칭도형의 성질 — the two facts together (교과서 5·6번 묶음) */
export const SYMM_FACTS_BOARDS: SymmetryBoard[] = SYMM_BOARDS.filter((b) => b.kind === 'facts')

/** 6번: 대칭축이 없는 도형 — the one figure with no axis, its own question */
export const SYMM_NOAXIS_BOARDS: SymmetryBoard[] = SYMM_BOARDS.filter(
  (b) => b.kind === 'axis' && b.item.id === 'sym-scalene',
)

/** 7번: 선대칭도형 그리기 — the drawing the facts make possible, last */
export const SYMM_DRAW_BOARDS: SymmetryBoard[] = SYMM_BOARDS.filter((b) => b.kind === 'draw')
