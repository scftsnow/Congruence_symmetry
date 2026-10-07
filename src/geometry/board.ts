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

/** An arrow. Its direction cannot be disguised, which is the point. */
function arrow(color: string, id: string): Shape {
  return {
    id,
    name: '화살표',
    kind: 'custom',
    color,
    vertices: [
      { x: -50, y: 26 },
      { x: 8, y: 26 },
      { x: 8, y: -26 },
      { x: 50, y: 0 },
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
 * system cannot reach. The distractors are traps for specific mistakes:
 *
 *   타   a small rectangle. Same outline as 가, different size. Comparing
 *        shape alone would accept it. A LARGER rectangle was rejected because
 *        the child could simply drop the small one inside it and be done.
 *   파   a pentagon. A different outline, so the shape check rejects it.
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

  return [
    // pair 1: wide and tall rectangles. A quarter turn lines them up.
    { id: 'ga', label: '\uAC00', shape: wide, x: 150, y: 130, rotation: 0, flipped: false },
    { id: 'sa', label: '\uC0AC', shape: tall, x: 420, y: 140, rotation: 0, flipped: false },

    // pair 2: the same trapezoid, lying and on its side.
    { id: 'na', label: '\uB098', shape: trap, x: 730, y: 140, rotation: 0, flipped: false },
    { id: 'da', label: '\uB2E4', shape: trapSide, x: 950, y: 160, rotation: 90, flipped: false },

    // pair 3: the same scalene triangle, mirrored.
    { id: 'ra', label: '\uB77C', shape: tri, x: 160, y: 350, rotation: 0, flipped: false },
    { id: 'ma', label: '\uB9C8', shape: triMirror, x: 450, y: 360, rotation: 0, flipped: true },

    // pair 4: arrows pointing different ways.
    { id: 'ba', label: '\uBC14', shape: arrowRight, x: 740, y: 360, rotation: 0, flipped: false },
    { id: 'aj', label: '\uC544', shape: arrowUp, x: 940, y: 370, rotation: 90, flipped: false },

    // pair 5: two fish, one mirrored.
    { id: 'ca', label: '\uCC28', shape: fishRight, x: 170, y: 590, rotation: 0, flipped: false },
    { id: 'ka', label: '\uCE74', shape: fishLeft, x: 440, y: 600, rotation: 0, flipped: true },

    // distractor 1: a small rectangle. Same outline as 가, smaller.
    { id: 'ta', label: '\uD0C0', shape: resized(wide, 0.62, 'rect-small'), x: 720, y: 590, rotation: 0, flipped: false },

    // distractor 2: a pentagon. A different outline entirely.
    { id: 'pa', label: '\uD310', shape: pentagon, x: 950, y: 620, rotation: 0, flipped: false },
  ]
}