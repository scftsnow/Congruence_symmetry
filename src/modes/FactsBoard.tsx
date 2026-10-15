/**
 * The facts board — the segment joining a pair is square to the axis, and a point
 * and its image stand the same distance from it.
 *
 * Both facts on one board because they are one piece of reasoning, and because
 * the second is what makes the first true.
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
  const toast = useStageMessage(f.message, f.attempts)

  return (
    <>
      {toast && <Toast {...toast} />}
      <div className="canvas-wrap">
        <SymmetryFactsScene
          vertices={f.vertices}
          axis={board.axis}
          color={board.shape.color}
          draft={f.draft}
          joined={f.joined}
          spanned={f.spanned}
          waitingOn={f.waitingOn}
          resolved={f.resolved}
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
          <p className="stage1-hint sym-instruction">{f.instruction}</p>
        )}
      </div>
    </>
  )
}