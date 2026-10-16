/**
 * The drawing board — half a figure and its axis, and the other half to place.
 *
 * A point goes where its mirror image goes, so the first point walks itself
 * first — square to the axis, carried across, marked where it lands — with the
 * method spoken over it, and only then does the child place all three. A tap is
 * one decision; a drag would judge their drawing rather than what they were
 * asked about. A press landing near enough snaps exactly on, because the true
 * drawing is the answer and knowing where it goes is the child's part.
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
/** how long each step of the example walk lasts, except the leg being drawn */
const WALK_MS = 3600
/** how long the leg step lasts: drawn, then its square at four seconds, looked at */
const LEG_MS = 5600
/** how long the landed point is looked at before the placing starts */
const SHOWN_MS = 3600
/** how long after the leg starts its square may arrive */
const LEG_DRAWN_MS = 4000

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
  /** the leg has finished being drawn, so its square may arrive */
  legDrawn: boolean
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

  /* Which corner of the given half each point mirrors: same place in the full outline, less the two on the axis. */
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
  const legTimer = useRef<number | null>(null)

  const waiting = answers.length - placed.length
  const resolved = waiting === 0

  /* The example walks before any placing: given corner, foot, mirror, placing. */
  const [walk, setWalk] = useState(0)
  const walking = walk < 3
  /*
   * The square names what the leg just proved, so it arrives once the leg has
   * finished being drawn — tracked in state rather than a CSS delay, because
   * state is what the board can observe and test.
   */
  const [legDrawn, setLegDrawn] = useState(false)
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
    timer.current = window.setTimeout(
      () => setWalk((w) => w + 1),
      walk === 1 ? LEG_MS : walk === 2 ? SHOWN_MS : WALK_MS,
    )
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [walking, walk])

  useEffect(() => {
    if (walk !== 1) return
    legTimer.current = window.setTimeout(() => setLegDrawn(true), LEG_DRAWN_MS)
    return () => {
      if (legTimer.current) window.clearTimeout(legTimer.current)
    }
  }, [walk])

  /* Settling is reported, not derived — see useSymmetryParts for why. */
  useEffect(() => {
    if (resolved) onSettled()
  }, [resolved, onSettled])

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
      if (legTimer.current) window.clearTimeout(legTimer.current)
    },
    [],
  )

  const placeAt = useCallback(
    (p: Point) => {
      // No placing while the example is walking or a point is flying: either
      // would answer a question never asked.
      if (resolved || walking || flying) return
      setAttempts((n) => n + 1)
      // Any unplaced point counts: the figure is the same figure in any order,
      // and requiring a fixed order turns a drawing into a guessing game.
      const at = answers.findIndex((target, i) => !placed.includes(i) && distance(p, target) <= PLACE_TOLERANCE)
      if (at === -1) {
        setMiss(true)
        timer.current = window.setTimeout(() => setMiss(false), HINT_MS)
        return
      }
      setMiss(false)
      // The point flies from its given corner across to its mirror spot, so the
      // placing is watched arriving rather than appearing: arriving is the proof
      // it belongs there.
      setFlying({ from: givens[at], to: answers[at] })
      timer.current = window.setTimeout(() => {
        setFlying(null)
        setPlaced((prev) => [...prev, at])
        setJustFound(true)
        timer.current = window.setTimeout(() => setJustFound(false), STAR_MS)
      }, FLY_MS)
    },
    [answers, givens, placed, resolved, walking, flying],
  )

  return {
    half,
    // Sorted back into outline order so the completed polygon winds one way
    // round whichever order the points were placed in.
    links: [...placed].sort((a, b) => a - b).map((at) => ({ given: givens[at], placed: answers[at] })),
    axis: board.axis,
    waiting,
    demo,
    walk,
    flying,
    legDrawn,
    resolved,
    justFound,
    attempts,
    instruction: symmetryDrawInstructionFor(waiting),
    message: miss
      ? symmetryDrawMissedFor()
      : justFound
        ? symmetryDrawSuccessFor(waiting)
        : walking
          ? { tone: 'success', icon: '👉', text: walk < 1 ? SYMM_PARTS_HOW_LEG : SYMM_PARTS_HOW_CARRY }
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