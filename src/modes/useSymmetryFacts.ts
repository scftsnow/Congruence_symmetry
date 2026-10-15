/**
 * The facts board — a segment joining corresponding points is square to the axis,
 * and a point and its image stand the same distance from it.
 *
 * The textbook puts these two together, and they are kept together here because
 * together they are one piece of reasoning: the segment is square because the two
 * ends are equally far either side, and equally far either side is what makes the
 * fold land. So the child joins the pair first and sees the right angle appear,
 * and then spans the same pair to the axis from both ends.
 *
 * THE CHILD DRAWS BOTH SPANS
 * --------------------------
 * It would be shorter for the system to draw the second one. It must not: the
 * claim is that the two lengths are equal, and a second span that appeared by
 * itself would be the system asserting it. Drawing it is the whole exercise.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SYMM_CENTER, type SymmetryBoard } from '../geometry/symmetryShapes'
import { distance } from '../geometry/transforms'
import { footOnAxis, mirrorIndex, nearestVertexIndex, SPAN_TOLERANCE } from '../geometry/symmetryParts'
import type { Point } from '../geometry/types'
import {
  symmetryFactsHintFor,
  symmetryFactsInstructionFor,
  symmetryFactsSuccessFor,
} from '../components/symmPartsText'
import type { Message } from '../components/tone'

type FactsBoard = Extract<SymmetryBoard, { kind: 'facts' }>

/** the four things a draw on this board can fail to be */
export type FactsMiss = 'off' | 'pair' | 'foot' | 'partner'

/** join the pair, then span it to the axis, then span the other end of the pair */
export type FactsStage = 'join' | 'span' | 'partner'

/** how long a miss is explained before the ask comes back */
const HINT_MS = 1800
/** how long a fact stays up once it has been proved */
const FACT_MS = 2200
/** a press without a real drag is not an answer */
const MIN_DRAG = 30

export interface SymmetryFactsState {
  vertices: Point[]
  stage: FactsStage
  /** the finger's line, while it is being drawn */
  draft: { p: Point; q: Point } | null
  /** the pair that has been joined, as two corner indices */
  joined: [number, number] | null
  /** the corners spanned to the axis, in the order they were done */
  spanned: number[]
  /** the corner whose partner must be spanned next */
  waitingOn: number | null
  resolved: boolean
  justFound: boolean
  attempts: number
  instruction: string
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
  const [spanned, setSpanned] = useState<number[]>([])
  const [waitingOn, setWaitingOn] = useState<number | null>(null)
  const [miss, setMiss] = useState<FactsMiss | null>(null)
  const [justFound, setJustFound] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const timer = useRef<number | null>(null)

  const resolved = stage === 'partner' && spanned.length >= 2

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

  /** explain the miss, then put the ask back — which is what re-arms the popup */
  const explain = useCallback(
    (kind: FactsMiss) => {
      setMiss(kind)
      later(() => setMiss(null), HINT_MS)
    },
    [later],
  )

  const beginDraw = useCallback(
    (p: Point) => {
      if (resolved) return
      setMiss(null)
      setDraft({ p, q: p })
    },
    [resolved],
  )

  const moveDraw = useCallback((p: Point) => {
    setDraft((d) => (d ? { p: d.p, q: p } : d))
  }, [])

  const endDraw = useCallback(() => {
    // A tap is not an attempt: judging it would answer a question never asked.
    const stroke = draft
    setDraft(null)
    if (!stroke || resolved) return
    if (Math.hypot(stroke.q.x - stroke.p.x, stroke.q.y - stroke.p.y) < MIN_DRAG) return

    setAttempts((n) => n + 1)
    const from = nearestVertexIndex(stroke.p, vertices)
    const to = nearestVertexIndex(stroke.q, vertices)

    if (stage === 'join') {
      if (from === -1 || to === -1 || from === to || partners[from] !== to) return explain('pair')
      setJoined([from, to])
      setJustFound(true)
      later(() => {
        setJustFound(false)
        setStage('span')
      }, FACT_MS)
      return
    }

    if (from === -1) return explain('partner')
    if (stage === 'partner' && from !== waitingOn) return explain('partner')
    if (distance(stroke.q, footOnAxis(vertices[from], board.axis)) > SPAN_TOLERANCE) {
      return explain('foot')
    }

    setSpanned((prev) => (prev.includes(from) ? prev : [...prev, from]))
    setJustFound(true)
    if (spanned.length === 0) setWaitingOn(partners[from])
    // One timer does both: two `later` calls here would drop the first, because
    // each one clears the last — and a justFound that never clears says the
    // partner sentence before the partner span is drawn.
    later(() => {
      setJustFound(false)
      setStage('partner')
    }, FACT_MS)
  }, [draft, resolved, stage, spanned, waitingOn, partners, vertices, board.axis, later, explain])

  return {
    vertices,
    stage,
    draft,
    joined,
    spanned,
    waitingOn,
    resolved,
    justFound,
    attempts,
    instruction: symmetryFactsInstructionFor(stage),
    message: miss
      ? symmetryFactsHintFor(miss)
      : justFound
        ? symmetryFactsSuccessFor(stage)
        : { tone: 'neutral' as const, icon: '', text: '' },
    beginDraw,
    moveDraw,
    endDraw,
  }
}