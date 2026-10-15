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
   * The pulse re-arms the popup for each pair's trip: the three trips say the
   * same sentence, and keyed on the words alone the second and third would find
   * nothing changed and stay silent.
   */
  const toast = useStageMessage(f.message, f.attempts + f.pulse)

  return (
    <>
      {toast && <Toast {...toast} />}
      <div className="canvas-wrap">
        <SymmetryFactsScene
          vertices={f.vertices}
          axis={board.axis}
          color={board.shape.color}
          stage={f.stage}
          pairs={f.pairs}
          equalStep={f.equalStep}
          landed={f.landed}
          draft={f.draft}
          joined={f.joined}
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
          /*
           * Nothing standing while watching: a part is appearing and the popup
           * is saying what it just showed, and a line under it would compete
           * with the sentence that carries the lesson.
           */
          f.instruction && <p className="stage1-hint sym-instruction">{f.instruction}</p>
        )}
      </div>
    </>
  )
}