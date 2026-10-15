/**
 * Where the child is in one row of a symmetry unit.
 *
 * Each row runs its own boards and ends its own way, so the run is over the
 * boards it is given rather than over the whole unit: what has to be remembered
 * between boards is the board and which of them are finished. That is all this
 * holds; the answering lives in the hook for whichever kind is up. Generic over
 * the board so both symmetry units run the same run.
 */

import { useCallback, useState } from 'react'

export interface SymmetryRunState<Board> {
  boardIndex: number
  board: Board
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

export function useSymmetryRun<Board>(boards: Board[]): SymmetryRunState<Board> {
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