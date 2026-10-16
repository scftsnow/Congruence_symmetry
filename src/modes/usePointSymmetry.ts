/**
 * One center board — where the child is on this shape, and whether the turn proved
 * anything.
 *
 * Kept out of the screen so the sequence can be exercised without React: that a
 * press without a drag never judges, that a redraw replaces the old middle, and
 * that a wrong middle turns back while a right one stays turned. The middle IS
 * the answer here, so the system must not choose it — it turns halfway round
 * whatever was drawn, and the child watches the claim land or miss. How far the
 * finger went is never read: every drag turns the same fixed half turn, and only
 * its direction steers the copy clockwise or back.
 *
 * The board is passed in rather than counted here, because the unit is a run of
 * boards of different kinds and the run is what knows which one is up. The hook
 * is remounted per board, so this shape's state is never another shape's.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointSymmetryItem } from '../geometry/pointSymmetryShapes'
import { isDrag, judgeCenter, snapPointToGrid, turnDirection } from '../geometry/pointSymmetry'
import type { Point } from '../geometry/types'
import {
  pointSymmetryFoundFor,
  pointSymmetryHintFor,
  pointSymmetryInstructionFor,
  pointSymmetryNoCenterFor,
} from '../components/pointSymmText'
import type { Message } from '../components/tone'

/** how long the half turn takes to travel and settle */
const TURN_MS = 700
/** how long a miss is explained before the ask comes back */
const HINT_MS = 1800
/** how long the stars stay up after a correct find, as in the other units */
const STAR_MS = 1500

export interface PointSymmetryState {
  shape: PointSymmetryItem
  /** the snapped middle under discussion, if one has been drawn */
  tapped: Point | null
  /** clockwise or back: the drag's direction, and nothing else about it */
  direction: 1 | -1
  /** the finger's press before it drags, while it is being drawn */
  draft: { p: Point; q: Point } | null
  /** the turn is travelling */
  turning: boolean
  /** the turn has landed */
  turned: boolean
  /** true just after something worth celebrating */
  justFound: boolean
  /** how many drags have been drawn: the nonce that re-arms the popup for repeats */
  attempts: number
  /** this shape is settled, right or proven otherwise */
  resolved: boolean
  instruction: string
  message: Message
  beginDraw: (p: Point) => void
  moveDraw: (p: Point) => void
  endDraw: () => void
  /** claim "there is none": right once, wrong everywhere else, so it leaks nothing */
  denyClaim: () => void
}

export function usePointSymmetry(item: PointSymmetryItem, onSettled: () => void): PointSymmetryState {
  const [tapped, setTapped] = useState<Point | null>(null)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [draft, setDraft] = useState<{ p: Point; q: Point } | null>(null)
  const [turning, setTurning] = useState(false)
  const [turned, setTurned] = useState(false)
  const [wrongKind, setWrongKind] = useState<'off' | 'miss' | 'deny' | null>(null)
  const [justFound, setJustFound] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [resolved, setResolved] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  const settle = useCallback(() => {
    setResolved(true)
    onSettled()
  }, [onSettled])

  const beginDraw = useCallback((p: Point) => {
    if (turning || resolved) return
    setWrongKind(null)
    setDraft({ p, q: p })
  }, [turning, resolved])

  const moveDraw = useCallback((p: Point) => {
    setDraft((d) => (d ? { p: d.p, q: p } : d))
  }, [])

  /** everything that ends an attempt comes back here, so another drag can turn */
  const reopen = useCallback((after: number) => {
    timer.current = window.setTimeout(() => {
      setWrongKind(null)
      setTurning(false)
      setTurned(false)
      setTapped(null)
    }, after)
  }, [])

  const endDraw = useCallback(() => {
    // A press without a drag is not an attempt: judging it would answer a
    // question the child never asked — the same reason a bare tap on the axis
    // board counts for nothing.
    const stroke = draft
    setDraft(null)
    if (!stroke || !isDrag(stroke.p, stroke.q) || turning || resolved) return

    const middle = snapPointToGrid(stroke.p)
    setTapped(middle)
    setDirection(turnDirection(stroke.p, stroke.q))
    setAttempts((n) => n + 1)
    setTurning(true)
    const shape = item

    timer.current = window.setTimeout(() => {
      setTurned(true)
      const outcome = judgeCenter(shape.shape.vertices, middle)
      if (outcome === 'hit') {
        // The turn is the proof either way: a middle lands exactly, and on the
        // last shape the mismatch IS the answer rather than a failure.
        setJustFound(true)
        timer.current = window.setTimeout(() => setJustFound(false), STAR_MS)
        settle()
        return
      }
      setWrongKind(outcome)
      reopen(HINT_MS)
    }, TURN_MS)
  }, [draft, turning, resolved, item, reopen, settle])

  const denyClaim = useCallback(() => {
    if (turning || resolved) return
    setAttempts((n) => n + 1)
    if (item.centers === 0) {
      setJustFound(true)
      settle()
      timer.current = window.setTimeout(() => setJustFound(false), STAR_MS)
      return
    }
    setWrongKind('deny')
    reopen(HINT_MS)
  }, [turning, resolved, item.centers, reopen, settle])

  const symmetric = item.centers > 0
  const message: Message = justFound
    ? resolved && !symmetric
      ? pointSymmetryNoCenterFor()
      : pointSymmetryFoundFor()
    : wrongKind
      ? pointSymmetryHintFor(wrongKind)
      : attempts === 0
        ? { tone: 'success', icon: '👉', text: pointSymmetryInstructionFor() }
        : { tone: 'neutral' as const, icon: '', text: '' }

  return {
    shape: item,
    tapped,
    direction,
    draft,
    turning,
    turned,
    justFound,
    attempts,
    resolved,
    instruction: pointSymmetryInstructionFor(),
    message,
    beginDraw,
    moveDraw,
    endDraw,
    denyClaim,
  }
}
