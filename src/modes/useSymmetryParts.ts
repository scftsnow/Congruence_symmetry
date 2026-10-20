/**
 * The parts board — 대응점, then 대응변, then 대응각, on one folded shape.
 *
 * All the sequencing is the correspondence unit's: the same three passes, the
 * same dots, the same stars and the same self-running demonstration, run from
 * useCorrPass. What is left here is this unit's own business — where the shape
 * sits, which pairs are asked about, and what is said while it happens.
 *
 * WHY EACH PAIR IS ASKED ONCE, AND THE AXIS NEVER
 * --------------------------------------------
 * A pair has two ends, so asking every corner would ask every pair twice. The
 * board asks the lower index of each pair instead. A corner standing on the
 * axis is never asked: it has no counterpart to find, and asking it would make
 * "itself" an answer — which teaches that a 대응점 can be the absence of one.
 * The sides and angles keep to their pairs, because a side or an angle meeting
 * itself across the axis is not a pair anyone can point at twice.
 */

import { useEffect, useMemo } from 'react'
import { SYMM_CENTER, type SymmetryBoard } from '../geometry/symmetryShapes'
import { mirrorPairs, type MirrorPairs } from '../geometry/symmetryParts'
import type { Point } from '../geometry/types'
import {
  symmetryPartsFoundFor,
  symmetryPartsInstructionFor,
  symmetryPartsMessageFor,
} from '../components/symmPartsText'
import type { Message } from '../components/tone'
import type { Phase } from '../components/corrText'
import { useCorrPass, type PassAsk } from './useCorrPass'

type PartsBoard = Extract<SymmetryBoard, { kind: 'parts' }>

export interface SymmetryPartsState {
  /** the outline on screen, where the child sees it */
  vertices: Point[]
  /** the pairs this board asks about, so the scene marks both ends of each */
  pairs: MirrorPairs
  phase: Phase
  /** which entry of the ask list is being asked about */
  step: number
  /** the ask list for the pass in progress */
  asked: number[]
  /** how many questions this pass asks, for the dots */
  total: number
  /** the sides the demonstration folds, in the order it folds them */
  flySides: number[]
  /** the angles the demonstration folds, in the order it folds them */
  flyAngles: number[]
  /** which fold of the demonstration is on its way */
  flyStep: number
  landed: boolean
  /** the second part of the pair, which sets off after the first has come to rest */
  landedSecond: boolean
  justFound: boolean
  attempts: number
  flying: boolean
  done: boolean
  instruction: string | null
  message: Message
  answer: (given: number) => void
}

export function useSymmetryParts(board: PartsBoard, onSettled: () => void): SymmetryPartsState {
  const vertices = useMemo(
    () => board.shape.vertices.map((p) => ({ x: p.x + SYMM_CENTER.x, y: p.y + SYMM_CENTER.y })),
    [board],
  )
  const corners = vertices.length
  const pairs = useMemo(() => mirrorPairs(vertices, board.axis), [vertices, board.axis])
  /*
   * One question per pair, and none for the axis: the lower index of each
   * mirrored pair is asked, and a corner standing on the axis — mirror of
   * nothing — is asked never.
   */
  const pointAsk = useMemo(() => pairs.points.map(([a]) => a), [pairs])
  const ask = useMemo<PassAsk>(
    () => ({
      points: pointAsk,
      sides: pairs.sides.map(([a]) => a),
      angles: pairs.points.map(([a]) => a),
    }),
    [pairs, pointAsk],
  )
  const pass = useCorrPass(
    corners,
    {
      instruction: symmetryPartsInstructionFor,
      found: symmetryPartsFoundFor,
    },
    ask,
    // the two parts are mirror images of each other, so exchanging them at once
    // ends where it started: the exchange is taken in turns instead
    { sequential: true },
  )

  /* Settling is reported, not derived: the run owns which boards are done, and
   * this hook owns when this board is. */
  useEffect(() => {
    if (pass.done) onSettled()
  }, [pass.done, onSettled])

  return {
    vertices,
    pairs,
    phase: pass.phase,
    step: pass.step,
    asked: pass.asked,
    total: pass.total,
    flySides: pass.flySides,
    flyAngles: pass.flyAngles,
    flyStep: pass.flyStep,
    landed: pass.landed,
    landedSecond: pass.landedSecond,
    justFound: pass.justFound,
    attempts: pass.attempts,
    flying: pass.flying,
    done: pass.done,
    instruction: pass.instruction,
    message:
      (pass.justFound
        ? pass.found
        : pass.wrong
          ? symmetryPartsMessageFor({
              phase: pass.phase,
              wrong: true,
              done: pass.done,
              flying: pass.flying,
              flyingAngle: pass.flying && pass.flyStep >= pass.flySides.length,
              landed: pass.flying && pass.landed,
            })
          : pass.phase !== 'compare' && pass.step === 0 && pass.instruction
            ? /*
               * The ask crosses the board as a popup when its pass opens, because
               * a line at the bottom is read once and then left alone — and the
               * first question of a pass is exactly what has just happened.
               */
              { tone: 'success', icon: '👉', text: pass.instruction }
            : symmetryPartsMessageFor({
                phase: pass.phase,
                wrong: pass.wrong,
                done: pass.done,
                flying: pass.flying,
                flyingAngle: pass.flying && pass.flyStep >= pass.flySides.length,
                landed: pass.flying && pass.landed,
              })) ?? { tone: 'neutral' as const, icon: '', text: '' },
    answer: pass.answer,
  }
}