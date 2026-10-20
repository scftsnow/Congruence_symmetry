/**
 * The drawing board — half a figure and its axis, and the other half to place.
 *
 * The unit's last board, and the only one where the child's own marks are the
 * finished thing: everything before it asks the child to find something that was
 * already there, and this asks them to make something that was not. The first
 * point walks itself first, with the method spoken over it, so placing starts
 * from a walk watched rather than a sentence read.
 */

import { SymmetryDrawScene } from '../components/SymmetryDrawScene'
import { Toast } from '../components/Toast'
import { NextButton } from '../components/NextButton'
import type { SymmetryBoard } from '../geometry/symmetryShapes'
import { useSymmetryDraw } from './useSymmetryDraw'
import { useStageMessage } from './useStageMessage'

type DrawBoard = Extract<SymmetryBoard, { kind: 'draw' }>

export function DrawBoard({ board, onSettled, onNext, nextLabel, last }: {
  board: DrawBoard
  onSettled: () => void
  onNext: () => void
  nextLabel: string
  /** the last board of the row: no way on, the ending comes by itself */
  last: boolean
}) {
  const d = useSymmetryDraw(board, onSettled, last)
  const toast = useStageMessage(d.message, d.attempts)

  return (
    <>
      <div className="canvas-wrap">
        {toast && <Toast {...toast} />}
        <SymmetryDrawScene
          half={d.half}
          joins={d.joins}
          placed={d.placed}
          draft={d.draft}
          axis={d.axis}
          color={board.shape.color}
          complete={d.complete}
          justFound={d.justFound}
          demo={d.demo}
          walk={d.walk}
          flying={d.flying}
          legDrawn={d.legDrawn}
          landed={d.landed}
          onDrawStart={d.beginDraw}
          onDrawMove={d.moveDraw}
          onDrawEnd={d.endDraw}
        />
        {d.resolved && !last && (
          /*
           * resolved fires the moment the finishing popup clears (DONE_SHOW_MS),
           * so the way on follows it with no dead wait in between.
           */
          <NextButton label={nextLabel} onClick={onNext} delay={400} />
        )}
      </div>
    </>
  )
}