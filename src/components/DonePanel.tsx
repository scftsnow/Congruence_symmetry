/**
 * What a unit shows once it has been cleared.
 *
 * A unit ending in silence is a unit that has not said it finished. Clearing the
 * board used to mean a banner that turned green, a burst of stars that faded
 * after a second and a half, and then nothing to act on — the only way out was
 * the small back arrow in the header, which looks like navigation rather than
 * like the end of something.
 *
 * So the ending is stated, and it is stated in a place that stays: the board is
 * still on screen above, the whole thing is marked as finished, and there is an
 * unmistakable way back to the start.
 *
 * Pure presentation. It is handed the words and the two actions, and decides
 * nothing, for the same reason VerdictBanner does: the wording lives apart from
 * the markup so it can be read as wording.
 */

export interface DonePanelProps {
  /** the congratulation, already broken into parts so the emphasis can be bold */
  title: Array<{ text: string; strong?: boolean }>
  /** one line on what the child has actually learned */
  note: string
  /** the label of the way back to the first screen */
  homeLabel: string
  /** the label of the replay button */
  againLabel: string
  onHome: () => void
  onAgain: () => void
}

export function DonePanel({
  title,
  note,
  homeLabel,
  againLabel,
  onHome,
  onAgain,
}: DonePanelProps) {
  return (
    <section className="done" aria-live="polite">
      <p className="done__mark" aria-hidden="true">
        ⭐
      </p>
      <h2 className="done__title">
        {title.map((part, i) =>
          part.strong ? <strong key={i}>{part.text}</strong> : <span key={i}>{part.text}</span>,
        )}
      </h2>
      <p className="done__note">{note}</p>
      <button type="button" className="start-btn" onClick={onHome}>
        {homeLabel}
      </button>
      <button type="button" className="mini-btn mini-btn--ghost" onClick={onAgain}>
        {againLabel}
      </button>
    </section>
  )
}