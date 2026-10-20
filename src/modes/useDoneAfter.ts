/**
 * The ending waits its turn.
 *
 * A board's last move is the thing the child wants to see: two shapes landing
 * on one another, a figure coming back round, a line drawn exactly where it
 * belongs. The ending popup goes up over the board, so a popup that appears the
 * instant the work is judged hides the very moment it is congratulating: the
 * child sees a card, and never sees the overlap.
 *
 * So the ending waits. The work is seen first, and the words come up after it.
 */

import { useEffect, useState } from 'react'

/**
 * How long the finished work is looked at before the ending comes up.
 *
 * Long enough for the turn to land and the stars to finish bursting — the
 * celebration lasts a second and a half, and the popup rises as it ends.
 */
export const DONE_AFTER_MS = 1500

/**
 * Whether the ending may go up now.
 *
 * `done` says the work is finished; this says when the child has had their look
 * at it. It falls back to false the moment the board is not done, so a board
 * that is started over does not come back with a stale ending.
 */
export function useDoneAfter(done: boolean, after: number = DONE_AFTER_MS): boolean {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!done) {
      setShown(false)
      return
    }
    const timer = window.setTimeout(() => setShown(true), after)
    return () => window.clearTimeout(timer)
  }, [done, after])

  return shown
}
