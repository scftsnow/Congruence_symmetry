/**
 * The point-symmetric drawing board — half a figure and its middle to complete.
 *
 * Where the figure sits, which mirror it answers to, and what is said while it
 * happens. The sequence itself — walk, place, span, join, show — is the shared
 * draw board's, because completing the other mirror's figure is the same
 * activity with the words exchanged.
 */

import { useMemo } from 'react'
import { POINT_SYMM_CENTER, type PointSymmetryBoard } from '../geometry/pointSymmetryShapes'
import { turnOf } from '../geometry/pointSymmetry'
import {
  pointDrawInstructionFor,
  pointDrawMissedFor,
  pointDrawSuccessFor,
  pointDrawDoneAll,
  POINT_DRAW_SPAN_ASK,
  POINT_DRAW_SPAN_MISS,
  POINT_DRAW_SPAN_DONE,
  POINT_DRAW_LINK_ASK,
  POINT_DRAW_LINK_MISS,
  POINT_DRAW_LINKED,
  POINT_PARTS_HOW_CARRY,
  POINT_PARTS_HOW_LEG,
} from '../components/pointSymmPartsText'
import { PLACE_TOLERANCE, useDrawBoard } from './useDrawBoard'

type DrawBoard = Extract<PointSymmetryBoard, { kind: 'draw' }>

export function usePointSymmetryDraw(board: DrawBoard, onSettled: () => void) {
  const half = useMemo(
    () => board.half.map((p) => ({ x: p.x + POINT_SYMM_CENTER.x, y: p.y + POINT_SYMM_CENTER.y })),
    [board],
  )
  const answers = useMemo(
    () =>
      board.place.map((i) => {
        const v = board.shape.vertices[i]
        return turnOf({ x: v.x + POINT_SYMM_CENTER.x, y: v.y + POINT_SYMM_CENTER.y }, board.center)
      }),
    [board],
  )
  /*
   * Which corner of the given half each point mirrors: the same place in the
   * full outline, less the two standing on the middle's vertical.
   */
  const givens = useMemo(
    () =>
      board.place.map((i) => {
        const v = board.shape.vertices[i]
        return { x: v.x + POINT_SYMM_CENTER.x, y: v.y + POINT_SYMM_CENTER.y }
      }),
    [board],
  )
  /* Every span ends at the middle: a point and its image stand either side of it. */
  const spanTargets = useMemo(() => givens.map(() => ({ ...board.center })), [givens, board.center])
  /*
   * The walk demonstrates the topmost point: the highest corner is where the
   * eye goes first, so the method is shown where the child is already looking.
   * Straight through the middle here — no foot, because a point has nowhere
   * to drop one.
   */
  const demo = useMemo(() => {
    const top = givens.indexOf(givens.reduce((a, b) => (a.y < b.y ? a : b)))
    return { from: givens[top], mid: { ...board.center }, to: answers[top] }
  }, [givens, answers, board.center])

  const base = useDrawBoard(
    {
      half,
      givens,
      answers,
      spanTargets,
      squareAxis: null,
      demo,
      placeTolerance: PLACE_TOLERANCE,
      texts: {
        instructionFor: pointDrawInstructionFor,
        missedFor: pointDrawMissedFor,
        successFor: pointDrawSuccessFor,
        howLeg: POINT_PARTS_HOW_LEG,
        howCarry: POINT_PARTS_HOW_CARRY,
        spanAsk: POINT_DRAW_SPAN_ASK,
        spanMiss: POINT_DRAW_SPAN_MISS,
        spanDone: POINT_DRAW_SPAN_DONE,
        linkAsk: POINT_DRAW_LINK_ASK,
        linkMiss: POINT_DRAW_LINK_MISS,
        linkDone: POINT_DRAW_LINKED,
        doneAll: pointDrawDoneAll(),
      },
    },
    onSettled,
  )
  return { ...base, center: { ...board.center } }
}
