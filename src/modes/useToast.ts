/**
 * Shows a sentence for a moment, in the middle of the board.
 *
 * It exists so a success is not a permanent change of state. The banner at the
 * top is the standing instruction and the hint after a miss, both of which have
 * to stay up; a success has no such job, so it needs a lifetime of its own or it
 * would sit there for as long as the child left the shape where it was.
 *
 * The sentence re-arms when it changes, which is what makes a second success show
 * up: after a match the message falls back to the standing instruction, and when
 * the next match arrives it is a change again. Two successes in a row with nothing
 * in between cannot happen, so there is nothing to miss.
 */

import { useEffect, useState } from 'react'

/** how long a success stays up. Long enough to read, short enough not to wait. */
export const TOAST_MS = 1600

export function useToast(text: string | null, ms: number = TOAST_MS): string | null {
  const [shown, setShown] = useState<string | null>(null)

  useEffect(() => {
    if (!text) {
      setShown(null)
      return
    }
    setShown(text)
    const timer = window.setTimeout(() => setShown(null), ms)
    return () => window.clearTimeout(timer)
  }, [text, ms])

  return shown
}