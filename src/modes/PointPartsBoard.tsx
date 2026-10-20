/**
 * The parts board — 대응점, then 대응변, then 대응각, on one shape about its middle.
 *
 * The same three passes and the same dots as the congruence unit, which is why
 * both units run one pass rather than two; the difference is only that here the
 * other half of the pair is turned halfway round instead of standing beside.
 */

import { PointPartsScene } from '../components/PointPartsScene'
import { Toast } from '../components/Toast'
import { NextButton } from '../components/NextButton'
import type { PointSymmetryBoard } from '../geometry/pointSymmetryShapes'
import { usePointSymmetryParts } from './usePointSymmetryParts'
import { useStageMessage } from './useStageMessage'

type PartsBoard = Extract<PointSymmetryBoard, { kind: 'parts' }>

export function PointPartsBoard({ board, onSettled, onNext, nextLabel }: {
  board: PartsBoard
  onSettled: () => void
  onNext: () => void
  nextLabel: string
}) {
  const p = usePointSymmetryParts(board, onSettled)
  const toast = useStageMessage(p.message, p.attempts)

  return (
    <>
      <div className="canvas-wrap">
        {toast && <Toast {...toast} />}
        <PointPartsScene
          vertices={p.vertices}
          center={p.center}
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
        {p.done && <NextButton label={nextLabel} onClick={onNext} />}
      </div>
      <div className="sym-foot">
        {!p.done && (
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
        )}
      </div>
    </>
  )
}
