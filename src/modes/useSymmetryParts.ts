/**
 * The parts board — 대응점, then 대응변, then 대응각, on one folded shape.
 *
 * All the sequencing is the correspondence unit's: the same three passes, the
 * same dots, the same stars and the same self-running demonstration, run from
 * useCorrPass. What is left here is this unit's own business — where the shape
 * sits, which pairs are asked about, and what is said while it happens.
 *
 * WHY EACH PAIR IS ASKED ONCE
 * ---------------------------
 * A pair has two ends, so asking every corner would ask every pair twice — once
 * from each end. The board asks the lower index of each pair instead, and the
 * demonstration folds the same pairs: no more, no fewer. A side whose mirror
 * image is itself has no partner at all, so it is asked neither here nor there.
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
  const ask = useMemo<PassAsk>(
    () => ({
      points: pairs.points.map(([a]) => a),
      sides: pairs.sides.map(([a]) => a),
      angles: pairs.points.map(([a]) => a),
    }),
    [pairs],
  )
  const pass = useCorrPass(corners, {
    instruction: symmetryPartsInstructionFor,
    found: symmetryPartsFoundFor,
  }, ask)

  /*
   * Settling is reported, not derived. The run owns which boards are done, and
   * this hook owns when this board is — so when the demonstration runs to the
   * end it says so, once, from an effect rather than the render body.
   */
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
    justFound: pass.justFound,
    attempts: pass.attempts,
    flying: pass.flying,
    done: pass.done,
    instruction: pass.instruction,
    message:
      (pass.justFound && pass.phase !== 'compare'
        ? pass.found
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