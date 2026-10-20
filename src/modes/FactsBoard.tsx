/**
 * The facts board — the two facts about the axis, in the textbook's order.
 *
 * The child joins one pair of corresponding points, and then the board shows
 * what that joining proves: first the square, then the equal spans. Both facts
 * on one board because they are one piece of reasoning.
 */

import { SymmetryFactsScene } from '../components/SymmetryFactsScene'
import { Toast } from '../components/Toast'
import { NextButton } from '../components/NextButton'
import type { SymmetryBoard } from '../geometry/symmetryShapes'
import { useSymmetryFacts } from './useSymmetryFacts'
import { useStageMessage } from './useStageMessage'

type FactsBoard = Extract<SymmetryBoard, { kind: 'facts' }>

export function FactsBoard({ board, onSettled, onNext, nextLabel, last }: {
  board: FactsBoard
  onSettled: () => void
  onNext: () => void
  nextLabel: string
  /** the last board of the row: no way on, the ending comes by itself */
  last: boolean
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
        {f.resolved && !last && <NextButton label={nextLabel} onClick={onNext} />}
      </div>
    </>
  )
}