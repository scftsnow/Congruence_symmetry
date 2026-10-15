/**
 * The parts board — 대응점, then 대응변, then 대응각, on one shape over its axis.
 *
 * The same three passes and the same dots as the congruence unit, which is why
 * both units run one pass rather than two; the difference is only that here the
 * other half of the pair is folded across the axis instead of standing beside.
 */

import { SymmetryPartsScene } from '../components/SymmetryPartsScene'
import { Toast } from '../components/Toast'
import type { SymmetryBoard } from '../geometry/symmetryShapes'
import { useSymmetryParts } from './useSymmetryParts'
import { useStageMessage } from './useStageMessage'

type PartsBoard = Extract<SymmetryBoard, { kind: 'parts' }>

export function PartsBoard({ board, onSettled, onNext, nextLabel }: {
  board: PartsBoard
  onSettled: () => void
  onNext: () => void
  nextLabel: string
}) {
  const p = useSymmetryParts(board, onSettled)
  const toast = useStageMessage(p.message, p.attempts)

  return (
    <>
      {toast && <Toast {...toast} />}
      <div className="canvas-wrap">
        <SymmetryPartsScene
          vertices={p.vertices}
          axis={board.axis}
          pairs={p.pairs}
          phase={p.phase}
          step={p.step}
          asked={p.asked}
          flySides={p.flySides}
          flyAngles={p.flyAngles}
          flyStep={p.flyStep}
          landed={p.landed}
          justFound={p.justFound}
          onAnswer={p.answer}
        />
      </div>
      <div className="sym-foot">
        {p.done ? (
          <button type="button" className="start-btn" onClick={onNext}>
            {nextLabel}
          </button>
        ) : (
          <>
            {p.instruction && <p className="stage1-hint sym-instruction">{p.instruction}</p>}
            <ol className="sym-dots" aria-label="진행">
              {Array.from({ length: p.total }).map((_, i) => (
                <li
                  key={i}
                  className={
                    i === p.step ? 'sym-dot sym-dot--now' : i < p.step ? 'sym-dot sym-dot--done' : 'sym-dot'
                  }
                />
              ))}
            </ol>
          </>
        )}
      </div>
    </>
  )
}