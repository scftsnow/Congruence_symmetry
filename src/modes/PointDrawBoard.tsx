/**
 * The drawing board — half a figure and its middle, and the other half to place.
 *
 * The unit's last board, and the only one where the child's own marks are the
 * finished thing: everything before it asks the child to find something that was
 * already there, and this asks them to make something that was not. The first
 * point walks itself first, with the method spoken over it, so placing starts
 * from a walk watched rather than a sentence read.
 */

import { PointDrawScene } from '../components/PointDrawScene'
import { Toast } from '../components/Toast'
import { NextButton } from '../components/NextButton'
import type { PointSymmetryBoard } from '../geometry/pointSymmetryShapes'
import { usePointSymmetryDraw } from './usePointSymmetryDraw'
import { useStageMessage } from './useStageMessage'

type DrawBoard = Extract<PointSymmetryBoard, { kind: 'draw' }>

export function PointDrawBoard({ board, onSettled, onNext, nextLabel }: {
  board: DrawBoard
  onSettled: () => void
  onNext: () => void
  nextLabel: string
}) {
  const d = usePointSymmetryDraw(board, onSettled)
  const toast = useStageMessage(d.message, d.attempts)

  return (
    <>
      <div className="canvas-wrap">
        {toast && <Toast {...toast} />}
        <PointDrawScene
          half={d.half}
          joins={d.joins}
          placed={d.placed}
          draft={d.draft}
          center={d.center}
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
        {d.resolved && <NextButton label={nextLabel} onClick={onNext} />}
      </div>
      <div className="sym-foot">
        {!d.resolved && (
          /*
           * Dots only, no standing line: what to do arrives as a popup for every
           * point awaited, and a second telling of it underneath would compete.
           */
          <ol className="sym-dots" aria-label="진행">
            {d.placed.map((_, i) => (
              <li key={i} className="sym-dot sym-dot--done" />
            ))}
            {Array.from({ length: d.waiting }).map((_, i) => (
              <li
                key={`w${i}`}
                className={i === 0 ? 'sym-dot sym-dot--now' : 'sym-dot'}
              />
            ))}
          </ol>
        )}
      </div>
    </>
  )
}
