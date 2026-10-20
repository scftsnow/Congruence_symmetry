/**
 * The facts board — the segment joining a pair runs through the middle, and a
 * point and its image stand the same distance from it.
 *
 * Both facts on one board because they are one piece of reasoning, and because
 * the second is what makes the first true.
 */

import { PointFactsScene } from '../components/PointFactsScene'
import { Toast } from '../components/Toast'
import { NextButton } from '../components/NextButton'
import type { PointSymmetryBoard } from '../geometry/pointSymmetryShapes'
import { usePointSymmetryFacts } from './usePointSymmetryFacts'
import { useStageMessage } from './useStageMessage'

type FactsBoard = Extract<PointSymmetryBoard, { kind: 'facts' }>

export function PointFactsBoard({ board, onSettled, onNext, nextLabel, last }: {
  board: FactsBoard
  onSettled: () => void
  onNext: () => void
  nextLabel: string
  /** the last board of the row: no way on, the ending comes by itself */
  last: boolean
}) {
  const f = usePointSymmetryFacts(board, onSettled)
  const toast = useStageMessage(f.message, f.attempts)

  return (
    <>
      <div className="canvas-wrap">
        {toast && <Toast {...toast} />}
        <PointFactsScene
          vertices={f.vertices}
          center={f.center}
          stage={f.stage}
          pairs={f.pairs}
          current={f.current}
          landed={f.landed}
          turning={f.turning}
          draft={f.draft}
          joinedList={f.joinedList}
          justFound={f.justFound}
          onDrawStart={f.beginDraw}
          onDrawMove={f.moveDraw}
          onDrawEnd={f.endDraw}
        />
        {f.resolved && !last && <NextButton label={nextLabel} onClick={onNext} />}
      </div>
      <div className="sym-foot">
        {!f.resolved && (
          <ol className="sym-dots" aria-label="진행">
            {f.pairs.points.map((_, i) => (
              <li
                key={i}
                className={
                  i < f.joinedList.length
                    ? 'sym-dot sym-dot--done'
                    : i === f.joinedList.length
                      ? 'sym-dot sym-dot--now'
                      : 'sym-dot'
                }
              />
            ))}
          </ol>
        )}
      </div>
    </>
  )
}
