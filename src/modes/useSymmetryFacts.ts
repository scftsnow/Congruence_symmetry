/**
 * The facts board — the two facts about the axis, in the textbook's order.
 *
 * The child joins a pair of corresponding points, and then the board shows what
 * that joining proves: first that the segment stands square to the axis, then
 * that the two ends stand equally far from it. Each fact arrives as something
 * drawn — a square at the crossing, a span with a tick from each end — with the
 * sentence naming what was just seen, because a claim the child cannot see is a
 * claim they are told.
 *
 * WHY THE CHILD ONLY JOINS
 * ------------------------
 * Joining is the one decision here: which two corners face each other. The spans
 * to the axis are not decisions — each starts where the joined pair already is
 * and ends where the square already says — so asking for them would test the
 * hand rather than the idea, and drawing them by hand would put the system's
 * assertion in the child's stroke.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SYMM_CENTER, type SymmetryBoard } from '../geometry/symmetryShapes'
import { mirrorIndex, nearestVertexIndex } from '../geometry/symmetryParts'
import type { Point } from '../geometry/types'
import {
  symmetryFactsHintFor,
  symmetryFactsInstructionFor,
  symmetryFactsSuccessFor,
} from '../components/symmPartsText'
import type { Message } from '../components/tone'

type FactsBoard = Extract<SymmetryBoard, { kind: 'facts' }>

/** join the pair, watch the square, then watch the equal spans */
export type FactsStage = 'join' | 'square' | 'equal'

/** how long a miss is explained before the ask comes back */
const HINT_MS = 1800
/** how long the joined pair is looked at before the first fact arrives */
const JOIN_MS = 1200
/** how long the square is looked at before the second fact arrives */
const SQUARE_MS = 2600
/** how long the equal spans are looked at before the board settles */
const EQUAL_MS = 2600
/** a press without a real drag is not an answer */
const MIN_DRAG = 30

export interface SymmetryFactsState {
  vertices: Point[]
  stage: FactsStage
  /** the finger's line, while it is being drawn */
  draft: { p: Point; q: Point } | null
  /** the pair that has been joined, as two corner indices */
  joined: [number, number] | null
  resolved: boolean
  justFound: boolean
  attempts: number
  /** the standing line while joining, or nothing while watching */
  instruction: string | null
  message: Message
  beginDraw: (p: Point) => void
  moveDraw: (p: Point) => void
  endDraw: () => void
}

export function useSymmetryFacts(board: FactsBoard, onSettled: () => void): SymmetryFactsState {
  const vertices = useMemo(
    () => board.shape.vertices.map((p) => ({ x: p.x + SYMM_CENTER.x, y: p.y + SYMM_CENTER.y })),
    [board],
  )
  const partners = useMemo(() => mirrorIndex(vertices, board.axis), [vertices, board.axis])

  const [stage, setStage] = useState<FactsStage>('join')
  const [draft, setDraft] = useState<{ p: Point; q: Point } | null>(null)
  const [joined, setJoined] = useState<[number, number] | null>(null)
  const [miss, setMiss] = useState(false)
  const [justFound, setJustFound] = useState(false)
  const [resolved, setResolved] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const timer = useRef<number | null>(null)

  /* Settling is reported, not derived — see useSymmetryParts for why. */
  useEffect(() => {
    if (resolved) onSettled()
  }, [resolved, onSettled])

  /** everything that waits on this board waits through here */
  const later = useCallback((what: () => void, after: number) => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(what, after)
  }, [])

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    [],
  )

  const beginDraw = useCallback(
    (p: Point) => {
      if (stage !== 'join') return
      setMiss(false)
      setDraft({ p, q: p })
    },
    [stage],
  )

  const moveDraw = useCallback((p: Point) => {
    setDraft((d) => (d ? { p: d.p, q: p } : d))
  }, [])

  const endDraw = useCallback(() => {
    // A tap is not an attempt: judging it would answer a question never asked.
    const stroke = draft
    setDraft(null)
    if (!stroke || stage !== 'join') return
    if (Math.hypot(stroke.q.x - stroke.p.x, stroke.q.y - stroke.p.y) < MIN_DRAG) return

    setAttempts((n) => n + 1)
    const from = nearestVertexIndex(stroke.p, vertices)
    const to = nearestVertexIndex(stroke.q, vertices)
    if (from === -1 || to === -1 || from === to || partners[from] !== to) {
      // A miss is answered by the popup, which the attempt count re-arms.
      setMiss(true)
      later(() => setMiss(false), HINT_MS)
      return
    }
    setJoined([from, to])
    setJustFound(true)
    // The two facts arrive one after the other, each drawn with its sentence,
    // because reading both at once is watching, not learning.
    later(() => {
      setJustFound(false)
      setStage('square')
    }, JOIN_MS)
  }, [draft, stage, partners, vertices, later])

  useEffect(() => {
    if (stage === 'square') later(() => setStage('equal'), SQUARE_MS)
    if (stage === 'equal') later(() => setResolved(true), EQUAL_MS)
  }, [stage, later])

  return {
    vertices,
    stage,
    draft,
    joined,
    resolved,
    justFound,
    attempts,
    instruction: symmetryFactsInstructionFor(stage),
    message: miss
      ? symmetryFactsHintFor('pair')
      : stage === 'join'
        ? justFound
          ? symmetryFactsSuccessFor('join')
          : { tone: 'neutral' as const, icon: '', text: '' }
        : symmetryFactsSuccessFor(stage),
    beginDraw,
    moveDraw,
    endDraw,
  }
}