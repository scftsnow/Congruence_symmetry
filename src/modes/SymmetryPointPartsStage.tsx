/**
 * The parts row — 점대칭도형의 대응점·대응변·대응각.
 *
 * The second of four doors into the point-symmetry unit: the one figure whose
 * parts face each other across its middle. One board, so the run is a formality —
 * but the row still ends its own way, with the sentence the row was for.
 */

import { DonePanel } from '../components/DonePanel'
import { pointPartsDonePanelFor } from '../components/pointSymmPartsText'
import { pointSymmetryNextLabelFor } from '../components/pointSymmText'
import { POINT_PARTS_BOARDS } from '../geometry/pointSymmetryShapes'
import { useSymmetryRun } from './useSymmetryRun'
import { useMarkComplete } from './useUnitProgress'
import { useDoneAfter, DONE_AFTER_MS } from './useDoneAfter'
import { PointPartsBoard } from './PointPartsBoard'

export function SymmetryPointPartsStage({
  onBack,
  onComplete,
}: {
  onBack: () => void
  onComplete?: () => void
}) {
  const run = useSymmetryRun(POINT_PARTS_BOARDS)
  const settledCount = run.settled.filter(Boolean).length
  useMarkComplete(run.finished, onComplete)
  // The ending waits three times as long as anywhere else, because the board
  // it replaces is gone with it: the last explanation gets the same lifetime
  // as any found sentence before the ending arrives.
  const showDone = useDoneAfter(run.finished, DONE_AFTER_MS * 3)
  const done = pointPartsDonePanelFor()
  const board = run.board

  return (
    <div className="mode">
      <header className="mode__header">
        <div className="mode__actions">
          <button type="button" className="back-btn" onClick={onBack}>
            ← 홈으로
          </button>
          <button type="button" className="mini-btn mini-btn--ghost" onClick={() => run.startAt(0)}>
            ↺ 처음부터
          </button>
        </div>
        <h1 className="mode__title">점대칭도형의 대응점·대응변·대응각</h1>
        <div className="star-counter" aria-label={`진행 ${settledCount} / ${POINT_PARTS_BOARDS.length}`}>
          {settledCount} / {POINT_PARTS_BOARDS.length}
        </div>
      </header>

      {showDone ? (
        <DonePanel
          title={done.title}
          note={done.note}
          homeLabel={done.homeLabel}
          againLabel={done.againLabel}
          onHome={onBack}
          onAgain={() => run.startAt(0)}
        />
      ) : (
        <>
          {board.kind === 'parts' && (
            <PointPartsBoard
              key={`${board.id}:${run.round}`}
              board={board}
              onSettled={run.markSettled}
              onNext={run.next}
              nextLabel={pointSymmetryNextLabelFor(run.last)}
              last={run.last}
            />
          )}

        </>
      )}
    </div>
  )
}
