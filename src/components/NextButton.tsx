/**
 * The way on, in the middle of the board.
 *
 * The next button used to sit in the strip below the board — the one place on a
 * screen a child is not looking, and on a short screen below the fold
 * altogether, so the way forward was somewhere they had to scroll to find.
 *
 * It now stands in the middle of the board itself, the white panel the child
 * has been working on. The board is left alone — no dimming, no covering — so
 * the shape that was just finished is still there to be seen, and the board
 * underneath keeps its own pointer events: nothing about the screen is locked,
 * and only the button takes the touch.
 *
 * It does not arrive with the explanation. The sentence about what just
 * happened is read first, and the way on comes up five seconds later, so the
 * two never compete for the same glance.
 *
 * Pure presentation. It is handed the words and the way on, and decides
 * nothing, for the same reason DonePanel does: the wording lives apart from
 * the markup so it can be read as wording.
 */

import { useEffect, useState } from 'react'

/** how long the explanation is read before the way on comes up */
export const NEXT_AFTER_MS = 5000

export function NextButton({
  label,
  onClick,
  delay = NEXT_AFTER_MS,
}: {
  label: string
  onClick: () => void
  /** how long to wait before coming up; a board with more to read waits longer */
  delay?: number
}) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), delay)
    return () => window.clearTimeout(timer)
  }, [delay])

  if (!shown) return null
  return (
    <div className="next-overlay">
      <button type="button" className="start-btn" onClick={onClick}>
        {label}
      </button>
    </div>
  )
}
