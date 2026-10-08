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
import { DonePanel } from '../components/DonePanel'
import { donePanelFor } from '../components/corrText'
import { CORRESPONDENCE_PAIRS } from '../geometry/correspondenceShapes'
import { useCorrespondence } from './useCorrespondence'
import { useToast } from './useToast'

export function CorrespondenceStage({ onBack }: { onBack: () => void }) {
  const c = useCorrespondence()
  const last = c.pairIndex + 1 >= CORRESPONDENCE_PAIRS.length
  const done = donePanelFor()

  /*
   * The same arrangement as the congruence board: everything that just happened
   * arrives in the middle and leaves again, and the one standing instruction sits
   * at the bottom of the screen where it is read once and left alone.
   *
   * `misses` is the nonce that re-arms the popup. Two wrong taps produce the same
   * words, so keying on the words alone would mean the hint said its piece once
   * and then stayed silent for every attempt after it.
   */
  const toast = useToast(
    !c.done && c.message.tone !== 'neutral' ? c.message.text : null,
    c.misses,
  )

  return (
    <div className="mode">
      <header className="mode__header">
        <button type="button" className="back-btn" onClick={onBack}>
          ← 홈으로
        </button>
        <h1 className="mode__title">대응점 · 대응변 · 대응각</h1>
      </header>

      {/*
       * The only thing ever said over the board: a match, a miss, or a part that
       * has just landed exactly on its partner.
       */}
      {toast && !c.done && (
        <Toast
          tone={c.message.tone === 'success' ? 'success' : 'hint'}
          icon={c.message.icon}
          text={toast}
        />
      )}

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
        <CorrespondenceScene
          pair={c.pair}
          phase={c.phase}
          step={c.step}
          flyStep={c.flyStep}
          landed={c.landed}
          justFound={c.justFound}
          onAnswer={c.answer}
        />
      </div>

      <div className="corr-foot">
        {c.done ? (
          /*
           * Two different endings, and the difference matters.
           *
           * After a pair that is not the last one there is more to do, so the
           * offer is the next shape. After the last one the unit is finished, and
           * looping back to the first pair — which is what this used to do — left
           * the unit with no ending at all. That now says so and goes home.
           */
          last ? (
            <DonePanel
              title={done.title}
              note={done.note}
              homeLabel={done.homeLabel}
              againLabel={done.againLabel}
              onHome={onBack}
              onAgain={() => c.startPair(0)}
            />
          ) : (
            <button type="button" className="start-btn" onClick={c.nextPair}>
              다음 도형 보기 →
            </button>
          )
        ) : (
          <>
            {/*
             * The one standing instruction, at the bottom.
             *
             * It used to be a strip across the top, above a board the child was
             * looking at rather than in. The congruence board already keeps this
             * same line in its bottom toolbar, so this is where it belongs in both
             * units: read once, then left alone, with nothing over the shapes.
             */}
            <p className="stage1-hint corr-instruction">{c.instruction}</p>
            <ol className="corr-dots" aria-label="진행">
              {Array.from({ length: c.corners }).map((_, i) => (
                <li
                  key={i}
                  className={
                    i === c.step
                      ? 'corr-dot corr-dot--now'
                      : i < c.step
                        ? 'corr-dot corr-dot--done'
                        : 'corr-dot'
                  }
                />
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  )
}