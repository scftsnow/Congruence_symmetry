/**
 * The facts board — a segment joining corresponding points runs through the
 * middle, and a point and its image stand the same distance from it.
 *
 * The mirror image of the line unit's facts board, in the textbook's order:
 * the child joins one pair, watches the middle land on the segment, then
 * watches each end's span travel onto the other — all three pairs in turn, each
 * drawn with its sentence.
 *
 * WHY THE CHILD ONLY JOINS
 * ------------------------
 * Joining is the one decision here: which two corners face each other. The rest
 * is showing, and showing is the system's half of the bargain.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { POINT_SYMM_CENTER, type PointSymmetryBoard } from '../geometry/pointSymmetryShapes'
import { turnIndex } from '../geometry/pointSymmetry'
import { nearestVertexIndex, pairsFromPartners, type MirrorPairs } from '../geometry/symmetryParts'
import type { Point } from '../geometry/types'
import {
  pointFactsHintFor,
  pointFactsInstructionFor,
  pointFactsSuccessFor,
} from '../components/pointSymmPartsText'
import type { Message } from '../components/tone'

type FactsBoard = Extract<PointSymmetryBoard, { kind: 'facts' }>

/** the two things a join on this board can fail to be */
export type PointFactsMiss = 'pair' | 'dup'

/** join the pair, watch the middle land on it, then watch its span travel */
export type PointFactsStage = 'join' | 'hub' | 'equal'

/** how long a miss is explained before the ask comes back */
const HINT_MS = 1800
/** how long the joined pair is looked at before the first fact arrives */
const JOIN_MS = 1200
/** how long the middle on the segment is looked at before the span travels */
const HUB_MS = 2600
/** how long a span is looked at before it lifts off */
const SHOW_MS = 700
/** how long the travelled span rests on its partner before the next round */
const HOLD_MS = 1600
/** a press without a real drag is not an answer */
const MIN_DRAG = 30

export interface PointSymmetryFactsState {
  vertices: Point[]
  center: Point
  stage: PointFactsStage
  /** every pair the board can ask about, in outline order */
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

export function usePointSymmetryFacts(board: FactsBoard, onSettled: () => void): PointSymmetryFactsState {
  const vertices = useMemo(
    () => board.shape.vertices.map((p) => ({ x: p.x + POINT_SYMM_CENTER.x, y: p.y + POINT_SYMM_CENTER.y })),
    [board],
  )
  const center = useMemo(() => ({ ...board.center }), [board])
  const partners = useMemo(() => turnIndex(vertices, center), [vertices, center])
  const pairs = useMemo(() => pairsFromPartners(partners), [partners])

  const [stage, setStage] = useState<PointFactsStage>('join')
  const [current, setCurrent] = useState(0)
  const [landed, setLanded] = useState(false)
  const [draft, setDraft] = useState<{ p: Point; q: Point } | null>(null)
  const [joinedList, setJoinedList] = useState<Array<[number, number]>>([])
  const [miss, setMiss] = useState<PointFactsMiss | null>(null)
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
    (kind: PointFactsMiss) => {
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
    later(() => {
      setJustFound(false)
      setStage('hub')
    }, JOIN_MS)
  }, [draft, stage, partners, pairs, vertices, joinedList, later, explain])

  useEffect(() => {
    if (stage === 'hub') later(() => setStage('equal'), HUB_MS)
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

  const ask = pointFactsInstructionFor('join')
  const message: Message = miss
    ? pointFactsHintFor(miss)
    : stage === 'join'
      ? justFound
        ? pointFactsSuccessFor('join')
        : ask
          ? { tone: 'success', icon: '👉', text: ask }
          : { tone: 'neutral' as const, icon: '', text: '' }
      : pointFactsSuccessFor(stage)

  return {
    vertices,
    center,
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
