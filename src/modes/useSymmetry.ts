/**
 * The symmetry pass — where the child is, and whether the fold proved anything.
 *
 * Kept out of the screen so the sequence can be exercised without React, which is
 * the only way to check the parts that are easy to get wrong by eye: that a tap
 * without a drag never judges, that a redraw replaces the old axis, and that a
 * wrong axis unfolds while a right one stays folded. The line's direction IS
 * the answer here, so the system must not choose it — it folds along whatever
 * was drawn instead, and the child watches the claim land or miss.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { SYMMETRY_ITEMS } from '../geometry/symmetryShapes'
import {
  judgeAxis,
  matchScreenAxis,
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
/** how long a non-final find stays folded: without reopening, no second line could ever be drawn */
const UNFOLD_MS = 1500

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
  /** how many lines have been drawn: the nonce that re-arms the popup for repeats */
  attempts: number
  /** the drawn lines that already counted, still on screen as found axes */
  foundLines: Axis[]
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

export function useSymmetry(): SymmetryState {
  const [shapeIndex, setShapeIndex] = useState(0)
  const [axis, setAxis] = useState<Axis | null>(null)
  const [draft, setDraft] = useState<{ p: Point; q: Point } | null>(null)
  const [folding, setFolding] = useState(false)
  const [folded, setFolded] = useState(false)
  const [wrongKind, setWrongKind] = useState<'off' | 'miss' | 'dup' | null>(null)
  const [justFound, setJustFound] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [resolved, setResolved] = useState(false)
  const [foundCount, setFoundCount] = useState(0)
  /** which true axes have been found, by index into findAxes */
  const [foundIdx, setFoundIdx] = useState<number[]>([])
  const [foundLines, setFoundLines] = useState<Axis[]>([])
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
    setFoundIdx([])
    setFoundLines([])
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
      // A shape with several axes needs every one of them: one right answer
      // settles one axis, and only the last one settles the shape. A repeat of
      // an axis already found is not wrong, only done — it unfolds with its own
      // hint, which names no count, because the found lines staying on screen
      // already show how far along this is.
      const idx =
        outcome === 'hit' && shape.axes > 0 ? matchScreenAxis(shape.shape.vertices, line) : -1
      const isNew = shape.axes === 0 || (idx >= 0 && !foundIdx.includes(idx))
      if (outcome === 'hit' && isNew) {
        setFoundIdx((prev) => (idx >= 0 ? [...prev, idx] : prev))
        setFoundLines((prev) => [...prev, line])
        setJustFound(true)
        timer.current = window.setTimeout(() => setJustFound(false), STAR_MS)
        if (shape.axes === 0 || foundIdx.length + 1 >= shape.axes) {
          setResolved(true)
          setFoundCount((n) => n + 1)
        } else {
          timer.current = window.setTimeout(() => {
            setFolding(false)
            setFolded(false)
            setAxis(null)
          }, UNFOLD_MS)
        }
        return
      }
      setWrongKind(outcome === 'hit' ? 'dup' : outcome)
      timer.current = window.setTimeout(() => {
        setWrongKind(null)
        setFolding(false)
        setFolded(false)
        setAxis(null)
      }, HINT_MS)
    }, FOLD_MS)
  }, [draft, folding, resolved, shape, foundIdx])

  const startShape = useCallback((index: number) => resetShape(index), [resetShape])

  const nextShape = useCallback(() => {
    resetShape(Math.min(shapeIndex + 1, total - 1))
  }, [resetShape, shapeIndex, total])

  const symmetric = shape.axes > 0
  const message: Message =
    justFound
      ? resolved && !symmetric
        ? symmetryNoAxisFor()
        : symmetryFoundFor()
      : wrongKind
        ? symmetryHintFor(wrongKind)
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
    foundLines,
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
