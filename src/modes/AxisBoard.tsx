/**
 * The axis board — the child draws a line and watches the shape fold along it.
 *
 * One of four kinds of board in this unit, so it is its own component rather than
 * a branch inside the stage: the stage stays a description of the screen, and
 * this stays a description of the axis question.
 */

import { SymmetryScene } from '../components/SymmetryScene'
import { Toast } from '../components/Toast'
import { SYMM_DENY_LABEL } from '../components/symmText'
import type { SymmetryItem } from '../geometry/symmetryShapes'
import { useSymmetry } from './useSymmetry'
import { useStageMessage } from './useStageMessage'

export function AxisBoard({
  item,
  onSettled,
  onNext,
  nextLabel,
}: {
  item: SymmetryItem
  onSettled: () => void
  onNext: () => void
  nextLabel: string
}) {
  const s = useSymmetry(item, onSettled)
  const toast = useStageMessage(s.message, s.attempts)

  return (
    <>
      <div className="canvas-wrap">
        {toast && <Toast {...toast} />}
        <SymmetryScene
          shape={s.shape.shape}
          axis={s.axis}
          draft={s.draft}
          folded={s.folded}
          justFound={s.justFound}
          foundLines={s.foundLines}
          onDrawStart={s.beginDraw}
          onDrawMove={s.moveDraw}
          onDrawEnd={s.endDraw}
        />
      </div>
      <div className="sym-foot">
        {s.resolved ? (
          <button type="button" className="start-btn" onClick={onNext}>
            {nextLabel}
          </button>
        ) : (
          <>
            <p className="stage1-hint sym-instruction">{s.instruction}</p>
            {/*
             * The "there is none" answer, on every shape.
             *
             * Only on the shape with no axis would leak which one it is, so it
             * stands everywhere and is judged everywhere: right once, wrong
             * everywhere else. Its words live in symmText, like all wording.
             */}
            <button type="button" className="mini-btn" onClick={s.denyClaim}>
              {SYMM_DENY_LABEL}
            </button>
          </>
        )}
      </div>
    </>
  )
}