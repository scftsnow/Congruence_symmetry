/**
 * The demonstration that runs itself — the part that folds and shows.
 *
 * Split out of the pass, because it is a separate concern: the pass is the
 * questions the child answers, and this is the answer being shown back. The two
 * share a beat — the demonstration starts when the last question of a pass is
 * answered — but nothing else.
 *
 * THE TWO CHANGE PLACES
 * ---------------------
 * A pair is two parts, and the boards that claim they are the same show it by
 * the two changing places: each lands exactly where the other stood, so the
 * child sees the one fit the other.
 *
 * They do it in one motion. Taken in turns — the first travels and rests on its
 * partner, and only then does the second set off — the exchange reads as two
 * separate happenings, and the picture in between is the picture at the start:
 * the parts are mirror images of each other, so a half-finished swap shows
 * nothing at all.
 */

import { useCallback, useEffect, useState } from 'react'

/** how long a part takes to travel and settle */
const FLY_MS = 1200
/** the beat before it sets off, so the child sees what is about to move */
const PAUSE_MS = 340
/**
 * how long the conclusion stays up once the part has landed
 *
 * Without this the claim flashed past in the same instant the fit became
 * visible, which is the one moment the child is definitely looking — so the
 * sentence was on screen for no time at all and had to be guessed at.
 */
const HOLD_MS = 1400

export interface CorrDemo {
  /** which part of the demonstration is on its way */
  flyStep: number
  /** the parts have landed */
  landed: boolean
  /** the demonstration is running */
  flying: boolean
  /** the demonstration has run to the end */
  done: boolean
  /** start again from the first part */
  reset: () => void
}

export function useCorrDemo(input: {
  /** the sides the demonstration folds, in the order it folds them */
  sides: number[]
  /** the angles the demonstration folds, in the order it folds them */
  angles: number[]
}): CorrDemo {
  const [flyStep, setFlyStep] = useState(0)
  const [landed, setLanded] = useState(false)

  const total = input.sides.length + input.angles.length
  const flying = flyStep < total
  const done = flyStep >= total

  const reset = useCallback(() => {
    setFlyStep(0)
    setLanded(false)
  }, [])

  /*
   * The demonstration runs itself: it is an explanation rather than a question,
   * and the only thing the child could get wrong is the order it happens in.
   *
   * Both parts of the pair set off together and land together, so the exchange
   * is one thing that happens rather than two that happen in turn.
   */
  useEffect(() => {
    if (!flying) return
    const lift = window.setTimeout(() => setLanded(true), PAUSE_MS)
    const advance = window.setTimeout(
      () => {
        setLanded(false)
        setFlyStep((s: number) => s + 1)
      },
      PAUSE_MS + FLY_MS + HOLD_MS,
    )
    return () => {
      window.clearTimeout(lift)
      window.clearTimeout(advance)
    }
  }, [flying, flyStep])

  return {
    flyStep,
    landed,
    flying,
    done,
    reset,
  }
}
