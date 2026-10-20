/**
 * The correspondence pass — the machinery every 대응 question runs on.
 *
 * WHAT WAS EXTRACTED AND WHY
 * --------------------------
 * The congruence unit asked for 대응점, then 대응변, then 대응각, and the same
 * three passes are what the line-symmetry unit asks for again, on one shape
 * folded over an axis instead of two shapes side by side. The sequence, the
 * dots, the stars, the held miss and the demonstration that runs itself are
 * identical between them, so they live here once. Either way the child taps the
 * part that answers the one being asked about, which is why the same `step` is
 * both the question and the right answer on both boards.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { PASSES, type Pass, type Phase } from '../components/corrText'
import type { Message } from '../components/tone'
import { useCorrDemo, type CorrDemoTiming } from './useCorrDemo'

/** how long a miss is explained before the ask comes back */
const HINT_MS = 1800
/** how long the stars stay up after a correct find */
const STAR_MS = 1500

/** The unit's own words for the pass, so the hook never hardcodes wording. */
export interface PassTexts {
  instruction: (phase: Phase) => string | null
  found: (phase: Phase) => Message | null
}

/**
 * Which part each step asks about, per pass.
 *
 * The congruence unit asks every corner, so it passes nothing and every step is
 * its own index. The symmetry unit asks one index per mirrored pair — asking
 * every corner would ask every pair twice, once from each end — and leaves out
 * the sides that mirror to themselves, which have no partner to be the answer.
 */
export type PassAsk = Partial<Record<Pass, number[]>>

/**
 * How the demonstration is timed, per board.
 *
 * Where two shapes stand side by side, the two parts change places at once and
 * it reads at a glance. Where one shape is folded over its own axis, both at
 * once is unreadable: the parts cross in the middle, and being mirror images
 * of each other the picture at the end is the picture at the start, so nothing
 * was shown. There the exchange is taken in turns — the first part travels and
 * rests exactly on its partner, which is the claim itself, and only then does
 * the second set off.
 */
export type { CorrDemoTiming as PassTiming }
export type { CorrDemoTiming }

export interface CorrPass {
  phase: Phase
  /** which entry of the ask list is being asked about */
  step: number
  /** the ask list for the pass in progress, or every corner when none was given */
  asked: number[]
  /** how many questions this pass asks, for the dots */
  total: number
  /** the sides the demonstration folds, in the order it folds them */
  flySides: number[]
  /** the angles the demonstration folds, in the order it folds them */
  flyAngles: number[]
  /** true while a miss is being explained */
  wrong: boolean
  /** which fold of the demonstration is on its way */
  flyStep: number
  landed: boolean
  /**
   * the second part of the pair has set off
   *
   * The same as `landed` unless the exchange is taken in turns, in which case
   * this waits for the first part to come to rest on its partner.
   */
  landedSecond: boolean
  justFound: boolean
  /** how many answers have been given, right or wrong: re-arms the popup */
  attempts: number
  flying: boolean
  done: boolean
  /** the standing line for the pass in progress, or nothing during the show */
  instruction: string | null
  /** said the moment a pair is found, so no tap on this screen is silent */
  found: Message | null
  answer: (given: number) => void
  restart: () => void
}

/** Every corner in outline order, the ask list when none was given. */
function allCorners(corners: number): number[] {
  return Array.from({ length: corners }, (_, i) => i)
}

export function useCorrPass(
  corners: number,
  texts: PassTexts,
  ask?: PassAsk,
  timing: CorrDemoTiming = {},
): CorrPass {
  const [phase, setPhase] = useState<Phase>('points')
  const [step, setStep] = useState(0)
  const [wrong, setWrong] = useState(false)
  const [justFound, setJustFound] = useState(false)
  /**
   * which pass the celebrated tap belonged to
   *
   * The phase flips the instant the last answer of a pass lands, so reading the
   * words from the current phase would celebrate the pass just entered: the
   * second of two point-finds said "대응변". The tap's own pass is remembered
   * instead, and only it is ever said.
   */
  const [foundPhase, setFoundPhase] = useState<Phase>('points')
  /** one per tap, right or wrong; re-arms the popup so a repeat still shows */
  const [attempts, setAttempts] = useState(0)
  const starTimer = useRef<number | null>(null)

  const asked = phase === 'compare' ? allCorners(corners) : (ask?.[phase as Pass] ?? allCorners(corners))
  const total = asked.length
  /** the demonstration folds exactly what was asked: no more, no fewer */
  const flySides = ask?.sides ?? allCorners(corners)
  const flyAngles = ask?.angles ?? allCorners(corners)
  const demo = useCorrDemo({
    sides: flySides,
    angles: flyAngles,
    sequential: timing.sequential === true,
  })
  const flying = phase === 'compare' && demo.flying
  const done = phase === 'compare' && demo.done

  const restart = useCallback(() => {
    setPhase('points')
    setStep(0)
    setWrong(false)
    demo.reset()
    setJustFound(false)
    if (starTimer.current) window.clearTimeout(starTimer.current)
  }, [demo])

  /**
   * Explain the miss, then put the ask back. The timer is dropped on unmount, so
   * a stale one cannot switch the banner off over a later question.
   */
  const explain = useCallback(() => {
    setWrong(true)
    window.setTimeout(() => setWrong(false), HINT_MS)
  }, [])

  const answer = useCallback(
    (given: number) => {
      // A miss is held rather than counted, so a child tapping quickly through a
      // hint cannot stumble into the right answer by accident.
      if (wrong || phase === 'compare') return
      setAttempts((n) => n + 1)
      if (given !== asked[step]) {
        /*
         * A miss is answered by the popup, which the attempt count above re-arms.
         * Two wrong taps in a row produce the same words, so keying on the words
         * alone would leave the child still stuck and told nothing — the one thing
         * a hint must never do.
         */
        explain()
        return
      }

      /*
       * A correct find is celebrated, every time, exactly as the congruence board
       * does it: the ring is geometry and cannot say anything, so the stars are
       * the part that is purely "you got it".
       */
      setJustFound(true)
      setFoundPhase(phase)
      if (starTimer.current) window.clearTimeout(starTimer.current)
      starTimer.current = window.setTimeout(() => setJustFound(false), STAR_MS)

      if (step + 1 < asked.length) {
        setStep(step + 1)
        return
      }
      const next = PASSES[PASSES.indexOf(phase as Pass) + 1]
      setStep(0)
      if (next) {
        setPhase(next)
      } else {
        setPhase('compare')
        demo.reset()
      }
    },
    [asked, demo, explain, phase, step, wrong],
  )

  useEffect(() => () => {
    if (starTimer.current) window.clearTimeout(starTimer.current)
  }, [])

  return {
    phase,
    step,
    asked,
    total,
    flySides,
    flyAngles,
    wrong,
    flyStep: demo.flyStep,
    landed: demo.landed,
    landedSecond: demo.landedSecond,
    justFound,
    attempts,
    flying,
    done,
    instruction: texts.instruction(phase),
    found: texts.found(foundPhase),
    answer,
    restart,
  }
}