/**
 * The line-symmetric drawing board — half a figure and its axis to complete.
 *
 * Where the figure sits, which mirror it answers to, and what is said while it
 * happens. The sequence itself — walk, place, connect, show — is the shared
 * draw board's, because completing the other mirror's figure is the same
 * activity with the words exchanged.
 */

import { useMemo } from 'react'
import { SYMM_CENTER, type SymmetryBoard } from '../geometry/symmetryShapes'
import { footOnAxis, mirrorOf } from '../geometry/symmetryParts'
import {
  symmetryDrawInstructionFor,
  symmetryDrawMissedFor,
  symmetryDrawSuccessFor,
  SYMM_PARTS_HOW_CARRY,
  SYMM_PARTS_HOW_LEG,
  DRAW_LINK_ASK,
  DRAW_LINK_MISS,
  DRAW_LINKED,
} from '../components/symmPartsText'
import { PLACE_TOLERANCE, useDrawBoard } from './useDrawBoard'

type DrawBoard = Extract<SymmetryBoard, { kind: 'draw' }>

export function useSymmetryDraw(board: DrawBoard, onSettled: () => void) {
  const half = useMemo(
    () => board.half.map((p) => ({ x: p.x + SYMM_CENTER.x, y: p.y + SYMM_CENTER.y })),
    [board],
  )
  const answers = useMemo(
    () =>
      board.place.map((i) => {
        const v = board.shape.vertices[i]
        return mirrorOf({ x: v.x + SYMM_CENTER.x, y: v.y + SYMM_CENTER.y }, board.axis)
      }),
    [board],
  )
  /*
   * Which corner of the given half each point mirrors: the same place in the
   * full outline, less the two standing on the axis.
   */
  const givens = useMemo(
    () =>
      board.place.map((i) => {
        const v = board.shape.vertices[i]
        return { x: v.x + SYMM_CENTER.x, y: v.y + SYMM_CENTER.y }
      }),
    [board],
  )
  /*
   * The walk demonstrates the topmost point: the highest corner is where the
   * eye goes first, so the method is shown where the child is already looking.
   */
  const demo = useMemo(() => {
    const top = givens.indexOf(givens.reduce((a, b) => (a.y < b.y ? a : b)))
    return {
      from: givens[top],
      mid: footOnAxis(givens[top], board.axis),
      to: answers[top],
    }
  }, [givens, answers, board.axis])

  const base = useDrawBoard(
    {
      half,
      givens,
      answers,
      demo,
      placeTolerance: PLACE_TOLERANCE,
      texts: {
        instructionFor: symmetryDrawInstructionFor,
        missedFor: symmetryDrawMissedFor,
        successFor: symmetryDrawSuccessFor,
        howLeg: SYMM_PARTS_HOW_LEG,
        howCarry: SYMM_PARTS_HOW_CARRY,
        linkAsk: DRAW_LINK_ASK,
        linkMiss: DRAW_LINK_MISS,
        linked: DRAW_LINKED,
      },
    },
    onSettled,
  )
  return { ...base, axis: board.axis }
}
