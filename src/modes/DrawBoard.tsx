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
import type { SymmetryBoard } from '../geometry/symmetryShapes'
import { useSymmetryDraw } from './useSymmetryDraw'
import { useStageMessage } from './useStageMessage'

/** how long a popup stays up here: placing takes looking, so longer than elsewhere */
const DRAW_POPUP_MS = 3400

type DrawBoard = Extract<SymmetryBoard, { kind: 'draw' }>

export function DrawBoard({ board, onSettled, onNext, nextLabel }: {
  board: DrawBoard
  onSettled: () => void
  onNext: () => void
  nextLabel: string
}) {
  const d = useSymmetryDraw(board, onSettled)
  const toast = useStageMessage(d.message, d.attempts, DRAW_POPUP_MS)

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
          demo={d.demo}
          walk={d.walk}
          flying={d.flying}
          onPlace={d.placeAt}
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