/**
 * The drawing board — half a figure and its axis, and the other half to place.
 *
 * The unit's last board, and the only one where the child's own marks are the
 * finished thing: everything before it asks the child to find something that was
 * already there, and this asks them to make something that was not.
 */

import { SymmetryDrawScene } from '../components/SymmetryDrawScene'
import { Toast } from '../components/Toast'
import type { SymmetryBoard } from '../geometry/symmetryShapes'
import { useSymmetryDraw } from './useSymmetryDraw'
import { useStageMessage } from './useStageMessage'

type DrawBoard = Extract<SymmetryBoard, { kind: 'draw' }>

export function DrawBoard({ board, onSettled, onNext, nextLabel }: {
  board: DrawBoard
  onSettled: () => void
  onNext: () => void
  nextLabel: string
}) {
  const d = useSymmetryDraw(board, onSettled)
  const toast = useStageMessage(d.message, d.attempts)

  return (
    <>
      {toast && <Toast {...toast} />}
      <div className="canvas-wrap">
        <SymmetryDrawScene
          half={d.half}
          links={d.links}
          axis={d.axis}
          resolved={d.resolved}
          justFound={d.justFound}
          onPlace={d.placeAt}
        />
      </div>
      <div className="sym-foot">
        {d.resolved ? (
          <button type="button" className="start-btn" onClick={onNext}>
            {nextLabel}
          </button>
        ) : (
          <p className="stage1-hint sym-instruction">{d.instruction}</p>
        )}
      </div>
    </>
  )
}