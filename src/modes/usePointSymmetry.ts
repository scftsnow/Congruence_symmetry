/**
 * One center board — where the child is on this shape, and whether the turn proved
 * anything.
 *
 * Kept out of the screen so the sequence can be exercised without React: that a
 * tap off the figure never judges, and that a wrong middle turns back while a
 * right one stays turned. The middle IS the answer here, so the system must not
 * choose it — it turns halfway round whatever was tapped, and the child watches
 * the claim land or miss.
 *
 * The board is passed in rather than counted here, because the unit is a run of
 * boards of different kinds and the run is what knows which one is up. The hook
 * is remounted per board, so this shape's state is never another shape's.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointSymmetryItem } from '../geometry/pointSymmetryShapes'
import { judgeCenter } from '../geometry/pointSymmetry'
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
  /** the tapped middle under discussion, if one has been tapped */
  tapped: Point | null
  /** the turn is travelling */
  turning: boolean
  /** the turn has landed */
  turned: boolean
  /** true just after something worth celebrating */
  justFound: boolean
  /** how many middles have been tapped: the nonce that re-arms the popup for repeats */
  attempts: number
  /** this shape is settled, right or proven otherwise */
  resolved: boolean
  instruction: string
  message: Message
  tapCenter: (p: Point) => void
  /** claim "there is none": right once, wrong everywhere else, so it leaks nothing */
  denyClaim: () => void
}

export function usePointSymmetry(item: PointSymmetryItem, onSettled: () => void): PointSymmetryState {
  const [tapped, setTapped] = useState<Point | null>(null)
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

  /** everything that ends an attempt comes back here, so another point can be tapped */
  const reopen = useCallback((after: number) => {
    timer.current = window.setTimeout(() => {
      setWrongKind(null)
      setTurning(false)
      setTurned(false)
      setTapped(null)
    }, after)
  }, [])

  const tapCenter = useCallback((p: Point) => {
    // A tap is always an attempt here, unlike a tap on the axis board: there is
    // no gesture to complete, only a middle to mean.
    if (turning || resolved) return

    setTapped(p)
    setAttempts((n) => n + 1)
    setTurning(true)
    const shape = item

    timer.current = window.setTimeout(() => {
      setTurned(true)
      const outcome = judgeCenter(shape.shape.vertices, p)
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
  }, [turning, resolved, item, reopen, settle])

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
      : { tone: 'neutral' as const, icon: '', text: '' }

  return {
    shape: item,
    tapped,
    turning,
    turned,
    justFound,
    attempts,
    resolved,
    instruction: pointSymmetryInstructionFor(),
    message,
    tapCenter,
    denyClaim,
  }
}