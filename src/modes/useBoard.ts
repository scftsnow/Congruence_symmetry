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
import { findMatches, pairKey, shapePoints, transformOf } from '../geometry/pairs'
import { polygonCentroid, touching } from '../geometry/overlap'
import { APART, judge, turnedItem, type Turn } from '../geometry/verdict'
import {
  buildBoard,
  CANVAS_H,
  CANVAS_W,
  LABELS,
  TARGET_PAIRS,
  type BoardShape,
} from '../geometry/board'
import type { Point } from '../geometry/types'

export { buildBoard, CANVAS_H, CANVAS_W, TARGET_PAIRS, transformOf, shapePoints, pairKey, LABELS }
export type { BoardShape }

export function useBoard(released: boolean) {
  const [items, setItems] = useState<BoardShape[]>(() => buildBoard())
  const [held, setHeld] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<string[]>([])

  const move = useCallback((id: string, x: number, y: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, x, y } : i)))
  }, [])

  /**
   * The system performs the turn, and the shape lands on its partner.
   *
   * The work lives in geometry/turnedItem so the whole loop can be tested
   * without React: drop a shape slightly off, judge the stack, apply the turn,
   * and the pair has to come back registered.
   */
  const applyTurn = useCallback((id: string, turn: Turn) => {
    setItems((prev) => prev.map((i) => (i.id === id ? turnedItem(i, turn) : i)))
  }, [])

  const heldItem = held ? items.find((i) => i.id === held) : undefined

  /**
   * Judge the current stack.
   *
   * The `released` flag is a direct dependency: the memo recomputes when the
   * child lets go (false → true) and returns null on every move while the
   * finger is down (released stays false, so every recompute exits here).
   * A gate the memo does not depend on would never re-run.
   */
  const verdict = useMemo(() => {
    if (!released) return null
    if (!heldItem) return null
    const heldPoints = shapePoints(heldItem)

    const heldAt = polygonCentroid(heldPoints)

    let best: { points: Point[]; near: number } | null = null
    for (const other of items) {
      if (other.id === heldItem.id) continue
      const otherPoints = shapePoints(other)
      if (!touching(heldPoints, otherPoints)) continue

      // Where several shapes are in reach at once, the nearest is the one meant.
      const otherAt = polygonCentroid(otherPoints)
      const near = Math.hypot(heldAt.x - otherAt.x, heldAt.y - otherAt.y)
      if (!best || near < best.near) best = { points: otherPoints, near }
    }

    if (!best) return APART()
    return judge(best.points, heldPoints, CANVAS_W)
  }, [released, heldItem, items])

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