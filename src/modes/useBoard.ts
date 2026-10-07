/**
 * Board state for the congruence stage.
 *
 * ONE SCREEN, NOT TWO
 * -------------------
 * An earlier build split this into "find the pair, then stack it", with a
 * shape picker in front. That was wrong twice over. Congruence is defined by
 * complete overlap, so finding and proving are the same act: the child drags
 * a shape onto another, rotates or flips until they coincide, and that
 * coincidence is the answer. There is nothing to pick first.
 *
 * THE THREE PAIRS, AND WHY EACH IS WORTH FINDING
 * ----------------------------------------------
 *   가 · 사   squares, already facing the same way. The easy one.
 *   나 · 라   triangles, identical as drawn. The child confirms by eye.
 *   다 · 바   trapezoids: the same one lying down and tipped onto its side.
 *             A trapezoid has no rotational symmetry, so neither can match
 *             until the child turns one. This is where "direction does not
 *             matter" becomes something they do rather than something they
 *             are told.
 *
 * THE DISTRACTORS
 * ---------------
 *   마   a large square. Same outline as 가 and 사, so comparing shape alone
 *        would accept it. Only size separates them, and size is half of what
 *        congruence means.
 *   아   a pentagon. A different outline entirely.
 *
 * All geometry lives in geometry/pairs.ts so it can be tested without React.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Point, Shape } from '../geometry/types'
import {
  findMatches,
  heldOverlap,
  pairKey,
  shapePoints,
  transformOf,
  type Matchable,
} from '../geometry/pairs'
import { findShape } from '../geometry/shapes'

export interface BoardShape extends Matchable {
  /** hangul syllable shown under the shape */
  label: string
}

export const CANVAS_W = 1000
export const CANVAS_H = 680
export const TARGET_PAIRS = 3

/**
 * A trapezoid: one pair of parallel sides of different lengths.
 *
 * Chosen over a rectangle for the quarter-turn pair. A rectangle is symmetric
 * under 90 degree rotation, so rotating one leaves it unchanged and it already
 * matches the other orientation, which makes the lesson invisible.
 */
function trapezoid(top: number, bottom: number, height: number, color: string): Shape {
  return {
    id: 'trapezoid-' + top + 'x' + bottom,
    name: '사다리꼴',
    kind: 'custom',
    color,
    vertices: [
      { x: -top / 2, y: -height / 2 },
      { x: top / 2, y: -height / 2 },
      { x: bottom / 2, y: height / 2 },
      { x: -bottom / 2, y: height / 2 },
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

export function buildBoard(): BoardShape[] {
  const square = findShape('square') as Shape
  const triangle = findShape('triangle') as Shape
  const pentagon = findShape('pentagon') as Shape
  const trap = trapezoid(90, 150, 100, '#a3d5a1')

  return [
    // pair 1: squares, same orientation, no work needed
    { id: 'ga', label: '\uAC00', shape: square, x: 120, y: 130, rotation: 0, flipped: false },
    { id: 'sa', label: '\uC0AC', shape: square, x: 780, y: 130, rotation: 0, flipped: false },

    // pair 2: triangles, identical as drawn
    { id: 'na', label: '\uB098', shape: triangle, x: 400, y: 120, rotation: 0, flipped: false },
    {
      id: 'ra',
      label: '\uB77C',
      shape: resized(triangle, 1, 'triangle-copy'),
      x: 860,
      y: 380,
      rotation: 0,
      flipped: false,
    },

    // pair 3: the same trapezoid. `ba` is placed already turned 90 degrees,
    // so as drawn they do not overlap and the child must turn `da`.
    { id: 'da', label: '\uB2E4', shape: trap, x: 250, y: 400, rotation: 0, flipped: false },
    {
      id: 'ba',
      label: '\uBC14',
      shape: resized(trap, 1, 'trap-copy'),
      x: 650,
      y: 420,
      rotation: 90,
      flipped: false,
    },

    // distractor: a larger square, same outline, so only size separates it
    {
      id: 'ma',
      label: '\uB9C8',
      shape: resized(square, 1.45, 'square-large'),
      x: 450,
      y: 590,
      rotation: 0,
      flipped: false,
    },

    // distractor: a different outline
    { id: 'a', label: '\uC544', shape: pentagon, x: 120, y: 610, rotation: 0, flipped: false },
  ]
}

export { transformOf, shapePoints, pairKey }

export function useBoard() {
  const [items, setItems] = useState<BoardShape[]>(() => buildBoard())
  const [held, setHeld] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<string[]>([])

  const move = useCallback((id: string, x: number, y: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, x, y } : i)))
  }, [])

  const rotateBy = useCallback((id: string, deg: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, rotation: i.rotation + deg } : i)))
  }, [])

  const flip = useCallback((id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, flipped: !i.flipped } : i)))
  }, [])

  const pairs = useMemo(() => findMatches(items, CANVAS_W), [items])

  const currentKeys = pairs.map((p) => p.key).sort().join(',')
  const [seenKeys, setSeenKeys] = useState('')

  // Derived state changes in an effect, never in the render body.
  useEffect(() => {
    if (currentKeys === seenKeys) return
    const next = new Set(currentKeys.split(',').filter(Boolean))
    const previous = new Set(seenKeys.split(',').filter(Boolean))
    const gained = [...next].filter((k) => !previous.has(k))
    if (gained.length) setConfirmed((prev) => [...new Set([...prev, ...gained])])
    setSeenKeys(currentKeys)
  }, [currentKeys, seenKeys])

  const reset = () => {
    setItems(buildBoard())
    setHeld(null)
    setConfirmed([])
    setSeenKeys('')
  }

  const heldItem = held ? items.find((i) => i.id === held) : undefined
  const overlap = useMemo(
    () => (heldItem ? heldOverlap(heldItem, items, CANVAS_W) : null),
    [heldItem, items],
  )

  return {
    items,
    held,
    heldItem,
    setHeld,
    move,
    rotateBy,
    flip,
    pairs,
    overlap,
    foundCount: confirmed.length,
    target: TARGET_PAIRS,
    confirmed,
    reset,
    canvas: { width: CANVAS_W, height: CANVAS_H },
  }
}

export type { Point }