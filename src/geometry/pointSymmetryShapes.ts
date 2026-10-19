/**
 * The shapes for the point-symmetry unit.
 *
 * The mirror image of the line unit's catalogue, with the same discipline: each
 * shape carries its answer in its outline, every true center runs through a
 * lattice point, and no shape asks for what little fingers cannot point at.
 *
 * WHAT MAKES A SHAPE GOOD HERE
 * ----------------------------
 * Parts have to coincide in pairs across a point, so that "which point turns
 * it" is a real question rather than a guess. No symmetry at all would leave
 * nothing to find; the trapezoid at the end is the shape that teaches the other
 * half of the definition — and it is chosen line-symmetric on purpose, so a
 * child fresh from folding lines must notice that folding is not turning.
 *
 * WHERE EVERY SHAPE SITS
 * ----------------------
 * One centre for the whole unit, on a lattice crossing, and every true center
 * is that crossing: the scene and the hook only have to agree on this one
 * point. Every corner below is placed so the outline on screen lands on lattice
 * crossings, because placing and tapping mean pointing exactly.
 */

import type { Point, Shape } from './types'

function shape(id: string, name: string, color: string, vertices: Point[]): Shape {
  return { id, name, kind: 'custom', color, vertices }
}

/**
 * A parallelogram: the textbook's figure for this unit.
 *
 * First because it is the discovery itself — no axis anywhere, and still one
 * point that turns it exactly onto itself. Deliberately lopsided-looking, so no
 * line suggests itself.
 */
const PARALLELOGRAM: Point[] = [
  { x: -150, y: -100 },
  { x: 50, y: -100 },
  { x: 150, y: 100 },
  { x: -50, y: 100 },
]

/** A rectangle: the familiar one, with its middle where the diagonals cross. */
const RECTANGLE: Point[] = [
  { x: -150, y: -100 },
  { x: 150, y: -100 },
  { x: 150, y: 100 },
  { x: -150, y: 100 },
]

/** A rhombus: four equal sides turning about their crossing. */
const RHOMBUS: Point[] = [
  { x: 0, y: -150 },
  { x: 150, y: 0 },
  { x: 0, y: 150 },
  { x: -150, y: 0 },
]

/** A hexagon with three pairs across its middle, and nothing on it. */
const HEXAGON: Point[] = [
  { x: 50, y: -150 },
  { x: 150, y: -50 },
  { x: 100, y: 100 },
  { x: -50, y: 150 },
  { x: -150, y: 50 },
  { x: -100, y: -100 },
]

/**
 * An isosceles trapezoid: one axis, no center.
 *
 * Last of the finding boards, because it asks the opposite question. It folds
 * neatly in half — a child fresh from the line unit will see that first — and
 * still no point turns it onto itself, which is exactly the lesson.
 */
const TRAPEZOID: Point[] = [
  { x: -150, y: 100 },
  { x: 150, y: 100 },
  { x: 100, y: -100 },
  { x: -100, y: -100 },
]

export interface PointSymmetryItem {
  id: string
  shape: Shape
  /** how many centers the outline really has: one, or none */
  centers: number
  /** what the shape is called where the child can read it */
  note: string
}

/**
 * Where every item sits on the canvas.
 *
 * The same crossing the line unit uses, so the two units share one middle of
 * the board; the judgement itself runs in the shape's own frame and never
 * depends on screen layout.
 */
export const POINT_SYMM_CENTER = { x: 550, y: 300 }

/**
 * The items, easiest first.
 *
 * The lopsided one first because nothing about it suggests a line; then the
 * familiar ones, whose middles the child has already met as diagonal crossings;
 * then six corners in three pairs; then the one with no center at all.
 */
export const POINT_SYMMETRY_ITEMS: PointSymmetryItem[] = [
  { id: 'pts-para', shape: shape('pts-para', '평행사변형', '#ffd166', PARALLELOGRAM), centers: 1, note: '평행사변형' },
  { id: 'pts-rect', shape: shape('pts-rect', '직사각형', '#a3d5a1', RECTANGLE), centers: 1, note: '직사각형' },
  { id: 'pts-rhomb', shape: shape('pts-rhomb', '마름모', '#ff8fa3', RHOMBUS), centers: 1, note: '마름모' },
  { id: 'pts-hex', shape: shape('pts-hex', '육각형', '#8ecae6', HEXAGON), centers: 1, note: '육각형' },
  { id: 'pts-trap', shape: shape('pts-trap', '사다리꼴', '#cdb4db', TRAPEZOID), centers: 0, note: '사다리꼴' },
]

/* ── the rest of the unit ────────────────────────────────
 *
 * Finding the center is only the first half of what the textbook asks. After it
 * come the parts of the figure — 대응점, 대응변, 대응각 — then the two facts
 * about them, then drawing one. So the unit is a run of boards of different
 * kinds rather than a list of shapes, and the shape alone no longer says what
 * the child is being asked.
 */

const HEX_SHAPE = shape('pts-hex2', '육각형', '#bde0fe', HEXAGON)
const OCTAGON: Point[] = [
  { x: 0, y: -150 },
  { x: 100, y: -100 },
  { x: 150, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 150 },
  { x: -100, y: 100 },
  { x: -150, y: 0 },
  { x: -100, y: -100 },
]
const OCT_SHAPE = shape('pts-oct', '팔각형', '#ffd166', OCTAGON)

/**
 * The boards of the unit, in the textbook's order.
 *
 * Four ask for a point to be tapped, and then four ask something else about a
 * figure that already has one: the parts that face each other across it, the two
 * facts about those parts, and finally the drawing of one from the other side.
 * The hexagon carries the middle two boards — the same figure questioned twice
 * is continuity, not repetition — and the pointed octagon closes the unit,
 * because completing it uses both facts at once.
 */
export type PointSymmetryBoard =
  | { kind: 'center'; item: PointSymmetryItem }
  | { kind: 'parts'; id: string; shape: Shape; center: Point; note: string }
  | { kind: 'facts'; id: string; shape: Shape; center: Point; note: string }
  | { kind: 'draw'; id: string; shape: Shape; center: Point; note: string; half: Point[]; place: number[] }

const CENTER: Point = { x: POINT_SYMM_CENTER.x, y: POINT_SYMM_CENTER.y }

export const POINT_SYMM_BOARDS: PointSymmetryBoard[] = [
  { kind: 'center', item: POINT_SYMMETRY_ITEMS[0] },
  { kind: 'center', item: POINT_SYMMETRY_ITEMS[1] },
  { kind: 'center', item: POINT_SYMMETRY_ITEMS[2] },
  { kind: 'center', item: POINT_SYMMETRY_ITEMS[3] },
  { kind: 'parts', id: 'pts-parts', shape: HEX_SHAPE, center: CENTER, note: '육각형' },
  { kind: 'facts', id: 'pts-facts', shape: HEX_SHAPE, center: CENTER, note: '육각형' },
  { kind: 'center', item: POINT_SYMMETRY_ITEMS[4] },
  {
    kind: 'draw',
    id: 'pts-draw',
    shape: OCT_SHAPE,
    center: CENTER,
    note: '팔각형',
    half: OCTAGON.slice(0, 5),
    /**
     * The same three corners the line unit places, listed the other way round.
     *
     * The images come out in list order, and the outline ties that chain to
     * the two ends of the given half, so the list has to start from the end
     * the first join needs. A half turn carries the top of the given half to
     * the bottom of the other side: listed top-down, the chain attached to the
     * wrong ends and the first and last joins cut across the figure. Bottom-up,
     * every one of the four joins lands on a side.
     */
    place: [3, 2, 1],
  },
]

/* ── the rows on the home screen ─────────────────────────
 *
 * One unit in the textbook, four doors on the home screen, exactly as its
 * elder sibling: finding the figures, finding what faces what across the
 * middle, the two facts together, and the drawing that closes the unit.
 */

/** 7번: 점대칭도형 찾기 — the four figures with centers, then the one with none */
export const POINT_CENTER_BOARDS: PointSymmetryBoard[] = POINT_SYMM_BOARDS.filter(
  (b) => b.kind === 'center',
)

/** 8번: 대응점·대응변·대응각 찾기 — the one figure whose parts face each other */
export const POINT_PARTS_BOARDS: PointSymmetryBoard[] = POINT_SYMM_BOARDS.filter(
  (b) => b.kind === 'parts',
)

/** 9번: 점대칭도형의 성질 — the two facts together */
export const POINT_FACTS_BOARDS: PointSymmetryBoard[] = POINT_SYMM_BOARDS.filter(
  (b) => b.kind === 'facts',
)

/** 10번: 점대칭도형 그리기 — the drawing the facts make possible, last */
export const POINT_DRAW_BOARDS: PointSymmetryBoard[] = POINT_SYMM_BOARDS.filter(
  (b) => b.kind === 'draw',
)
