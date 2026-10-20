/**
 * The demonstration that runs itself — the part that folds and shows.
 *
 * Split out of the pass, because it is a separate concern: the pass is the
 * questions the child answers, and this is the answer being shown back. The two
 * share a beat — the demonstration starts when the last question of a pass is
 * answered — but nothing else.
 *
 * TWO PARTS, ONE AFTER THE OTHER
 * ------------------------------
 * A pair is two parts, and the boards that claim they are the same show it by
 * one part travelling onto the other. Both at once is unreadable there: the
 * parts cross in the middle, and being mirror images of each other the picture
 * at the end is the picture at the start, so nothing was shown. So the first
 * part travels and comes to rest exactly on its partner — the claim, in one
 * picture — and only then does the second set off and take the first's place.
 *
 * The pause between them is the whole point of the timing, and it lives here
 * rather than in a CSS delay: the second part has to set off when the first has
 * come to rest, and a transition delay would have to know the travel time twice
 * over.
 */

import { useCallback, useEffect, useState } from 'react'

/** how long a part takes to travel and settle */
const FLY_MS = 900
/** the beat before it sets off, so the child sees what is about to move */
const PAUSE_MS = 340
/**
 * how long the first part rests on its partner before the second sets off
 *
 * The pause is the claim: the first part arrives exactly on the other and the
 * child sees the two fit one another, before the second part leaves.
 */
const REST_MS = 1100
/**
 * how long the conclusion stays up once the part has landed
 *
 * Without this the claim flashed past in the same instant the fit became
 * visible, which is the one moment the child is definitely looking — so the
 * sentence was on screen for no time at all and had to be guessed at.
 */
const HOLD_MS = 1400

export interface CorrDemoTiming {
  /** the second part waits for the first to come to rest on its partner */
  sequential?: boolean
}

export interface CorrDemo {
  /** which part of the demonstration is on its way */
  flyStep: number
  /** the first part has landed */
  landed: boolean
  /**
   * the second part has set off
   *
   * The same as `landed` unless the exchange is taken in turns, in which case
   * this waits for the first part to come to rest on its partner.
   */
  landedSecond: boolean
  /** the demonstration is running */
  flying: boolean
  /** the demonstration has run to the end */
  done: boolean
  /** start again from the first part */
  reset: () => void
}

export function useCorrDemo(input: CorrDemoTiming & {
  /** the sides the demonstration folds, in the order it folds them */
  sides: number[]
  /** the angles the demonstration folds, in the order it folds them */
  angles: number[]
}): CorrDemo {
  const sequential = input.sequential === true
  const [flyStep, setFlyStep] = useState(0)
  const [landed, setLanded] = useState(false)
  const [landedSecond, setLandedSecond] = useState(false)

  const total = input.sides.length + input.angles.length
  const flying = flyStep < total
  const done = flyStep >= total

  const reset = useCallback(() => {
    setFlyStep(0)
    setLanded(false)
    setLandedSecond(false)
  }, [])

  /*
   * The demonstration runs itself: it is an explanation rather than a question,
   * and the only thing the child could get wrong is the order it happens in.
   *
   * Where the exchange is taken in turns, the second part sets off only after
   * the first has come to rest on its partner: the pause between them is the
   * moment the child sees the two fit one another, and the second part leaving
   * from under the first is what shows they are the same thing. The step is
   * therefore longer — it has two journeys in it rather than one.
   */
  useEffect(() => {
    if (!flying) return
    const lift = window.setTimeout(() => setLanded(true), PAUSE_MS)
    const second = sequential
      ? window.setTimeout(() => setLandedSecond(true), PAUSE_MS + FLY_MS + REST_MS)
      : null
    const advance = window.setTimeout(
      () => {
        setLanded(false)
        setLandedSecond(false)
        setFlyStep((s: number) => s + 1)
      },
      PAUSE_MS + FLY_MS + (sequential ? REST_MS + FLY_MS : 0) + HOLD_MS,
    )
    return () => {
      window.clearTimeout(lift)
      if (second) window.clearTimeout(second)
      window.clearTimeout(advance)
    }
  }, [flying, flyStep, sequential])

  return {
    flyStep,
    landed,
    landedSecond: sequential ? landedSecond : landed,
    flying,
    done,
    reset,
  }
}
