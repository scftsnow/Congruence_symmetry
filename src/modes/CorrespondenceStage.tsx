/**
 * Correspondence stage — 대응점, then 대응변, then 대응각.
 *
 * The chrome around the scene: a way to pick
 * which pair of shapes, and a row of dots showing how far along the current pass
 * the child is. All the state lives in the hook and all the drawing lives in the
 * scene, so this file is just a description of the screen.
 */

import { CorrespondenceScene } from '../components/CorrespondenceScene'
import { Toast } from '../components/Toast'
import { NextButton } from '../components/NextButton'
import { DonePanel } from '../components/DonePanel'
import { correspondenceDonePanelFor, NEXT_SHAPE } from '../components/corrText'
import { CORRESPONDENCE_PAIRS } from '../geometry/correspondenceShapes'
import { useCorrespondence } from './useCorrespondence'
import { useStageMessage, POPUP_MS } from './useStageMessage'
import { useMarkComplete } from './useUnitProgress'
import { useDoneAfter, DONE_AFTER_MS } from './useDoneAfter'

export function CorrespondenceStage({
  onBack,
  onComplete,
}: {
  onBack: () => void
  onComplete?: () => void
}) {
  const c = useCorrespondence()
  // the last pair's last part is answered, which is when the ending goes up
  useMarkComplete(c.done, onComplete)
  const last = c.pairIndex + 1 >= CORRESPONDENCE_PAIRS.length
  const done = correspondenceDonePanelFor()
  /*
   * The ending waits for the last part to be looked at landing.
   *
   * The part flying onto its partner is the last thing the board does, and the
   * popup covers the board while it is up — so a popup that rises the instant
   * the last answer is given hides the very thing it is congratulating.
   *
   * The conclusion itself is read slowly here: its popup stays twice as long,
   * and the ending waits twice as long to follow it.
   */
  const showDone = useDoneAfter(c.done && last, DONE_AFTER_MS * 2)

  /*
   * The same rule as the congruence board, in the same place: every answer is
   * answered. A corner found, a wrong corner, a side landing on its partner — all
   * of it crosses the board and then leaves. Only the standing instruction is
   * different, and that sits at the bottom.
   *
   * `attempts` counts taps, and it is what re-arms the popup: two wrong taps
   * produce the same words, so keying on the words alone would leave the child
   * still stuck and told nothing.
   */
  const toast = useStageMessage(c.message, c.attempts, c.done ? POPUP_MS * 2 : POPUP_MS)

  return (
    <div className="mode">
      <header className="mode__header">
        <div className="mode__actions">
          <button type="button" className="back-btn" onClick={onBack}>
            ← 홈으로
          </button>
          <button type="button" className="mini-btn mini-btn--ghost" onClick={() => c.startPair(0)}>
            ↺ 처음부터
          </button>
        </div>
        <h1 className="mode__title">대응점 · 대응변 · 대응각</h1>
        <div className="star-counter" aria-label={`도형 ${c.pairIndex + 1} / ${CORRESPONDENCE_PAIRS.length}`}>
          {c.pairIndex + 1} / {CORRESPONDENCE_PAIRS.length}
        </div>
      </header>

      <nav className="corr-pairs" aria-label="도형 고르기">
        {CORRESPONDENCE_PAIRS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={i === c.pairIndex ? 'corr-pair corr-pair--now' : 'corr-pair'}
            onClick={() => c.startPair(i)}
          >
            {p.transformNote}
          </button>
        ))}
      </nav>

      <div className="canvas-wrap">
        {toast && <Toast {...toast} />}
        <CorrespondenceScene
          pair={c.pair}
          phase={c.phase}
          step={c.step}
          asked={c.asked}
          flyStep={c.flyStep}
          landed={c.landed}
          justFound={c.justFound}
          onAnswer={c.answer}
        />
        {c.done && !last && (
          /*
           * The moment the conclusion popup retires: the popup stays twice as
           * long, and the way on follows it with no dead wait in between and
           * no overlap either.
           */
          <NextButton label={NEXT_SHAPE} onClick={c.nextPair} delay={POPUP_MS * 2 + 400} />
        )}
      </div>

      {c.done && last && showDone ? (
        /*
         * After the last pair the unit is finished, and looping back to the
         * first pair — which is what this used to do — left the unit with no
         * ending at all. That now says so and goes home.
         */
        <DonePanel
          title={done.title}
          note={done.note}
          homeLabel={done.homeLabel}
          againLabel={done.againLabel}
          onHome={onBack}
          onAgain={() => c.startPair(0)}
        />
      ) : null}
    </div>
  )
}