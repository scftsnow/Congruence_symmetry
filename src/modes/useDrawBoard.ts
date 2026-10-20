/**
 * The drawing board's state machine, shared by both symmetry units: place,
 * join and show. Points land first in any order, then the remaining half is
 * drawn by joining the found points in outline order — the chain they make,
 * tied to the given half's own corners, because the placed points alone do not
 * close the figure. The finished figure stands three seconds before the way
 * out appears, because the finish is watched.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { distance } from '../geometry/transforms'
import { MIN_DRAG } from '../geometry/symmetry'
import { matchJoin, matchSpot } from '../geometry/symmetryParts'
import type { Message } from '../components/tone'
import type { Point } from '../geometry/types'
import { useDrawWalk } from './useDrawWalk'

export interface DrawTexts {
  instructionFor: (waiting: number) => string
  missedFor: () => Message
  successFor: (waiting: number) => Message
  howLeg: string
  howCarry: string
  linkAsk: string
  linkMiss: string
  linkDone: string
  doneAll: Message
}

export interface DrawBoardInput {
  half: Point[]
  givens: Point[]
  answers: Point[]
  demo: { from: Point; mid: Point; to: Point }
  placeTolerance: number
  texts: DrawTexts
}

const HINT_MS = 1800
const STAR_MS = 2000
const FLY_MS = 1400
/** how long the finished figure stands before the way out appears */
const DONE_SHOW_MS = 4500

/** how near a pressed point may fall and still be it, in either unit */
export const PLACE_TOLERANCE = 60

export interface DrawBoardState {
  half: Point[]
  joins: Array<{ a: Point; b: Point }> // the edges joined so far
  placed: Point[] // placed point positions in outline order
  draft: { p: Point; q: Point } | null
  demo: { from: Point; mid: Point; to: Point }
  walk: number
  flying: { from: Point; to: Point } | null
  legDrawn: boolean
  landed: boolean
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

/** The standing guide, one line per stage; the leg's explanation holds until the carry begins. */
function guide(texts: DrawTexts, walk: number, waiting: number, flying: boolean, joining: boolean): Message {
  const text = walk < 3 ? (walk < 2 ? texts.howLeg : texts.howCarry)
    : waiting > 0 && !flying ? texts.instructionFor(waiting)
    : joining ? texts.linkAsk
    : ''
  return text ? { tone: 'success', icon: '👉', text } : { tone: 'neutral', icon: '', text }
}

export function useDrawBoard(input: DrawBoardInput, onSettled: () => void): DrawBoardState {
  const { half, givens, answers, demo, placeTolerance, texts } = input
  const [placed, setPlaced] = useState<number[]>([])
  const [joined, setJoined] = useState<number[]>([])
  const [miss, setMiss] = useState<'spot' | 'join' | null>(null)
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
  /* place → join: the stage is what is left to do */
  const joining = waiting === 0 && joined.length < joinEdges.length
  const complete = waiting === 0 && joined.length >= joinEdges.length

  const { walk, walking, legDrawn, landed } = useDrawWalk()

  const fail = useCallback((kind: 'spot' | 'join') => {
    setMiss(kind)
    timer.current = window.setTimeout(() => setMiss(null), HINT_MS)
  }, [])

  /*
   * One timer for everything that is said, so a message can never be cut short
   * by the one before it.
   *
   * The words that end a gesture — a join made, the figure finished — each
   * left a timer behind to clear them. The last join of a figure was therefore
   * wiped by the *previous* join's timer, a second and a half later, so the
   * celebration of a finished figure flashed and went. Clearing the old timer
   * before saying the new thing is the whole fix.
   */
  const say = useCallback((text: string | null) => {
    if (timer.current) window.clearTimeout(timer.current)
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
      // each gesture belongs to exactly one stage: taps place, drags join
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
          say(texts.successFor(waiting - 1).text ?? null)
        }, FLY_MS)
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
          // and the words with them. The previous join's timer is dropped first,
          // or it would clear this sentence a second later and the celebration
          // of a finished figure would flash and go.
          if (timer.current) window.clearTimeout(timer.current)
          setJustFound(true)
          setFoundText(texts.doneAll.text ?? null)
        } else {
          say(texts.linkDone)
        }
      }
    },
    [draft, walking, flying, resolved, waiting, joining, answers, givens, placed, joined, joinEdges, placeTolerance, texts, fail, say],
  )

  return {
    half,
    joins: joined.map((k) => joinEdges[k]),
    placed: [...placed].sort((a, b) => a - b).map((at) => answers[at]),
    draft,
    demo,
    walk,
    flying,
    legDrawn,
    landed,
    waiting,
    complete,
    resolved,
    justFound,
    attempts,
    message: miss
      ? { tone: 'hint', icon: '💡', text: miss === 'spot' ? texts.missedFor().text : texts.linkMiss }
      : foundText
        ? { tone: 'success', icon: '⭐', text: foundText }
        : guide(texts, walk, waiting, !!flying, joining),
    beginDraw,
    moveDraw,
    endDraw,
  }
}
