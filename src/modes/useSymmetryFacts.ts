/**
 * The facts board — the two facts about the axis, in the textbook's order.
 *
 * For each of the three pairs in turn the child joins it, then watches what the
 * joining proves: first the square, then one span folding onto its partner. Each
 * fact arrives drawn with its sentence, and the ask crosses the board as a popup
 * every round, because after two rounds of watching the bottom line is the last
 * place the child looks.
 *
 * WHY A SPAN TRAVELS
 * ------------------
 * Equal length is shown by moving, not by marking: one span lifts off, folds
 * across the axis and lands exactly on the other — the same travelling part the
 * correspondence unit flies, because it is the same claim. Ticks alone would say
 * "these are equal" the way words do; watching one become the other shows it.
 *
 * WHY THE CHILD ONLY JOINS
 * ------------------------
 * Joining is the one decision here: which two corners face each other. The spans
 * to the axis are not decisions — each starts where a corner already is and ends
 * where the square already says — so asking for them would test the hand rather
 * than the idea. A pair already joined is answered with its own hint rather than
 * counted twice.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SYMM_CENTER, type SymmetryBoard } from '../geometry/symmetryShapes'
import { mirrorIndex, mirrorPairs, nearestVertexIndex, type MirrorPairs } from '../geometry/symmetryParts'
import type { Point } from '../geometry/types'
import {
  symmetryFactsHintFor,
  symmetryFactsInstructionFor,
  symmetryFactsSuccessFor,
} from '../components/symmPartsText'
import type { Message } from '../components/tone'

type FactsBoard = Extract<SymmetryBoard, { kind: 'facts' }>

/** the two things a join on this board can fail to be */
export type FactsMiss = 'pair' | 'dup'

/** join the pair, watch the square, then watch its span travel */
export type FactsStage = 'join' | 'square' | 'equal'

/** how long a miss is explained before the ask comes back */
const HINT_MS = 1800
/** how long the joined pair is looked at before the first fact arrives */
const JOIN_MS = 1200
/** how long the square is looked at before the span takes its trip */
const SQUARE_MS = 2600
/** how long a span is looked at before it lifts off */
const SHOW_MS = 700
/** how long the travelled span rests on its partner before the next round */
const HOLD_MS = 1600
/** a press without a real drag is not an answer */
const MIN_DRAG = 30

export interface SymmetryFactsState {
  vertices: Point[]
  stage: FactsStage
  /** every corresponding pair, in outline order — one round each */
  pairs: MirrorPairs
  /** which pair's round is running, as an index into the pairs */
  current: number
  /** the span has landed on its partner */
  landed: boolean
  /** the finger's line, while it is being drawn */
  draft: { p: Point; q: Point } | null
  /** every pair joined so far, staying on screen as the rounds add up */
  joinedList: Array<[number, number]>
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
  const pairs = useMemo(() => mirrorPairs(vertices, board.axis), [vertices, board.axis])

  const [stage, setStage] = useState<FactsStage>('join')
  /** which pair's round is running, as an index into the pairs */
  const [current, setCurrent] = useState(0)
  const [landed, setLanded] = useState(false)
  const [draft, setDraft] = useState<{ p: Point; q: Point } | null>(null)
  const [joinedList, setJoinedList] = useState<Array<[number, number]>>([])
  const [miss, setMiss] = useState<FactsMiss | null>(null)
  const [justFound, setJustFound] = useState(false)
  const [resolved, setResolved] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const timer = useRef<number | null>(null)

  const rounds = pairs.points.length

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
      if (stage !== 'join') return
      setMiss(null)
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
    if (from === -1 || to === -1 || from === to || partners[from] !== to) return explain('pair')
    if (joinedList.some(([a, b]) => (a === from && b === to) || (a === to && b === from))) {
      return explain('dup')
    }
    setJoinedList((prev) => [...prev, from < to ? [from, to] : [to, from]])
    // The round follows the pair just joined, not a fixed order: the child
    // chooses which pair to join, and the facts arrive about that one.
    setCurrent(pairs.points.findIndex(([a, b]) => (a === from && b === to) || (a === to && b === from)))
    setJustFound(true)
    // The two facts arrive one after the other, each drawn with its sentence,
    // because reading both at once is watching, not learning.
    later(() => {
      setJustFound(false)
      setStage('square')
    }, JOIN_MS)
  }, [draft, stage, partners, pairs, vertices, joinedList, later, explain])

  useEffect(() => {
    if (stage === 'square') later(() => setStage('equal'), SQUARE_MS)
  }, [stage, later])

  /* Each round's trip: look, travel, rest — then the next pair's round. */
  useEffect(() => {
    if (stage !== 'equal') return
    if (!landed) {
      later(() => setLanded(true), SHOW_MS)
    } else {
      later(() => {
        if (joinedList.length < rounds) {
          setLanded(false)
          setStage('join')
        } else {
          setResolved(true)
        }
      }, HOLD_MS)
    }
  }, [stage, joinedList, landed, rounds, later])

  const ask = symmetryFactsInstructionFor('join')
  const message: Message = miss
    ? symmetryFactsHintFor(miss)
    : stage === 'join'
      ? justFound
        ? symmetryFactsSuccessFor('join')
        : ask
          ? { tone: 'success', icon: '👉', text: ask }
          : { tone: 'neutral' as const, icon: '', text: '' }
      : symmetryFactsSuccessFor(stage)

  return {
    vertices,
    stage,
    pairs,
    current,
    landed,
    draft,
    joinedList,
    resolved,
    justFound,
    attempts,
    instruction: stage === 'join' ? ask : null,
    message,
    beginDraw,
    moveDraw,
    endDraw,
  }
}