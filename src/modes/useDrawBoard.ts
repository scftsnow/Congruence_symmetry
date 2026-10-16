/**
 * The drawing board's state machine, shared by both symmetry units: place,
 * span, join and show. Points land first in any order, then each given point
 * reaches the axis on its own perpendicular, then the found points are joined
 * in outline order. The finished figure stands three seconds before the way
 * out appears, because the finish is watched.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { distance } from '../geometry/transforms'
import { MIN_DRAG } from '../geometry/symmetry'
import { matchJoin, matchSpot, matchSpanStart, spanFalls } from '../geometry/symmetryParts'
import type { Line } from '../geometry/symmetryParts'
import type { Message } from '../components/tone'
import type { Point } from '../geometry/types'
import { useDrawWalk } from './useDrawWalk'

export interface DrawTexts {
  instructionFor: (waiting: number) => string
  missedFor: () => Message
  successFor: (waiting: number) => Message
  howLeg: string
  howCarry: string
  spanAsk: string
  spanMiss: string
  spanDone: string
  linkAsk: string
  linkMiss: string
  linkDone: string
  doneAll: Message
}

export interface DrawBoardInput {
  half: Point[]
  givens: Point[]
  answers: Point[]
  spanTargets: Point[] // each given point's span ends here: its foot, or the middle
  squareAxis: Line | null // the axis spans must stand square to; null skips the check
  demo: { from: Point; mid: Point; to: Point }
  placeTolerance: number
  texts: DrawTexts
}

const HINT_MS = 1800
const STAR_MS = 2000
const FLY_MS = 1400
const DONE_SHOW_MS = 3000 // how long the finished figure stands before the way out appears

/** how near a pressed point may fall and still be it, in either unit */
export const PLACE_TOLERANCE = 60

export interface DrawBoardState {
  half: Point[]
  spans: Array<{ a: Point; b: Point }> // the spans drawn so far
  joins: Array<{ a: Point; b: Point }> // the edges joined so far
  placed: Point[] // placed point positions in outline order
  draft: { p: Point; q: Point } | null
  demo: { from: Point; mid: Point; to: Point }
  walk: number
  flying: { from: Point; to: Point } | null
  legDrawn: boolean
  waiting: number
  complete: boolean
  resolved: boolean
  justFound: boolean
  attempts: number
  message: Message
  beginDraw: (p: Point) => void
  moveDraw: (p: Point) => void
  endDraw: (up: Point | null) => void
}

/** The standing guide, one line per stage; the leg's explanation holds until its mark arrives. */
function guide(texts: DrawTexts, walking: boolean, legDrawn: boolean, waiting: number, flying: boolean, spanning: boolean, joining: boolean): Message {
  const text = walking ? (legDrawn ? texts.howCarry : texts.howLeg)
    : waiting > 0 && !flying ? texts.instructionFor(waiting)
    : spanning ? texts.spanAsk
    : joining ? texts.linkAsk
    : ''
  return text ? { tone: 'success', icon: '👉', text } : { tone: 'neutral', icon: '', text }
}

export function useDrawBoard(input: DrawBoardInput, onSettled: () => void): DrawBoardState {
  const { half, givens, answers, spanTargets, squareAxis, demo, placeTolerance, texts } = input
  const [placed, setPlaced] = useState<number[]>([])
  const [spanned, setSpanned] = useState<number[]>([])
  const [joined, setJoined] = useState<number[]>([])
  const [miss, setMiss] = useState<'spot' | 'span' | 'join' | null>(null)
  const [justFound, setJustFound] = useState(false)
  const [foundText, setFoundText] = useState<string | null>(null)
  const [flying, setFlying] = useState<{ from: Point; to: Point } | null>(null)
  const [draft, setDraft] = useState<{ p: Point; q: Point } | null>(null)
  const [resolved, setResolved] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const timer = useRef<number | null>(null)

  const waiting = answers.length - placed.length
  /* the edges to join: placed-point neighbours, plus the two that tie the
   * chain to the given half's corners — the placed points alone don't close it */
  const joinEdges = useMemo(() => [
    ...answers.slice(0, -1).map((a, i) => ({ a, b: answers[i + 1] })),
    { a: half[0], b: answers[0] },
    { a: answers[answers.length - 1], b: half[half.length - 1] },
  ], [answers, half])
  /* place → span → join: the stage is what is left to do */
  const spanning = waiting === 0 && spanned.length < givens.length
  const joining = waiting === 0 && spanned.length >= givens.length && joined.length < joinEdges.length
  const complete = waiting === 0 && spanned.length >= givens.length && joined.length >= joinEdges.length

  const { walk, walking, legDrawn } = useDrawWalk()

  const fail = useCallback((kind: 'spot' | 'span' | 'join') => {
    setMiss(kind)
    timer.current = window.setTimeout(() => setMiss(null), HINT_MS)
  }, [])

  const note = useCallback((text: string | null) => {
    setJustFound(true)
    setFoundText(text)
    timer.current = window.setTimeout(() => {
      setJustFound(false)
      setFoundText(null)
    }, STAR_MS)
  }, [])

  useEffect(() => {
    if (!complete || resolved) return
    timer.current = window.setTimeout(() => {
      setResolved(true)
      setJustFound(false)
      setFoundText(null)
      onSettled()
    }, DONE_SHOW_MS)
    return () => window.clearTimeout(timer.current ?? undefined)
  }, [complete, resolved, onSettled])

  const beginDraw = useCallback((p: Point) => {
    if (walking || flying || resolved) return
    setMiss(null)
    setDraft({ p, q: p })
  }, [walking, flying, resolved])

  const moveDraw = useCallback((p: Point) => {
    setDraft((d) => (d ? { p: d.p, q: p } : d))
  }, [])

  const endDraw = useCallback(
    (up: Point | null) => {
      const stroke = draft
      setDraft(null)
      if (!stroke || !up || walking || flying || resolved) return
      // each gesture belongs to exactly one stage: taps place, drags span or join
      const tap = distance(stroke.p, up) < MIN_DRAG
      if (tap && waiting > 0) {
        setAttempts((n) => n + 1)
        const at = matchSpot(up, answers, placed, placeTolerance)
        if (at === -1) return fail('spot')
        setMiss(null)
        setFlying({ from: givens[at], to: answers[at] })
        timer.current = window.setTimeout(() => {
          setFlying(null)
          setPlaced((prev) => [...prev, at])
          note(texts.successFor(waiting - 1).text ?? null)
        }, FLY_MS)
        return
      }
      if (!tap && spanning) {
        setAttempts((n) => n + 1)
        const i = matchSpanStart(stroke.p, givens, spanned, placeTolerance)
        if (i === -1 || !spanFalls(stroke.p, up, spanTargets[i], squareAxis)) return fail('span')
        setMiss(null)
        setSpanned((prev) => [...prev, i])
        note(texts.spanDone)
        return
      }
      if (!tap && joining) {
        setAttempts((n) => n + 1)
        const at = matchJoin(stroke.p, up, joinEdges, joined, placeTolerance)
        if (at === -1) return fail('join')
        setMiss(null)
        setJoined((prev) => [...prev, at])
        const last = joined.length + 1 >= joinEdges.length
        if (last) {
          // the finish is watched, not left: the stars stay up until resolved
          setJustFound(true)
          setFoundText(texts.doneAll.text ?? null)
        } else {
          note(texts.linkDone)
        }
      }
    },
    [draft, walking, flying, resolved, waiting, spanning, joining, answers, givens, spanTargets, squareAxis, placed, spanned, joined, joinEdges, placeTolerance, texts, fail, note],
  )

  return {
    half,
    spans: spanned.map((i) => ({ a: givens[i], b: spanTargets[i] })),
    joins: joined.map((k) => joinEdges[k]),
    placed: [...placed].sort((a, b) => a - b).map((at) => answers[at]),
    draft,
    demo,
    walk,
    flying,
    legDrawn,
    waiting,
    complete,
    resolved,
    justFound,
    attempts,
    message: miss
      ? { tone: 'hint', icon: '💡', text: miss === 'spot' ? texts.missedFor().text : miss === 'span' ? texts.spanMiss : texts.linkMiss }
      : foundText
        ? { tone: 'success', icon: '⭐', text: foundText }
        : guide(texts, walking, legDrawn, waiting, !!flying, spanning, joining),
    beginDraw,
    moveDraw,
    endDraw,
  }
}
