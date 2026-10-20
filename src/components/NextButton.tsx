/**
 * The way on, in the middle of the board.
 *
 * The next button used to sit in the strip below the board — the one place on a
 * screen a child is not looking, and on a short screen below the fold
 * altogether, so the way forward was somewhere they had to scroll to find.
 *
 * It now stands in the middle of the board itself, the white panel the child
 * has been working on, over a dimming of that same panel. The board is still
 * there behind it — the shape they just did, the marks they found — and the
 * board underneath keeps its own pointer events, so nothing about the screen is
 * locked: only the button itself takes the touch.
 *
 * Pure presentation. It is handed the words and the way on, and decides
 * nothing, for the same reason DonePanel does: the wording lives apart from
 * the markup so it can be read as wording.
 */

export function NextButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="next-overlay">
      <button type="button" className="start-btn" onClick={onClick}>
        {label}
      </button>
    </div>
  )
}
