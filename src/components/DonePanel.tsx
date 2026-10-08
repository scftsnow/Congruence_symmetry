/**
 * What a unit shows once it has been cleared.
 *
 * A popup, not a panel at the bottom of the page, and that is the whole reason
 * this file exists in this shape.
 *
 * The congruence board is tall — a 1100 by 760 canvas in a column — so on a
 * tablet held upright the ending used to land below the fold. A child who cleared
 * five pairs by dragging shapes around the board has very likely scrolled, and
 * would have watched the stars burst somewhere off screen and then nothing at
 * all: no message, no way forward, and no reason to believe anything had happened.
 *
 * So it is fixed to the window and centred, which means it cannot be scrolled
 * past or pushed off a short screen. The board stays visible behind it, dimmed, so
 * the child can see what they finished.
 *
 * Pure presentation. It is handed the words and the two actions, and decides
 * nothing, for the same reason VerdictBanner does: the wording lives apart from
 * the markup so it can be read as wording.
 */

export interface DonePanelProps {
  /** the congratulation, split so the emphasis can be bolded */
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
  const spoken = title.map((p) => p.text).join('')
  return (
    <div className="done">
      <section
        className="done__card"
        role="dialog"
        aria-modal="true"
        aria-label={spoken}
      >
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
        <button type="button" className="mini-btn" onClick={onAgain}>
          {againLabel}
        </button>
      </section>
    </div>
  )
}