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
          links={d.links}
          segments={d.segments}
          draft={d.draft}
          center={d.center}
          color={board.shape.color}
          complete={d.complete}
          resolved={d.resolved}
          justFound={d.justFound}
          demo={d.demo}
          walk={d.walk}
          flying={d.flying}
          legDrawn={d.legDrawn}
          onDrawStart={d.beginDraw}
          onDrawMove={d.moveDraw}
          onDrawEnd={d.endDraw}
        />
      </div>
      <div className="sym-foot">
        {d.resolved ? (
          <button type="button" className="start-btn" onClick={onNext}>
            {nextLabel}
          </button>
        ) : (
          /*
           * Dots only, no standing line: what to do arrives as a popup for every
           * point awaited, and a second telling of it underneath would compete.
           */
          <ol className="sym-dots" aria-label="진행">
            {d.links.map((_, i) => (
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
