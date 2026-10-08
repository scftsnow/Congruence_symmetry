/**
 * A success message, briefly, in the middle of the board.
 *
 * THE SUCCESS BANNER DID NOT WORK
 * -------------------------------
 * Success used to arrive as a strip along the top of the screen, which is the
 * worst possible place for it twice over. The child had dragged a shape across
 * the board and stacked it — their eyes are on the board, at the shape, at the
 * place where the two outlines have just become one. A strip above all of that is
 * a place they have to look away to, and on a tablet held upright it may not even
 * be on screen.
 *
 * It also fought the thing happening at the same moment. The stars burst from the
 * middle of the board for a good answer, and the sentence for that same answer
 * appeared at the top edge, so the two halves of one reaction were a hand's width
 * apart at opposite ends of the screen.
 *
 * So success is centred, brief, and sits with the stars.
 *
 * ONLY SUCCESS
 * ------------
 * The standing instruction and the hint after a miss stay in the strip at the
 * top, and that is not an inconsistency. They have to persist: the instruction is
 * what the child is being asked to do, and the hint has to stay up while they try
 * again. A message that vanishes after a second and a half cannot do either job.
 * A success needs neither, so it goes where the celebration already is.
 */

export function Toast({
  icon,
  text,
  parts,
}: {
  icon: string
  /** plain text, when the sentence has no emphasis in it */
  text?: string
  /** the sentence split, when part of it is worth bolding */
  parts?: Array<{ text: string; strong?: boolean }>
}) {
  return (
    <div className="toast" role="status">
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