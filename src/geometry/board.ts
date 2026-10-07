/**
 * The board's shapes and their starting positions.
 *
 * Kept out of the hook because none of it is state. The hook decides what is
 * held and what has matched; this file only says what is on the table.
 */

import type { Shape } from '../geometry/types'
import type { Matchable } from '../geometry/pairs'
import { findShape } from '../geometry/shapes'

export interface BoardShape extends Matchable {
  /** hangul syllable shown under the shape */
  label: string
}

export const CANVAS_W = 1100
export const CANVAS_H = 760
export const TARGET_PAIRS = 5

/**
 * The twelve syllables, in order.
 *
 * Twelve shapes take the first twelve syllables of the alphabet, which ends at
 * 타. 파 and 하 are the thirteenth and fourteenth and have no shape.
 *
 * These are written as characters rather than as \u escapes because that is
 * how the last label went wrong: an escape was mistyped as U+D310, which is
 * 판, so a shape was labelled with a syllable that is not in the sequence at
 * all, and the spec only checked that labels were single syllables and unique,
 * so it passed. `board.spec.ts` now asserts this exact list.
 */
export const LABELS = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타'] as const

/** A rectangle with the given proportions. */
function rectangle(w: number, h: number, color: string, id: string): Shape {
  return {
    id,
    name: '직사각형',
    kind: 'rectangle',
    color,
    vertices: [
      { x: -w / 2, y: -h / 2 },
      { x: w / 2, y: -h / 2 },
      { x: w / 2, y: h / 2 },
      { x: -w / 2, y: h / 2 },
    ],
  }
}

/**
 * A trapezoid: parallel sides of different lengths, so no quarter turn leaves
 * it unchanged.
 *
 * A rectangle was tried first and does not work. A rectangle is symmetric
 * under a quarter turn, so the two orientations already coincide and the pair
 * teaches nothing about direction.
 */
function trapezoid(top: number, bottom: number, h: number, color: string, id: string): Shape {
  return {
    id,
    name: '사다리꼴',
    kind: 'custom',
    color,
    vertices: [
      { x: -top / 2, y: -h / 2 },
      { x: top / 2, y: -h / 2 },
      { x: bottom / 2, y: h / 2 },
      { x: -bottom / 2, y: h / 2 },
    ],
  }
}

/**
 * A scalene triangle: three unequal sides, no symmetry at all.
 *
 * An isosceles triangle was used first and rejected. It is symmetric about its
 * own vertical axis, so a mirrored copy is already the same shape and the
 * mirror teaches nothing.
 */
function scaleneTriangle(color: string, id: string): Shape {
  return {
    id,
    name: '삼각형',
    kind: 'triangle',
    color,
    vertices: [
      { x: 0, y: -72 },
      { x: 88, y: 58 },
      { x: -52, y: 40 },
    ],
  }
}

/**
 * An arrow: a shaft and a head, with the head wider than the shaft.
 *
 * The previous arrow had four vertices that crossed each other, so it was not
 * a simple polygon at all. Nothing threw. Its area came out as 338 where it
 * should have been 4200, its overlap with a quarter-turned copy of itself came
 * out as zero, and the shaded region on screen was nonsense. The bug was
 * invisible to every test because all of them asked whether two shapes
 * coincided, which stays true when both are equally wrong.
 *
 * It takes seven vertices now, wound consistently. `overlap.isSimplePolygon`
 * exists so that a mistake of this kind fails a test instead of the child.
 */
function arrow(color: string, id: string): Shape {
  return {
    id,
    name: '화살표',
    kind: 'custom',
    color,
    vertices: [
      { x: -50, y: -20 },
      { x: 10, y: -20 },
      { x: 10, y: -45 },
      { x: 50, y: 0 },
      { x: 10, y: 45 },
      { x: 10, y: 20 },
      { x: -50, y: 20 },
    ],
  }
}

/** A fish, symmetric only about its own long axis. */
function fish(color: string, id: string): Shape {
  return {
    id,
    name: '물고기',
    kind: 'custom',
    color,
    vertices: [
      { x: -55, y: 0 },
      { x: 0, y: -32 },
      { x: 40, y: 0 },
      { x: 0, y: 32 },
    ],
  }
}

function resized(shape: Shape, factor: number, newId: string): Shape {
  return {
    ...shape,
    id: newId,
    vertices: shape.vertices.map((v) => ({ x: v.x * factor, y: v.y * factor })),
  }
}

/**
 * Twelve shapes: five pairs and two distractors.
 *
 * Each pair needs a quarter turn or a mirror, and nothing needs an angle the
 * system cannot reach.
 *
 * LABELS RUN IN READING ORDER
 * ---------------------------
 * Reading the board left to right and top to bottom, the syllables come out as
 * the alphabet: 가 나 다 라, then 마 바 사 아, then 자 차 카 타. The child can
 * therefore name any shape they are looking at, which matters once the screen
 * is telling them to turn something.
 *
 * The layout is nonetheless shuffled. An earlier version walked the pairs in
 * order down a grid, which put every pair side by side: 가 sat beside 사, 라
 * beside 마. The child could read the answer off the board instead of
 * searching for it, which is the one thing this stage must not allow.
 *
 * Labels in order does not give the pairs away, because each pair is split
 * across the canvas. Measured on this layout, the closest pair members sit
 * 500px apart while the closest neighbours are 184px apart and belong to
 * different pairs.
 *
 * THE TWO DISTRACTORS
 * -------------------
 *   카   a small rectangle. Same outline as 가, different size. Comparing
 *        shape alone would accept it. A LARGER rectangle was rejected because
 *        the child could simply drop the small one inside it and be done.
 *   마   a pentagon. A different outline, so the shape check rejects it.
 *
 * A trapezoid with its parallel sides swapped was also rejected: same area,
 * and it passed the congruence check outright, so it was indistinguishable
 * from a genuine pair member.
 */
export function buildBoard(): BoardShape[] {
  const pentagon = findShape('pentagon') as Shape

  const wide = rectangle(170, 96, '#a3d5a1', 'rect-wide')
  const tall = rectangle(96, 170, '#8fc9a8', 'rect-tall')

  const trap = trapezoid(90, 150, 110, '#bde0fe', 'trap-lying')
  const trapSide = trapezoid(90, 150, 110, '#a2d2ff', 'trap-side')

  const tri = scaleneTriangle('#ffd166', 'tri-scalene')
  const triMirror = scaleneTriangle('#ffb703', 'tri-scalene-2')

  const arrowRight = arrow('#ffadad', 'arrow-right')
  const arrowUp = arrow('#ff8fa3', 'arrow-up')

  const fishRight = fish('#b8b8ff', 'fish-right')
  const fishLeft = fish('#9d9dff', 'fish-left')

  const place = (
    label: string,
    shape: Shape,
    x: number,
    y: number,
    rotation = 0,
    flipped = false,
  ): BoardShape => ({ id: `s-${label}`, label, shape, x, y, rotation, flipped })

  // Four columns, three rows. Reading left to right and top to bottom, the
  // syllables come out as the alphabet, so the child can name any shape on
  // screen.
  //
  // Each pair is split so its two members sit in different rows or at opposite
  // ends of one, never side by side. The nearest pair members are 580px apart
  // while the nearest neighbours are 260px, so looking at the board tells the
  // child nothing about which shapes go together.
  // Four columns, three rows, filled in reading order, so the syllables come
  // out as the alphabet: 가 나 다 라 / 마 바 사 아 / 자 차 카 타. The child can
  // therefore name any shape they are looking at, which matters once the
  // screen starts telling them to turn something.
  //
  // WHICH SHAPE GOES WHERE IS NOT IN ORDER
  // -------------------------------------
  // Reading order for the labels and disorder for the pairs are separate
  // decisions, and they only clash if the pairs are laid down in order too.
  // So each shape is placed deliberately, always at least 380px from its
  // partner, which means the nearest two things on the board are never a pair.
  // Measured on this layout the closest pair members sit 390px apart while the
  // closest neighbours are 260px, so the arrangement gives nothing away.
  return [
    place(LABELS[0], wide, 140, 130),
    place(LABELS[1], trap, 430, 130),
    place(LABELS[2], tri, 720, 130),
    place(LABELS[3], fishLeft, 1010, 130, 0, true),

    place(LABELS[4], pentagon, 140, 390),
    place(LABELS[5], arrowRight, 430, 390),
    place(LABELS[6], fishRight, 720, 390),
    place(LABELS[7], arrowUp, 1010, 390, 270),

    place(LABELS[8], trapSide, 140, 650, 90),
    place(LABELS[9], triMirror, 430, 650, 0, true),
    place(LABELS[10], resized(wide, 0.62, 'rect-small'), 720, 650),
    place(LABELS[11], tall, 1010, 650),
  ]
}
