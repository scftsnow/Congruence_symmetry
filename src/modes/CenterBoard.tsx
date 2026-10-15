/**
 * The center board — the child taps a middle and watches the shape turn about it.
 *
 * One of four kinds of board in this unit, so it is its own component rather than
 * a branch inside the stage: the stage stays a description of the screen, and
 * this stays a description of the center question.
 */

import { CenterScene } from '../components/CenterScene'
import { Toast } from '../components/Toast'
import { POINT_DENY_LABEL } from '../components/pointSymmText'
import type { PointSymmetryItem } from '../geometry/pointSymmetryShapes'
import { usePointSymmetry } from './usePointSymmetry'
import { useStageMessage } from './useStageMessage'

export function CenterBoard({
  item,
  onSettled,
  onNext,
  nextLabel,
}: {
  item: PointSymmetryItem
  onSettled: () => void
  onNext: () => void
  nextLabel: string
}) {
  const s = usePointSymmetry(item, onSettled)
  const toast = useStageMessage(s.message, s.attempts)

  return (
    <>
      {toast && <Toast {...toast} />}
      <div className="canvas-wrap">
        <CenterScene
          shape={s.shape}
          tapped={s.tapped}
          turned={s.turned}
          justFound={s.justFound}
          onTap={s.tapCenter}
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
             * Only on the figure with no center would leak which one it is, so
             * it stands everywhere and is judged everywhere: right once, wrong
             * everywhere else. Its words live in pointSymmText, like all wording.
             */}
            <button type="button" className="mini-btn" onClick={s.denyClaim}>
              {POINT_DENY_LABEL}
            </button>
          </>
        )}
      </div>
    </>
  )
}
