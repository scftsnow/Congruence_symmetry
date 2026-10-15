/**
 * Where the child is in one row of the line-symmetry unit.
 *
 * Each of the three rows runs its own boards and ends its own way, so the run
 * is over the boards it is given rather than over the whole unit: what has to be
 * remembered between boards is the board and which of them are finished. That is
 * all this holds; the answering lives in the hook for whichever kind is up.
 */

import { useCallback, useState } from 'react'
import type { SymmetryBoard } from '../geometry/symmetryShapes'

export interface SymmetryRunState {
  boardIndex: number
  board: SymmetryBoard
  /** true on the board after the last */
  last: boolean
  /** which boards have been answered, so the dots can show it */
  settled: boolean[]
  /** the whole row is finished */
  finished: boolean
  /**
   * how many times the row was started over
   *
   * Part of the boards' keys, so starting over remounts them: without it the
   * same board would keep its old answers, and "처음부터" would reopen a board
   * that is already done.
   */
  round: number
  startAt: (index: number) => void
  next: () => void
  markSettled: () => void
}

export function useSymmetryRun(boards: SymmetryBoard[]): SymmetryRunState {
  const [boardIndex, setBoardIndex] = useState(0)
  const [settled, setSettled] = useState<boolean[]>(() => boards.map(() => false))
  const [round, setRound] = useState(0)

  const board = boards[boardIndex]
  const last = boardIndex + 1 >= boards.length

  const startAt = useCallback(
    (index: number) => {
      setBoardIndex(index)
      setSettled(boards.map((_, i) => i < index))
      setRound((r) => r + 1)
    },
    [boards],
  )

  const next = useCallback(() => {
    setBoardIndex((i) => Math.min(i + 1, boards.length - 1))
  }, [boards])

  const markSettled = useCallback(() => {
    setSettled((prev) => prev.map((done, i) => (i === boardIndex ? true : done)))
  }, [boardIndex])

  return {
    boardIndex,
    board,
    last,
    settled,
    finished: last && settled[boardIndex],
    round,
    startAt,
    next,
    markSettled,
  }
}