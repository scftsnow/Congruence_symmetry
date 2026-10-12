/**
 * A message about something that just happened, briefly, in the middle.
 *
 * EVERY MESSAGE A UNIT SAYS GOES THROUGH HERE
 * ------------------------------------------
 * There is no strip along the top of a unit. The standing instruction used to be
 * there, and it was the worst element on the screen twice over: in the congruence
 * board it repeated what the toolbar at the bottom and the counter in the header
 * already said, three times over; and in the correspondence unit it sat above a
 * board the child was looking at rather than in it.
 *
 * So each board says what to do at the bottom, where it is read once and left
 * alone, and everything else — a pair matched, a drop that missed, a corner found,
 * a side landing exactly on its partner — arrives here, in the middle, and leaves
 * again.
 *
 * CENTRED, NOT AT THE TOP
 * ----------------------
 * The child has just dragged a shape across the board and stacked it. Their eyes
 * are on the shapes. A strip above all of that is a place they have to look away
 * to, and on a tablet held upright it may not be on screen at all. It also fought
 * the stars, which burst from the middle of the board for that same answer: one
 * reaction with its two halves at opposite ends of the screen.
 *
 * The board underneath stays completely live — no dimmed backdrop, and no pointer
 * events of its own — so a child can carry straight on dragging with a message up.
 *
 * Pure presentation. It is handed a message and draws it, and decides nothing:
 * which tone a thing gets, and whether it is worth interrupting for at all, both
 * live in useStageMessage.
 */

import type { Popup } from './tone'

export function Toast({ tone, icon, text, parts }: NonNullable<Popup>) {
  // Written out rather than assembled from the tone, so that the class names here
  // and the rules in the stylesheet can be read side by side — and so a rule with
  // nothing pointing at it shows up as one, rather than hiding in a template.
  const className = tone === 'success' ? 'toast toast--success' : 'toast toast--hint'

  return (
    <div className={className} role="status">
      <span className="toast__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="toast__text">
        {(parts ?? [{ text: text ?? '' }]).map((part, i) =>
          part.strong ? <strong key={i}>{part.text}</strong> : <span key={i}>{part.text}</span>,
        )}
      </span>
    </div>
  )
}