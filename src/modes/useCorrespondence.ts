/**
 * The correspondence pass — where the child is, and whether they are right.
 *
 * Kept out of the screen so the sequence can be exercised without React, which is
 * the only way to check the parts that are easy to get wrong by eye: that a wrong
 * tap never advances, that a pass does not roll over into the next one early, and
 * that the demonstration runs one part at a time and then stops.
 *
 * WHY THE CHILD IS NEVER ASKED WHICH PART
 * ---------------------------------------
 * The pairing is fixed when the pair is drawn, because the second shape is the
 * first one after a turn. So a right answer is a fact about the shapes, not a
 * guess at what was intended, and there is nothing here for the child to steer.
 * That is why there is no rotate or flip: direction was already settled in the
 * congruence unit, and offering a turn again would say it still matters.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { CORRESPONDENCE_PAIRS } from '../geometry/correspondenceShapes'
import { bannerFor } from '../components/corrText'
import type { Banner, Pass, Phase } from '../components/corrText'
import { PASSES } from '../components/corrText'

/** how long a side or angle takes to travel and settle */
const FLY_MS = 900
/** the beat before it sets off, so the child sees what is about to move */
const PAUSE_MS = 340
/**
 * how long the conclusion stays up once the part has landed
 *
 * Without this the claim flashed past in the same instant the fit became visible,
 * which is the one moment the child is definitely looking — so the sentence was
 * on screen for no time at all and had to be guessed at.
 */
const HOLD_MS = 1200
/** how long a miss is explained before the ask comes back */
const HINT_MS = 1800
/** how long the stars stay up after a correct find, as in the congruence stage */
const STAR_MS = 1500

export interface Correspondence {
  pairIndex: number
  pair: (typeof CORRESPONDENCE_PAIRS)[number]
  phase: Phase
  /** which part of the pass is being asked about */
  step: number
  /** corners on this shape, so the dots and the sequence know when to stop */
  corners: number
  /** which part is on its way during the demonstration */
  flyStep: number
  landed: boolean
  /** true just after a correct find, for the burst of stars */
  justFound: boolean
  flying: boolean
  done: boolean
  banner: Banner
  startPair: (index: number) => void
  answer: (given: number) => void
  /** on to the next shape, or round again after the last */
  nextPair: () => void
}

export function useCorrespondence(): Correspondence {
  const [pairIndex, setPairIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('points')
  const [step, setStep] = useState(0)
  const [wrong, setWrong] = useState(false)
  const [flyStep, setFlyStep] = useState(0)
  const [landed, setLanded] = useState(false)
  const [justFound, setJustFound] = useState(false)
  const starTimer = useRef<number | null>(null)

  const pair = CORRESPONDENCE_PAIRS[pairIndex]
  const corners = pair.a.vertices.length
  /** one side per corner, then one angle per corner */
  const flyTotal = corners * 2
  const flying = phase === 'compare' && flyStep < flyTotal
  const done = phase === 'compare' && flyStep >= flyTotal

  const startPair = useCallback((index: number) => {
    setPairIndex(index)
    setPhase('points')
    setStep(0)
    setWrong(false)
    setFlyStep(0)
    setLanded(false)
  }, [])

  /**
   * Explain the miss, then put the ask back.
   *
   * The timer is dropped when the component unmounts, so a stale one cannot switch
   * the banner off over the top of a later question.
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
      if (given !== step) {
        explain()
        return
      }

      /*
       * A correct find is celebrated, every time, exactly as the congruence board
       * does it. The unit has its own feedback — the ring that appears at the part
       * just paired up — and that ring is geometry, so it cannot say anything; the
       * stars are the part of this that is purely "you got it", and leaving them
       * out made a right answer quieter here than the identical act one screen
       * away.
       *
       * Fired from the event rather than derived from the step, because the step
       * goes 0,1,2,0,1,2 and only two of those six moves are a correct answer.
       */
      setJustFound(true)
      if (starTimer.current) window.clearTimeout(starTimer.current)
      starTimer.current = window.setTimeout(() => setJustFound(false), STAR_MS)

      if (step + 1 < corners) {
        setStep(step + 1)
        return
      }
      const next = PASSES[PASSES.indexOf(phase as Pass) + 1]
      setStep(0)
      if (next) {
        setPhase(next)
      } else {
        setPhase('compare')
        setFlyStep(0)
      }
    },
    [corners, explain, phase, step, wrong],
  )

  const nextPair = useCallback(() => {
    setPairIndex((i) => (i + 1) % CORRESPONDENCE_PAIRS.length)
    setPhase('points')
    setStep(0)
    setWrong(false)
    setFlyStep(0)
    setLanded(false)
  }, [])

  /**
   * The demonstration runs itself.
   *
   * The child does not drive it, because it is an explanation rather than a
   * question, and the only thing they could get wrong is the order it happens in.
   */
  useEffect(() => {
    if (!flying) return
    const lift = window.setTimeout(() => setLanded(true), PAUSE_MS)
    const advance = window.setTimeout(() => {
      setLanded(false)
      setFlyStep((s) => s + 1)
    }, PAUSE_MS + FLY_MS + HOLD_MS)
    return () => {
      window.clearTimeout(lift)
      window.clearTimeout(advance)
    }
  }, [flying, flyStep])

  return {
    pairIndex,
    pair,
    phase,
    step,
    corners,
    flyStep,
    landed,
    justFound,
    flying,
    done,
    banner: bannerFor({
      phase,
      wrong,
      done,
      flying,
      flyingAngle: flying && flyStep >= corners,
      landed: flying && landed,
    }),
    startPair,
    answer,
    nextPair,
  }
}