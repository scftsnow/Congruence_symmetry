/**
 * The facts board — the two facts about the axis, in the textbook's order.
 *
 * The child joins one pair of corresponding points, and then the board shows
 * what that joining proves: first the square, then the equal spans. Both facts
 * on one board because they are one piece of reasoning.
 */

import { SymmetryFactsScene } from '../components/SymmetryFactsScene'
import { Toast } from '../components/Toast'
import type { SymmetryBoard } from '../geometry/symmetryShapes'
import { useSymmetryFacts } from './useSymmetryFacts'
import { useStageMessage } from './useStageMessage'

type FactsBoard = Extract<SymmetryBoard, { kind: 'facts' }>

export function FactsBoard({ board, onSettled, onNext, nextLabel }: {
  board: FactsBoard
  onSettled: () => void
  onNext: () => void
  nextLabel: string
}) {
  const f = useSymmetryFacts(board, onSettled)
  /*
   * The round itself re-arms the popup: joining, missing and landing all change
   * state, so the same sentence arriving again always finds something changed.
   */
  const toast = useStageMessage(f.message, f.attempts)

  return (
    <>
      <div className="canvas-wrap">
        {toast && <Toast {...toast} />}
        <SymmetryFactsScene
          vertices={f.vertices}
          axis={board.axis}
          color={board.shape.color}
          stage={f.stage}
          pairs={f.pairs}
          current={f.current}
          landed={f.landed}
          draft={f.draft}
          joinedList={f.joinedList}
          justFound={f.justFound}
          onDrawStart={f.beginDraw}
          onDrawMove={f.moveDraw}
          onDrawEnd={f.endDraw}
        />
      </div>
      <div className="sym-foot">
        {f.resolved ? (
          <button type="button" className="start-btn" onClick={onNext}>
            {nextLabel}
          </button>
        ) : (
          <>
            {f.instruction && <p className="stage1-hint sym-instruction">{f.instruction}</p>}
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
          </>
        )}
      </div>
    </>
  )
}