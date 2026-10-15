/**
 * The drawing board — half a figure and its axis, and the other half to place.
 *
 * This is where the unit's facts are used rather than shown: a point goes where
 * its mirror image goes, which is the same distance from the axis on the other
 * side. So the first point walks itself first — square to the axis, carried
 * across, marked where it lands — with the method spoken over it, and only then
 * does the child place all three.
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
import { footOnAxis, mirrorOf } from '../geometry/symmetryParts'
import type { Line } from '../geometry/symmetryParts'
import type { Point } from '../geometry/types'
import {
  symmetryDrawInstructionFor,
  symmetryDrawMissedFor,
  symmetryDrawSuccessFor,
  SYMM_PARTS_HOW_CARRY,
  SYMM_PARTS_HOW_LEG,
} from '../components/symmPartsText'
import type { Message } from '../components/tone'

type DrawBoard = Extract<SymmetryBoard, { kind: 'draw' }>

/** how near the spot the child pressed a point may fall and still be it */
export const PLACE_TOLERANCE = 60
/** how long a miss is explained before the ask comes back */
const HINT_MS = 1800
/** how long the stars stay up after the last point lands */
const STAR_MS = 2000
/** how long a placed point takes to fly across before it lands */
const FLY_MS = 1400
/** how long each leg of the example walk is looked at before moving on */
const WALK_MS = 3600
/** how long the landed point is looked at before the placing starts */
const SHOWN_MS = 2000

export interface SymmetryDrawState {
  /** the half the child is given, with the axis as its straight edge */
  half: Point[]
  /** each found point with the given one it mirrors, so the scene draws no pairs */
  links: Array<{ given: Point; placed: Point }>
  axis: Line
  /** how many of the points are still to find */
  waiting: number
  /** the example walk: the given corner, its foot, its mirror, then placing */
  demo: { from: Point; foot: Point; to: Point }
  /** where the walk has got to: corner, foot, mirror, then placing */
  walk: number
  /** the point now flying across, from its given corner to its mirror spot */
  flying: { from: Point; to: Point } | null
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
  const [flying, setFlying] = useState<{ from: Point; to: Point } | null>(null)
  const [attempts, setAttempts] = useState(0)
  const timer = useRef<number | null>(null)

  const waiting = answers.length - placed.length
  const resolved = waiting === 0

  /* The example walks before any placing: given corner, foot, mirror, placing. */
  const [walk, setWalk] = useState(0)
  const walking = walk < 3
  /*
   * The walk demonstrates the topmost point: the highest corner is where the
   * eye goes first, so the method is shown where the child is already looking.
   */
  const demo = useMemo(() => {
    const top = givens.indexOf(givens.reduce((a, b) => (a.y < b.y ? a : b)))
    return {
      from: givens[top],
      foot: footOnAxis(givens[top], board.axis),
      to: answers[top],
    }
  }, [givens, answers, board.axis])

  useEffect(() => {
    if (!walking) return
    timer.current = window.setTimeout(() => setWalk((w) => w + 1), walk === 2 ? SHOWN_MS : WALK_MS)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [walking, walk])

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
      // No placing while the example is walking or a point is flying: either
      // would answer a question never asked.
      if (resolved || walking || flying) return
      setAttempts((n) => n + 1)
      // only the point still being asked for counts, so a stray press on a spot
      // already filled cannot skip ahead
      const at = placed.length
      const target = answers[at]
      if (distance(p, target) > PLACE_TOLERANCE) {
        setMiss(true)
        timer.current = window.setTimeout(() => setMiss(false), HINT_MS)
        return
      }
      setMiss(false)
      // The point flies from its given corner across to its mirror spot, so the
      // placing is watched arriving rather than appearing: arriving is the proof
      // it belongs there.
      setFlying({ from: givens[at], to: target })
      timer.current = window.setTimeout(() => {
        setFlying(null)
        setPlaced((prev) => [...prev, prev.length])
        setJustFound(true)
        timer.current = window.setTimeout(() => setJustFound(false), STAR_MS)
      }, FLY_MS)
    },
    [answers, givens, placed.length, resolved, walking, flying],
  )

  return {
    half,
    links: placed.map((_, at) => ({ given: givens[at], placed: answers[at] })),
    axis: board.axis,
    waiting,
    demo,
    walk,
    flying,
    resolved,
    justFound,
    attempts,
    instruction: symmetryDrawInstructionFor(waiting),
    message: miss
      ? symmetryDrawMissedFor()
      : justFound
        ? symmetryDrawSuccessFor(waiting)
        : walking
          ? { tone: 'success', icon: '👉', text: walk < 2 ? SYMM_PARTS_HOW_LEG : SYMM_PARTS_HOW_CARRY }
          : !resolved && !flying
            ? /*
               * Which point is awaited, as a popup every time: with the bottom
               * line gone this sentence is the only thing saying what to do, and
               * a new point awaited is something that just happened.
               */
              { tone: 'success', icon: '👉', text: symmetryDrawInstructionFor(waiting) }
            : { tone: 'neutral' as const, icon: '', text: '' },
    placeAt,
  }
}