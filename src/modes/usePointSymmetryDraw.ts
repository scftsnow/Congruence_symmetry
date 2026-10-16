/**
 * The drawing board — half a figure and its middle, and the other half to place.
 *
 * A point goes where its half turn about the middle puts it, so the first point
 * walks itself first — straight through the middle and out the same distance
 * the other side, marked where it lands — with the method spoken over it, and
 * only then does the child place the rest. A tap is one decision; a drag would
 * judge their drawing rather than what they were asked about. A press landing
 * near enough snaps exactly on, because the true drawing is the answer and
 * knowing where it goes is the child's part.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { POINT_SYMM_CENTER, type PointSymmetryBoard } from '../geometry/pointSymmetryShapes'
import { distance } from '../geometry/transforms'
import { turnOf } from '../geometry/pointSymmetry'
import type { Point } from '../geometry/types'
import {
  pointDrawInstructionFor,
  pointDrawMissedFor,
  pointDrawSuccessFor,
  POINT_PARTS_HOW_CARRY,
  POINT_PARTS_HOW_LEG,
} from '../components/pointSymmPartsText'
import type { Message } from '../components/tone'

type DrawBoard = Extract<PointSymmetryBoard, { kind: 'draw' }>

/** how near the spot the child pressed a point may fall and still be it */
export const POINT_PLACE_TOLERANCE = 60
/** how long a miss is explained before the ask comes back */
const HINT_MS = 1800
/** how long the stars stay up after the last point lands */
const STAR_MS = 2000
/** how long a placed point takes to fly across before it lands */
const FLY_MS = 1400
/** how long each step of the example walk lasts, except the segment being drawn */
const WALK_MS = 3600
/** how long the drawn segment step lasts: drawn, then its middle mark, looked at */
const LEG_MS = 5600
/** how long the landed point is looked at before the placing starts */
const SHOWN_MS = 3600
/** how long after the segment starts its middle mark may arrive */
const LEG_DRAWN_MS = 4000

export interface PointSymmetryDrawState {
  /** the half the child is given, with the middle on its straight edge */
  half: Point[]
  /** each found point with the given one it mirrors, so the scene draws no pairs */
  links: Array<{ given: Point; placed: Point }>
  center: Point
  /** how many of the points are still to find */
  waiting: number
  /** the example walk: the given corner, straight through, its mirror */
  demo: { from: Point; to: Point }
  /** where the walk has got to: corner, mirror, then placing */
  walk: number
  /** the point now flying across, from its given corner to its mirror spot */
  flying: { from: Point; to: Point } | null
  /** the walk has reached the mirror, so its mark may arrive */
  legDrawn: boolean
  resolved: boolean
  justFound: boolean
  attempts: number
  instruction: string
  message: Message
  placeAt: (p: Point) => void
}

export function usePointSymmetryDraw(board: DrawBoard, onSettled: () => void): PointSymmetryDrawState {
  const half = useMemo(
    () => board.half.map((p) => ({ x: p.x + POINT_SYMM_CENTER.x, y: p.y + POINT_SYMM_CENTER.y })),
    [board],
  )
  const answers = useMemo(
    () =>
      board.place.map((i) => {
        const v = board.shape.vertices[i]
        return turnOf({ x: v.x + POINT_SYMM_CENTER.x, y: v.y + POINT_SYMM_CENTER.y }, board.center)
      }),
    [board],
  )

  /*
   * Which corner of the given half each point mirrors: the same place in the
   * full outline, less the two standing on the middle's vertical.
   */
  const givens = useMemo(
    () =>
      board.place.map((i) => {
        const v = board.shape.vertices[i]
        return { x: v.x + POINT_SYMM_CENTER.x, y: v.y + POINT_SYMM_CENTER.y }
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

  /* The example walks before any placing: corner lit, segment drawn with its
   * middle marked, mirror marked, placing. */
  const [walk, setWalk] = useState(0)
  const walking = walk < 3
  /*
   * The walk demonstrates the topmost point: the highest corner is where the
   * eye goes first, so the method is shown where the child is already looking.
   */
  const demo = useMemo(() => {
    const top = givens.indexOf(givens.reduce((a, b) => (a.y < b.y ? a : b)))
    return { from: givens[top], to: answers[top] }
  }, [givens, answers])

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

  const [legDrawn, setLegDrawn] = useState(false)

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
      const at = answers.findIndex((target, i) => !placed.includes(i) && distance(p, target) <= POINT_PLACE_TOLERANCE)
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
    links: [...placed].sort((a, b) => a - b).map((at) => ({ given: givens[at], placed: answers[at] })),
    center: { ...board.center },
    waiting,
    demo,
    walk,
    flying,
    legDrawn,
    resolved,
    justFound,
    attempts,
    instruction: pointDrawInstructionFor(waiting),
    message: miss
      ? pointDrawMissedFor()
      : justFound
        ? pointDrawSuccessFor(waiting)
        : walking
          ? { tone: 'success', icon: '👉', text: walk < 1 ? POINT_PARTS_HOW_LEG : POINT_PARTS_HOW_CARRY }
          : !resolved && !flying
            ? /*
               * Which point is awaited, as a popup every time: with the bottom
               * line gone this sentence is the only thing saying what to do, and
               * a new point awaited is something that just happened.
               */
              { tone: 'success', icon: '👉', text: pointDrawInstructionFor(waiting) }
            : { tone: 'neutral' as const, icon: '', text: '' },
    placeAt,
  }
}
