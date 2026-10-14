/**
 * The symmetry pass — where the child is, and whether the fold proved anything.
 *
 * Kept out of the screen so the sequence can be exercised without React, which is
 * the only way to check the parts that are easy to get wrong by eye: that a tap
 * without a drag never judges, that a redraw replaces the old axis, and that a
 * wrong axis unfolds while a right one stays folded.
 *
 * WHY THE CHILD DRAWS AND THE SYSTEM FOLDS
 * ----------------------------------------
 * The direction of the line IS the answer here, so the system must not choose
 * it — unlike the congruence board, where direction was the system's problem.
 * What the system does instead is fold along whatever was drawn, so the child
 * watches the claim succeed or fail rather than being told about it.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { SYMMETRY_ITEMS } from '../geometry/symmetryShapes'
import {
  judgeAxis,
  snapAxisToGrid,
  type Axis,
} from '../geometry/symmetry'
import type { Point } from '../geometry/types'
import {
  symmetryFoundFor,
  symmetryHintFor,
  symmetryInstructionFor,
  symmetryNoAxisFor,
} from '../components/symmText'
import type { Message } from '../components/tone'

/** how long the fold takes to travel and settle */
const FOLD_MS = 700
/** how long a miss is explained before the ask comes back */
const HINT_MS = 1800
/** how long the stars stay up after a correct find, as in the other units */
const STAR_MS = 1500

export interface SymmetryState {
  shapeIndex: number
  shape: (typeof SYMMETRY_ITEMS)[number]
  /** the snapped axis under discussion, if one has been drawn */
  axis: Axis | null
  /** the finger's line before it snaps, while it is being drawn */
  draft: { p: Point; q: Point } | null
  /** the fold is travelling */
  folding: boolean
  /** the fold has landed */
  folded: boolean
  /** true just after something worth celebrating */
  justFound: boolean
  /**
   * how many lines have been drawn, right or wrong
   *
   * Not shown. It exists so the popup can tell a repeated answer from the first
   * one: the sentence is the same every time, and without something that changed
   * the second miss would be met with silence.
   */
  attempts: number
  /** this shape is settled, right or proven otherwise */
  resolved: boolean
  instruction: string
  done: boolean
  message: Message
  foundCount: number
  total: number
  beginDraw: (p: Point) => void
  moveDraw: (p: Point) => void
  endDraw: () => void
  startShape: (index: number) => void
  nextShape: () => void
}

/** The judgement runs in the shape's own frame, so screen layout never enters it. */
export function useSymmetry(): SymmetryState {
  const [shapeIndex, setShapeIndex] = useState(0)
  const [axis, setAxis] = useState<Axis | null>(null)
  const [draft, setDraft] = useState<{ p: Point; q: Point } | null>(null)
  const [folding, setFolding] = useState(false)
  const [folded, setFolded] = useState(false)
  const [wrongKind, setWrongKind] = useState<'off' | 'miss' | null>(null)
  const [justFound, setJustFound] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [resolved, setResolved] = useState(false)
  const [foundCount, setFoundCount] = useState(0)
  const timer = useRef<number | null>(null)

  const shape = SYMMETRY_ITEMS[shapeIndex]
  const total = SYMMETRY_ITEMS.length
  const done = foundCount >= total

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    [],
  )

  const resetShape = useCallback((index: number) => {
    if (timer.current) window.clearTimeout(timer.current)
    setShapeIndex(index)
    setAxis(null)
    setDraft(null)
    setFolding(false)
    setFolded(false)
    setWrongKind(null)
    setJustFound(false)
    setResolved(false)
  }, [])

  const beginDraw = useCallback(
    (p: Point) => {
      if (folding || resolved) return
      setWrongKind(null)
      setDraft({ p, q: p })
    },
    [folding, resolved],
  )

  const moveDraw = useCallback((p: Point) => {
    setDraft((d) => (d ? { p: d.p, q: p } : d))
  }, [])

  const endDraw = useCallback(() => {
    // A tap is not an attempt. Judging it would answer a question the child
    // never asked — the same reason a bare tap on the congruence board counts
    // for nothing.
    const line = draft ? snapAxisToGrid(draft.p, draft.q) : null
    setDraft(null)
    if (!line || folding || resolved) return

    setAxis(line)
    setAttempts((n) => n + 1)
    setFolding(true)

    timer.current = window.setTimeout(() => {
      setFolded(true)
      const outcome = judgeAxis(shape.shape.vertices, line)
      if (outcome === 'hit') {
        // The fold is the proof either way: a match lands exactly, and on the
        // last shape the mismatch IS the answer rather than a failure.
        setJustFound(true)
        setResolved(true)
        setFoundCount((n) => n + 1)
        timer.current = window.setTimeout(() => setJustFound(false), STAR_MS)
        return
      }
      setWrongKind(outcome)
      timer.current = window.setTimeout(() => {
        setWrongKind(null)
        setFolding(false)
        setFolded(false)
        setAxis(null)
      }, HINT_MS)
    }, FOLD_MS)
  }, [draft, folding, resolved, shape])

  const startShape = useCallback((index: number) => resetShape(index), [resetShape])

  const nextShape = useCallback(() => {
    resetShape(Math.min(shapeIndex + 1, total - 1))
  }, [resetShape, shapeIndex, total])

  const symmetric = shape.axes > 0
  const message: Message =
    justFound && resolved
      ? symmetric
        ? symmetryFoundFor()
        : symmetryNoAxisFor()
      : wrongKind
        ? symmetryHintFor(wrongKind === 'off')
        : { tone: 'neutral' as const, icon: '', text: '' }

  return {
    shapeIndex,
    shape,
    axis,
    draft,
    folding,
    folded,
    justFound,
    attempts,
    resolved,
    instruction: symmetryInstructionFor(),
    done,
    message,
    foundCount,
    total,
    beginDraw,
    moveDraw,
    endDraw,
    startShape,
    nextShape,
  }
}
