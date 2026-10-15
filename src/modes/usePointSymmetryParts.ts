/**
 * The parts board — 대응점, then 대응변, then 대응각, on one turned shape.
 *
 * All the sequencing is the correspondence unit's: the same three passes, the
 * same dots, the same stars and the same self-running demonstration, run from
 * useCorrPass. What is left here is this unit's own business — where the shape
 * sits, which pairs are asked about, and what is said while it happens.
 *
 * WHY EACH PAIR IS ASKED ONCE
 * ---------------------------
 * A pair has two ends, so asking every corner would ask every pair twice. The
 * board asks the lower index of each pair instead, and the demonstration turns
 * the same pairs: no more, no fewer. Nothing here stands on the middle, so
 * every corner has a partner.
 */

import { useEffect, useMemo } from 'react'
import { POINT_SYMM_CENTER, type PointSymmetryBoard } from '../geometry/pointSymmetryShapes'
import { turnIndex } from '../geometry/pointSymmetry'
import { pairsFromPartners, type MirrorPairs } from '../geometry/symmetryParts'
import type { Point } from '../geometry/types'
import {
  pointPartsFoundFor,
  pointPartsInstructionFor,
  pointPartsMessageFor,
} from '../components/pointSymmPartsText'
import type { Message } from '../components/tone'
import type { Phase } from '../components/corrText'
import { useCorrPass, type PassAsk } from './useCorrPass'

type PartsBoard = Extract<PointSymmetryBoard, { kind: 'parts' }>

export interface PointSymmetryPartsState {
  /** the outline on screen, where the child sees it */
  vertices: Point[]
  /** the middle it turns about, where the child sees it */
  center: Point
  /** the pairs this board asks about, so the scene marks both ends of each */
  pairs: MirrorPairs
  phase: Phase
  /** which entry of the ask list is being asked about */
  step: number
  /** the ask list for the pass in progress */
  asked: number[]
  /** how many questions this pass asks, for the dots */
  total: number
  /** the sides the demonstration turns, in the order it turns them */
  flySides: number[]
  /** the angles the demonstration turns, in the order it turns them */
  flyAngles: number[]
  /** which turn of the demonstration is on its way */
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

export function usePointSymmetryParts(board: PartsBoard, onSettled: () => void): PointSymmetryPartsState {
  const vertices = useMemo(
    () => board.shape.vertices.map((p) => ({ x: p.x + POINT_SYMM_CENTER.x, y: p.y + POINT_SYMM_CENTER.y })),
    [board],
  )
  const center = useMemo(() => ({ ...board.center }), [board])
  const pairs = useMemo(() => pairsFromPartners(turnIndex(vertices, center)), [vertices, center])
  const corners = vertices.length
  const ask = useMemo<PassAsk>(
    () => ({
      points: pairs.points.map(([a]) => a),
      sides: pairs.sides.map(([a]) => a),
      angles: pairs.points.map(([a]) => a),
    }),
    [pairs],
  )
  const pass = useCorrPass(corners, {
    instruction: pointPartsInstructionFor,
    found: pointPartsFoundFor,
  }, ask)

  /* Settling is reported, not derived — see useSymmetryParts for why. */
  useEffect(() => {
    if (pass.done) onSettled()
  }, [pass.done, onSettled])

  return {
    vertices,
    center,
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
        : pointPartsMessageFor({
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
