/**
 * The parts board — 대응점, then 대응변, then 대응각, on one folded shape.
 *
 * All the sequencing is the correspondence unit's: the same three passes, the
 * same dots, the same stars and the same self-running demonstration, run from
 * useCorrPass. What is left here is this unit's own business — where the shape
 * sits, which pairs are asked about, and what is said while it happens.
 *
 * WHY EACH PAIR IS ASKED ONCE, AND THE APEX TOO
 * --------------------------------------------
 * A pair has two ends, so asking every corner would ask every pair twice. The
 * board asks the lower index of each pair instead — and then the apex as well,
 * whose partner is itself: three point questions of five corners. The sides and
 * angles keep to their pairs, because a side or an angle meeting itself across
 * the axis is not a pair anyone can point at twice.
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
  /*
   * Two pairs plus the apex: the lower index of each pair, then every corner
   * standing on the axis, whose partner is itself.
   */
  const pointAsk = useMemo(() => {
    const reps = pairs.points.map(([a]) => a)
    const self: number[] = []
    vertices.forEach((_, i) => {
      if (!pairs.points.some(([a, b]) => a === i || b === i)) self.push(i)
    })
    return [...reps, ...self]
  }, [pairs, vertices])
  const ask = useMemo<PassAsk>(
    () => ({
      points: pointAsk,
      sides: pairs.sides.map(([a]) => a),
      angles: pairs.points.map(([a]) => a),
    }),
    [pairs, pointAsk],
  )
  const pass = useCorrPass(corners, {
    instruction: symmetryPartsInstructionFor,
    found: symmetryPartsFoundFor,
  }, ask)

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
    justFound: pass.justFound,
    attempts: pass.attempts,
    flying: pass.flying,
    done: pass.done,
    instruction: pass.instruction,
    message:
      (pass.justFound
        ? pass.found
        : symmetryPartsMessageFor({
            phase: pass.phase,
            wrong: pass.wrong,
            done: pass.done,
            flying: pass.flying,
            flyingAngle: pass.flying && pass.flyStep >= corners,
            landed: pass.flying && pass.landed,
          })) ?? { tone: 'neutral' as const, icon: '', text: '' },
    answer: pass.answer,
  }
}