/**
 * Shows a sentence for a moment, in the middle of the board.
 *
 * It exists so a message is not a permanent change of state. Nothing here is a
 * standing instruction any more — the board says what to do at the bottom, where
 * it is read once and then left alone — so every message on screen is something
 * that just happened, and every one of them has to leave again.
 *
 * WHY A NONCE
 * -----------
 * The sentence alone is not enough to tell a repeat from a first. A child who
 * stacks a shape on the wrong partner gets the same sentence every time, and a
 * child who taps the wrong corner twice gets the same sentence every time. If the
 * popup keyed on the text, the second one would not appear at all: it would have
 * already faded, and nothing had changed to bring it back.
 *
 * So the caller passes a nonce that counts attempts. A new attempt re-arms the
 * popup whether or not the words are the same as last time, which is what makes a
 * repeated hint feel like a response rather than like silence.
 */

import { useEffect, useState } from 'react'

/** how long a message stays up. Long enough to read, short enough not to wait. */
export const TOAST_MS = 1800

/**
 * @param text what to say, or null for nothing to say
 * @param nonce a value that changes on every attempt, so a repeat still shows
 */
export function useToast(
  text: string | null,
  nonce: number,
  ms: number = TOAST_MS,
): string | null {
  const [shown, setShown] = useState<string | null>(null)

  useEffect(() => {
    if (!text) {
      setShown(null)
      return
    }
    setShown(text)
    const timer = window.setTimeout(() => setShown(null), ms)
    return () => window.clearTimeout(timer)
    // `nonce` is the point: it is what makes an identical sentence show again.
  }, [text, nonce, ms])

  return shown
}