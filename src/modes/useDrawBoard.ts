/**
 * The drawing board's state machine, shared by both symmetry units.
 *
 * One activity with two mirrors, so walk, place, connect and show live here
 * once: points land first in any order, then neighbours are joined, then the
 * finished figure stands three seconds before the way out appears.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDrawWalk } from './useDrawWalk'
import { distance } from '../geometry/transforms'
import { MIN_DRAG } from '../geometry/symmetry'
import { matchLink, matchSpot } from '../geometry/symmetryParts'
import type { Message } from '../components/tone'
import type { Point } from '../geometry/types'

export interface DrawTexts {
  instructionFor: (waiting: number) => string
  missedFor: () => Message
  successFor: (waiting: number) => Message
  howLeg: string
  howCarry: string
  linkAsk: string
  linkMiss: string
  linked: string
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
const DONE_SHOW_MS = 3000

/** how near a pressed point may fall and still be it, in either unit */
export const PLACE_TOLERANCE = 60

export interface DrawBoardState {
  half: Point[]
  links: Array<{ given: Point; placed: Point }>
  segments: Array<{ a: Point; b: Point }>
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
  instruction: string
  message: Message
  beginDraw: (p: Point) => void
  moveDraw: (p: Point) => void
  endDraw: (up: Point | null) => void
}

export function useDrawBoard(input: DrawBoardInput, onSettled: () => void): DrawBoardState {
  const { half, givens, answers, demo, placeTolerance, texts } = input
  const [placed, setPlaced] = useState<number[]>([])
  const [connected, setConnected] = useState<Array<[number, number]>>([])
  const [miss, setMiss] = useState<'spot' | 'link' | null>(null)
  const [justFound, setJustFound] = useState(false)
  const [foundText, setFoundText] = useState<string | null>(null)
  const [flying, setFlying] = useState<{ from: Point; to: Point } | null>(null)
  const [draft, setDraft] = useState<{ p: Point; q: Point } | null>(null)
  const [resolved, setResolved] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const timer = useRef<number | null>(null)

  const waiting = answers.length - placed.length
  /* Only neighbours in outline order share an edge. */
  const needed = useMemo<Array<[number, number]>>(
    () => Array.from({ length: Math.max(answers.length - 1, 0) }, (_, i) => [i, i + 1]),
    [answers.length],
  )
  const complete = waiting === 0 && connected.length >= needed.length

  const { walk, walking, legDrawn } = useDrawWalk()

  useEffect(() => {
    if (!complete || resolved) return
    timer.current = window.setTimeout(() => {
      setResolved(true)
      setJustFound(false)
      setFoundText(null)
    }, DONE_SHOW_MS)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [complete, resolved])

  /* Settling is reported, not derived — see useSymmetryParts for why. */
  useEffect(() => {
    if (resolved) onSettled()
  }, [resolved, onSettled])

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    [],
  )

  const beginDraw = useCallback(
    (p: Point) => {
      if (walking || flying || resolved) return
      setMiss(null)
      setDraft({ p, q: p })
    },
    [walking, flying, resolved],
  )

  const moveDraw = useCallback((p: Point) => {
    setDraft((d) => (d ? { p: d.p, q: p } : d))
  }, [])

  const endDraw = useCallback(
    (up: Point | null) => {
      const stroke = draft
      setDraft(null)
      if (!stroke || !up || walking || flying || resolved) return
      // Taps after placing are not answers; drags before placing are not either.
      const tap = distance(stroke.p, up) < MIN_DRAG
      if (tap && waiting > 0) {
        setAttempts((n) => n + 1)
        const at = matchSpot(up, answers, placed, placeTolerance)
        if (at === -1) {
          setMiss('spot')
          timer.current = window.setTimeout(() => setMiss(null), HINT_MS)
          return
        }
        setMiss(null)
        setFlying({ from: givens[at], to: answers[at] })
        timer.current = window.setTimeout(() => {
          setFlying(null)
          setPlaced((prev) => [...prev, at])
          setJustFound(true)
          setFoundText(texts.successFor(waiting - 1).text ?? null)
          timer.current = window.setTimeout(() => {
            setJustFound(false)
            setFoundText(null)
          }, STAR_MS)
        }, FLY_MS)
        return
      }
      if (!tap && waiting === 0 && !complete) {
        setAttempts((n) => n + 1)
        const pair = matchLink(stroke.p, up, answers, needed, connected, placeTolerance)
        if (!pair) {
          setMiss('link')
          timer.current = window.setTimeout(() => setMiss(null), HINT_MS)
          return
        }
        setMiss(null)
        setConnected((prev) => [...prev, pair])
        setJustFound(true)
        setFoundText(texts.linked)
        // The last link names the finished figure, and the stars stay up while
        // it stands: the finish is watched, not left.
        timer.current = window.setTimeout(() => {
          if (connected.length + 1 >= needed.length) {
            setFoundText(texts.successFor(0).text ?? null)
          } else {
            setJustFound(false)
            setFoundText(null)
          }
        }, STAR_MS)
      }
    },
    [draft, walking, flying, resolved, waiting, complete, answers, givens, placed, connected, needed, placeTolerance, texts],
  )

  return {
    half,
    links: [...placed].sort((a, b) => a - b).map((at) => ({ given: givens[at], placed: answers[at] })),
    segments: connected.map(([a, b]) => ({ a: answers[a], b: answers[b] })),
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
    instruction: texts.instructionFor(waiting),
    message: miss
      ? miss === 'link'
        ? { tone: 'hint', icon: '💡', text: texts.linkMiss }
        : texts.missedFor()
      : foundText
        ? { tone: 'success', icon: '⭐', text: foundText }
        : walking
          ? { tone: 'success', icon: '👉', text: walk < 1 ? texts.howLeg : texts.howCarry }
          : waiting > 0 && !flying
            ? { tone: 'success', icon: '👉', text: texts.instructionFor(waiting) }
            : waiting === 0 && !complete
              ? { tone: 'success', icon: '👉', text: texts.linkAsk }
              : { tone: 'neutral' as const, icon: '', text: '' },
    beginDraw,
    moveDraw,
    endDraw,
  }
}
