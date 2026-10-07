/**
 * Board state — what the child is holding and what has matched.
 *
 * The child only ever moves a shape. They never choose an angle: once a stack
 * is judged, the system applies the winning turn itself, because offering a
 * rotate button would imply direction matters, which is the opposite of what
 * this unit teaches.
 *
 * Geometry lives in geometry/ so it can be tested without React:
 *   board.ts     what is on the table
 *   pairs.ts     which shapes currently coincide
 *   verdict.ts   what a stack means, and which turn would fix it
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  findMatches,
  pairKey,
  sameCongruence,
  shapePoints,
  transformOf,
} from '../geometry/pairs'
import { judge, type Turn, type VerdictResult } from '../geometry/verdict'
import { buildBoard, CANVAS_H, CANVAS_W, TARGET_PAIRS, type BoardShape } from '../geometry/board'

export { buildBoard, CANVAS_H, CANVAS_W, TARGET_PAIRS, transformOf, shapePoints, pairKey }
export type { BoardShape }

export function useBoard() {
  const [items, setItems] = useState<BoardShape[]>(() => buildBoard())
  const [held, setHeld] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<string[]>([])

  const move = useCallback((id: string, x: number, y: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, x, y } : i)))
  }, [])

  /** The system performs the turn, so the child watches the coincidence. */
  const applyTurn = useCallback((id: string, turn: Turn) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              rotation: i.rotation + turn.degrees,
              flipped: i.flipped !== turn.flipped,
            }
          : i,
      ),
    )
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

  /**
   * Judge the current stack.
   *
   * A child may drop a shape near several others, so the nearest
   * same-outline neighbour is the one under discussion. Shapes with a
   * different outline are ignored here and reported by the shape check
   * instead, which is what lets "크기가 달라" be named as its own case.
   */
  const verdict: VerdictResult | null = useMemo(() => {
    if (!heldItem) return null
    const heldPoints = shapePoints(heldItem)
    const partner = items.find(
      (other) =>
        other.id !== heldItem.id &&
        sameCongruence(heldPoints, shapePoints(other), CANVAS_W),
    )
    if (!partner) {
      // Nothing beneath with a matching outline. Still report the overlap, so
      // the child sees how far apart they are.
      return judge(heldPoints, heldPoints, CANVAS_W)
    }
    return judge(shapePoints(partner), heldPoints, CANVAS_W)
  }, [heldItem, items])

  return {
    items,
    held,
    heldItem,
    setHeld,
    move,
    applyTurn,
    pairs,
    verdict,
    foundCount: confirmed.length,
    target: TARGET_PAIRS,
    confirmed,
    reset,
    canvas: { width: CANVAS_W, height: CANVAS_H },
  }
}