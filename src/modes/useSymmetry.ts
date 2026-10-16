/**
 * One axis board — where the child is on this shape, and whether the fold proved
 * anything.
 *
 * Kept out of the screen so the sequence can be exercised without React: that a
 * tap without a drag never judges, that a redraw replaces the old axis, and that
 * a wrong axis unfolds while a right one stays folded. The line's direction IS
 * the answer, so the system must not choose it — it folds along whatever was
 * drawn, and the child watches the claim land or miss.
 *
 * The board is passed in rather than counted here, because the unit is a run of
 * boards of different kinds and the run is what knows which one is up. The hook
 * is remounted per board, so this shape's state is never another shape's.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SymmetryItem } from '../geometry/symmetryShapes'
import { judgeAxis, matchScreenAxis, snapAxisToGrid, type Axis } from '../geometry/symmetry'
import type { Point } from '../geometry/types'
import {
  symmetryFoundFor,
  symmetryHintFor,
  symmetryInstructionFor,
  symmetryMoreFor,
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
  shape: SymmetryItem
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
  /** the drawn lines that counted, still on screen as found axes */
  foundLines: Axis[]
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

export function useSymmetry(item: SymmetryItem, onSettled: () => void): SymmetryState {
  const [axis, setAxis] = useState<Axis | null>(null)
  const [draft, setDraft] = useState<{ p: Point; q: Point } | null>(null)
  const [folding, setFolding] = useState(false)
  const [folded, setFolded] = useState(false)
  const [wrongKind, setWrongKind] = useState<'off' | 'miss' | 'dup' | 'deny' | null>(null)
  const [justFound, setJustFound] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [resolved, setResolved] = useState(false)
  /** which true axes have been found, by index into findAxes */
  const [foundIdx, setFoundIdx] = useState<number[]>([])
  const [foundLines, setFoundLines] = useState<Axis[]>([])
  const timer = useRef<number | null>(null)

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  const settle = useCallback(() => {
    setResolved(true)
    onSettled()
  }, [onSettled])

  const beginDraw = useCallback((p: Point) => {
    if (folding || resolved) return
    setWrongKind(null)
    setDraft({ p, q: p })
  }, [folding, resolved])

  const moveDraw = useCallback((p: Point) => {
    setDraft((d) => (d ? { p: d.p, q: p } : d))
  }, [])

  /** everything that ends an attempt comes back here, so a second line can be drawn */
  const reopen = useCallback((after: number) => {
    timer.current = window.setTimeout(() => {
      setWrongKind(null)
      setFolding(false)
      setFolded(false)
      setAxis(null)
    }, after)
  }, [])

  const endDraw = useCallback(() => {
    // A tap is not an attempt: judging it would answer a question never asked.
    const line = draft ? snapAxisToGrid(draft.p, draft.q) : null
    setDraft(null)
    if (!line || folding || resolved) return

    setAxis(line)
    setAttempts((n) => n + 1)
    setFolding(true)
    const shape = item

    timer.current = window.setTimeout(() => {
      setFolded(true)
      const outcome = judgeAxis(shape.shape.vertices, line)
      // One right answer settles one axis, and only the last settles the shape; a
      // repeat is not wrong, only done — its hint names no count.
      const idx =
        outcome === 'hit' && shape.axes > 0 ? matchScreenAxis(shape.shape.vertices, line) : -1
      const isNew = shape.axes === 0 || (idx >= 0 && !foundIdx.includes(idx))
      if (outcome === 'hit' && isNew) {
        setFoundIdx((prev) => (idx >= 0 ? [...prev, idx] : prev))
        setFoundLines((prev) => [...prev, line])
        setJustFound(true)
        timer.current = window.setTimeout(() => setJustFound(false), STAR_MS)
        if (shape.axes === 0 || foundIdx.length + 1 >= shape.axes) {
          settle()
        } else reopen(UNFOLD_MS)
        return
      }
      setWrongKind(outcome === 'hit' ? 'dup' : outcome)
      reopen(HINT_MS)
    }, FOLD_MS)
  }, [draft, folding, resolved, foundIdx, item, reopen, settle])

  const denyClaim = useCallback(() => {
    if (folding || resolved) return
    setAttempts((n) => n + 1)
    if (item.axes === 0) {
      setJustFound(true)
      settle()
      timer.current = window.setTimeout(() => setJustFound(false), STAR_MS)
      return
    }
    setWrongKind('deny')
    reopen(HINT_MS)
  }, [folding, resolved, item.axes, reopen, settle])

  const symmetric = item.axes > 0
  // A find says one thing when it settles the shape, another when axes remain; the
  // teal lines on the board show how many, never the sentence.
  const message: Message = justFound
    ? resolved
      ? symmetric
        ? symmetryFoundFor()
        : symmetryNoAxisFor()
      : symmetryMoreFor()
    : wrongKind
      ? symmetryHintFor(wrongKind)
      : attempts === 0
        ? { tone: 'success', icon: '👉', text: symmetryInstructionFor() }
        : { tone: 'neutral' as const, icon: '', text: '' }

  return {
    shape: item,
    axis,
    draft,
    folding,
    folded,
    justFound,
    attempts,
    resolved,
    foundLines,
    instruction: symmetryInstructionFor(),
    message,
    beginDraw,
    moveDraw,
    endDraw,
    denyClaim,
  }
}