/**
 * The congruence correspondence pass — which pair, and how far along it is.
 *
 * All the state and all the sequencing live in useCorrPass, because the
 * line-symmetry unit asks the very same three questions of one shape folded over
 * an axis. What is left here is the congruence unit's own business: which pair
 * is on the board, and what to say while it is.
 *
 * WHY THE CHILD IS NEVER ASKED WHICH PART, ONLY WHICH
 * ----------------------------------------------------
 * The pairing is fixed when the pair is drawn, because the second shape is the
 * first one after a turn. So a right answer is a fact about the shapes, not a
 * guess at what was intended, and there is nothing here for the child to steer.
 * That is why there is no rotate or flip: direction was already settled in the
 * congruence unit, and offering a turn again would say it still matters.
 */

import { useCallback, useState } from 'react'
import { CORRESPONDENCE_PAIRS } from '../geometry/correspondenceShapes'
import { correspondenceMessageFor, foundFor, instructionFor } from '../components/corrText'
import type { Message } from '../components/tone'
import { useCorrPass } from './useCorrPass'

export interface CorrespondenceState {
  pairIndex: number
  pair: (typeof CORRESPONDENCE_PAIRS)[number]
  phase: ReturnType<typeof useCorrPass>['phase']
  /** which part of the pass is being asked about */
  step: number
  /** corners on this shape, so the dots and the sequence know when to stop */
  corners: number
  /** which part is on its way during the demonstration */
  flyStep: number
  landed: boolean
  /** true just after a correct find, for the burst of stars */
  justFound: boolean
  /** one per tap, right or wrong; re-arms the popup so a repeat still shows */
  attempts: number
  /** the one standing instruction, or nothing during the demonstration */
  instruction: string | null
  flying: boolean
  done: boolean
  message: Message
  startPair: (index: number) => void
  answer: (given: number) => void
  /** on to the next shape, or round again after the last */
  nextPair: () => void
}

export function useCorrespondence(): CorrespondenceState {
  const [pairIndex, setPairIndex] = useState(0)
  const pair = CORRESPONDENCE_PAIRS[pairIndex]
  const corners = pair.a.vertices.length

  /*
   * Side by side, shape B is shape A after a turn, so the part that answers the
   * one being asked about is the same corner on the other shape. That is the
   * whole of what this unit has to say about pairing; the symmetry unit says the
   * same thing with the mirror image instead, on the shared pass below.
   */
  const pass = useCorrPass(corners, { instruction: instructionFor, found: foundFor })

  const startPair = useCallback(
    (index: number) => {
      setPairIndex(index)
      pass.restart()
    },
    [pass],
  )

  const nextPair = useCallback(() => {
    setPairIndex((i) => (i + 1) % CORRESPONDENCE_PAIRS.length)
    pass.restart()
  }, [pass])

  return {
    pairIndex,
    pair,
    phase: pass.phase,
    step: pass.step,
    corners,
    flyStep: pass.flyStep,
    landed: pass.landed,
    justFound: pass.justFound,
    attempts: pass.attempts,
    instruction: pass.instruction,
    flying: pass.flying,
    done: pass.done,
    message: (pass.justFound
      ? pass.found
      : pass.wrong
        ? correspondenceMessageFor({
            phase: pass.phase,
            wrong: true,
            done: pass.done,
            flying: pass.flying,
            flyingAngle: pass.flying && pass.flyStep >= corners,
            landed: pass.flying && pass.landed,
          })
        : pass.phase !== 'compare' && pass.step === 0 && pass.instruction
          ? { tone: 'success', icon: '👉', text: pass.instruction }
          : correspondenceMessageFor({
              phase: pass.phase,
              wrong: pass.wrong,
              done: pass.done,
              flying: pass.flying,
              flyingAngle: pass.flying && pass.flyStep >= corners,
              landed: pass.flying && pass.landed,
            })) ?? { tone: 'neutral' as const, icon: '', text: '' },
    startPair,
    answer: pass.answer,
    nextPair,
  }
}