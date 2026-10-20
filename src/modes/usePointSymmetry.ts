/**
 * One center board — the child taps the middle, then steers the turn by hand.
 *
 * Kept out of the screen so the sequence can be exercised without React: a tap
 * places the middle but judges nothing, a redraw replaces the old middle, and
 * a wrong middle turns back while a right one stays turned. The middle IS the
 * answer, so the system never chooses it — the copy follows the finger round
 * whatever was tapped.
 *
 * TAP FIRST, THEN DRAG
 * --------------------
 * The press chooses the middle and nothing else; the drag turns about it,
 * grab-relative, so the same sweep turns the same way from any side. A release
 * counts only near the half turn, where it snaps and is judged; anywhere else
 * the copy stays where the hand left it, silently, for the next drag.
 *
 * The board is passed in rather than counted here, because the unit is a run of
 * boards of different kinds and the run is what knows which one is up. The hook
 * is remounted per board, so this shape's state is never another shape's.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointSymmetryItem } from '../geometry/pointSymmetryShapes'
import { insideFigure, isDrag, judgeCenter, snapHalfTurn, snapPointToGrid, steeredRotation } from '../geometry/pointSymmetry'
import type { Point } from '../geometry/types'
import { pointSymmetryFoundFor, pointSymmetryHintFor, pointSymmetryInstructionFor, pointSymmetryNoCenterFor } from '../components/pointSymmText'
import type { Message } from '../components/tone'

/** how long a miss is explained before the ask comes back */
const HINT_MS = 1800
/** how long the stars stay up after a correct find, as in the other units */
const STAR_MS = 1500

export interface PointSymmetryState {
  shape: PointSymmetryItem
  /** the snapped middle under discussion, if one has been tapped */
  tapped: Point | null
  /** where the copy stands, in degrees about the middle */
  rotation: number
  /** the finger's press before it drags, while it is being drawn */
  draft: { p: Point; q: Point } | null
  /** true just after something worth celebrating */
  justFound: boolean
  /** how many taps and turns have been drawn: the nonce that re-arms the popup for repeats */
  attempts: number
  /** this shape is settled, right or proven otherwise */
  resolved: boolean
  instruction: string
  message: Message
  beginDraw: (p: Point) => void
  moveDraw: (p: Point) => void
  endDraw: (up: Point | null) => void
  /** claim "there is none": right once, wrong everywhere else, so it leaks nothing */
  denyClaim: () => void
}

export function usePointSymmetry(item: PointSymmetryItem, onSettled: () => void): PointSymmetryState {
  const [tapped, setTapped] = useState<Point | null>(null)
  const [rotation, setRotation] = useState(0)
  const [draft, setDraft] = useState<{ p: Point; q: Point } | null>(null)
  const [wrongKind, setWrongKind] = useState<'off' | 'miss' | 'deny' | null>(null)
  const [justFound, setJustFound] = useState(false)
  /**
   * The last attempt found the middle.
   *
   * Its sentence used to leave with the stars — a second and a half, which is
   * not long enough to read it. It stays until the child tries again, and the
   * popup it opens is read for as long as a success is read anywhere else.
   */
  const [found, setFound] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [resolved, setResolved] = useState(false)
  const timer = useRef<number | null>(null)
  /** the press this gesture steers from, and where the copy stood then */
  const pressRef = useRef<Point | null>(null)
  const baseRef = useRef(0)

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  const settle = useCallback(() => {
    setResolved(true)
    onSettled()
  }, [onSettled])

  const beginDraw = useCallback(
    (p: Point) => {
      if (wrongKind || resolved) return
      setWrongKind(null)
      setFound(false)
      setDraft({ p, q: p })
      pressRef.current = p
      baseRef.current = rotation
    },
    [wrongKind, resolved, rotation],
  )

  const moveDraw = useCallback(
    (p: Point) => {
      setDraft((d) => (d ? { p: d.p, q: p } : d))
      if (wrongKind || resolved) return
      const press = pressRef.current
      if (!press) return
      // A drag without a middle yet takes its press for one: the first thing a
      // child who never read the sentence does is drag, and a dead gesture
      // would answer that with nothing.
      const pivot = tapped ?? snapPointToGrid(press)
      if (!tapped) setTapped(pivot)
      setRotation(steeredRotation(pivot, press, p, baseRef.current))
    },
    [tapped, wrongKind, resolved],
  )

  /** everything that ends an attempt comes back here, so another drag can turn */
  const reopen = useCallback((after: number) => {
    timer.current = window.setTimeout(() => {
      setWrongKind(null)
      setTapped(null)
      /*
       * The rotation is left where the unwind put it: clearing it to zero here
       * would swing the copy a full circle backwards through the transition.
       */
    }, after)
  }, [])

  const endDraw = useCallback(
    (up: Point | null) => {
      const stroke = draft
      setDraft(null)
      pressRef.current = null
      if (!stroke || !up || wrongKind || resolved) return

      // A press without a drag places the middle and judges nothing: the
      // choice, not the claim.
      setAttempts((n) => n + 1)
      if (!isDrag(stroke.p, up)) {
        const middle = snapPointToGrid(up)
        if (!insideFigure(item.shape.vertices, middle)) {
          setWrongKind('off')
          reopen(HINT_MS)
          return
        }
        setTapped(middle)
        setRotation(0)
        return
      }

      // A release counts only near the half turn, where it snaps and is
      // judged. Anywhere else the copy stays where the hand left it, silently,
      // for the next drag to carry on.
      const pivot = tapped ?? snapPointToGrid(stroke.p)
      const snapped = snapHalfTurn(rotation)
      if (snapped === null) return
      setRotation(snapped)
      const outcome = judgeCenter(item.shape.vertices, pivot)
      if (outcome === 'hit') {
        // The turn is the proof either way: a middle lands exactly, and on the
        // last shape the mismatch IS the answer rather than a failure.
        setJustFound(true)
        setFound(true)
        timer.current = window.setTimeout(() => setJustFound(false), STAR_MS)
        settle()
        return
      }
      setFound(false)
      setWrongKind(outcome)
      // Back to where it started, animated: a wrong middle turns back while a
      // right one stays turned.
      setRotation(Math.round(snapped / 360) * 360)
      reopen(HINT_MS)
    },
    [draft, tapped, rotation, wrongKind, resolved, item, reopen, settle],
  )

  const denyClaim = useCallback(() => {
    if (wrongKind || resolved) return
    setAttempts((n) => n + 1)
    if (item.centers === 0) {
      setJustFound(true)
      setFound(true)
      settle()
      timer.current = window.setTimeout(() => setJustFound(false), STAR_MS)
      return
    }
    setWrongKind('deny')
    reopen(HINT_MS)
  }, [wrongKind, resolved, item.centers, reopen, settle])

  const symmetric = item.centers > 0
  const message: Message = found
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
    rotation,
    draft,
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
