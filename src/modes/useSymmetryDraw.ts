/**
 * The drawing board — half a figure and its axis, and the other half to place.
 *
 * This is where the unit's facts are used rather than shown: a point goes where
 * its mirror image goes, which is the same distance from the axis on the other
 * side, so a child who has just measured that distance has everything they need
 * to place the next one without being told where it is.
 *
 * WHY A TAP AND NOT A DRAG
 * -------------------------
 * Placing a point is one decision, and a finger tapping where a point belongs
 * makes it. Dragging would ask for the point AND the hand it came from, and a
 * child drawing the heart's lobe by dragging would get a different curve each
 * time — so the shape they were asked to complete would be judged on their
 * drawing rather than on what they were asked about.
 *
 * A press that lands near enough is snapped exactly onto the mirror image. The
 * drawing that results is the true one, because the true one is the answer; the
 * part that is the child's is knowing where it goes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SYMM_CENTER, type SymmetryBoard } from '../geometry/symmetryShapes'
import { distance } from '../geometry/transforms'
import { mirrorOf } from '../geometry/symmetryParts'
import type { Line } from '../geometry/symmetryParts'
import type { Point } from '../geometry/types'
import {
  symmetryDrawInstructionFor,
  symmetryDrawMissedFor,
  symmetryDrawSuccessFor,
} from '../components/symmPartsText'
import type { Message } from '../components/tone'

type DrawBoard = Extract<SymmetryBoard, { kind: 'draw' }>

/** how near the spot the child pressed a point may fall and still be it */
export const PLACE_TOLERANCE = 60
/** how long a miss is explained before the ask comes back */
const HINT_MS = 1800
/** how long the stars stay up after the last point lands */
const STAR_MS = 1500

export interface SymmetryDrawState {
  /** the half the child is given, with the axis as its straight edge */
  half: Point[]
  /** each found point with the given one it mirrors, so the scene draws no pairs */
  links: Array<{ given: Point; placed: Point }>
  axis: Line
  /** how many of the points are still to find */
  waiting: number
  resolved: boolean
  justFound: boolean
  attempts: number
  instruction: string
  message: Message
  placeAt: (p: Point) => void
}

export function useSymmetryDraw(board: DrawBoard, onSettled: () => void): SymmetryDrawState {
  const half = useMemo(
    () => board.half.map((p) => ({ x: p.x + SYMM_CENTER.x, y: p.y + SYMM_CENTER.y })),
    [board],
  )
  const answers = useMemo(
    () =>
      board.place.map((i) => {
        const v = board.shape.vertices[i]
        return mirrorOf({ x: v.x + SYMM_CENTER.x, y: v.y + SYMM_CENTER.y }, board.axis)
      }),
    [board],
  )

  /**
   * Which corner of the given half each point mirrors.
   *
   * The half is a run of the outline's corners with the axis edge closed at the
   * end, so the three to find sit at the same place in the full outline as they
   * do in the half, less the two that stand on the axis.
   */
  const givens = useMemo(
    () =>
      board.place.map((i) => {
        const v = board.shape.vertices[i]
        return { x: v.x + SYMM_CENTER.x, y: v.y + SYMM_CENTER.y }
      }),
    [board],
  )
  const [placed, setPlaced] = useState<number[]>([])
  const [miss, setMiss] = useState(false)
  const [justFound, setJustFound] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const timer = useRef<number | null>(null)

  const waiting = answers.length - placed.length
  const resolved = waiting === 0

  /* Settling is reported, not derived — see useSymmetryParts for why. */
  useEffect(() => {
    if (resolved) onSettled()
  }, [resolved, onSettled])

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    [],
  )

  const placeAt = useCallback(
    (p: Point) => {
      if (resolved) return
      setAttempts((n) => n + 1)
      // only the point still being asked for counts, so a stray press on a spot
      // already filled cannot skip ahead
      const target = answers[placed.length]
      if (distance(p, target) > PLACE_TOLERANCE) {
        setMiss(true)
        timer.current = window.setTimeout(() => setMiss(false), HINT_MS)
        return
      }
      setMiss(false)
      setPlaced((prev) => [...prev, prev.length])
      setJustFound(true)
      timer.current = window.setTimeout(() => setJustFound(false), STAR_MS)
    },
    [answers, placed.length, resolved],
  )

  return {
    half,
    links: placed.map((_, at) => ({ given: givens[at], placed: answers[at] })),
    axis: board.axis,
    waiting,
    resolved,
    justFound,
    attempts,
    instruction: symmetryDrawInstructionFor(waiting),
    message: miss
      ? symmetryDrawMissedFor()
      : justFound
        ? symmetryDrawSuccessFor(waiting)
        : { tone: 'neutral' as const, icon: '', text: '' },
    placeAt,
  }
}