/**
 * Correspondence stage — 대응점, then 대응변, then 대응각.
 *
 * The chrome around the scene: a banner saying what is wanted, a way to pick
 * which pair of shapes, and a row of dots showing how far along the current pass
 * the child is. All the state lives in the hook and all the drawing lives in the
 * scene, so this file is just a description of the screen.
 */

import { CorrespondenceScene } from '../components/CorrespondenceScene'
import { VerdictBanner } from '../components/VerdictBanner'
import { DonePanel } from '../components/DonePanel'
import { donePanelFor } from '../components/corrText'
import { CORRESPONDENCE_PAIRS } from '../geometry/correspondenceShapes'
import { useCorrespondence } from './useCorrespondence'

export function CorrespondenceStage({ onBack }: { onBack: () => void }) {
  const c = useCorrespondence()
  const last = c.pairIndex + 1 >= CORRESPONDENCE_PAIRS.length
  const done = donePanelFor()

  return (
    <div className="mode">
      <header className="mode__header">
        <button type="button" className="back-btn" onClick={onBack}>
          ← 홈으로
        </button>
        <h1 className="mode__title">대응점 · 대응변 · 대응각</h1>
      </header>

      {/* the banner is dropped at the end, where the panel says it better and
          keeps saying it */}
      {!c.done && (
        <VerdictBanner tone={c.banner.tone} icon={c.banner.icon} parts={[{ text: c.banner.text }]} />
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
        )}
      </div>
    </div>
  )
}