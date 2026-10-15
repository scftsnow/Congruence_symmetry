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
import { PointPartsBoard } from './PointPartsBoard'

export function SymmetryPointPartsStage({ onBack }: { onBack: () => void }) {
  const run = useSymmetryRun(POINT_PARTS_BOARDS)
  const done = pointPartsDonePanelFor()
  const board = run.board

  return (
    <div className="mode">
      <header className="mode__header">
        <button type="button" className="back-btn" onClick={onBack}>
          ← 홈으로
        </button>
        <h1 className="mode__title">점대칭도형의 대응점·대응변·대응각</h1>
      </header>

      {run.finished ? (
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
            />
          )}

          <nav className="sym-boards" aria-label="진행">
            {POINT_PARTS_BOARDS.map((_, i) => (
              <button
                key={i}
                type="button"
                className={
                  i === run.boardIndex
                    ? 'sym-board sym-board--now'
                    : run.settled[i]
                      ? 'sym-board sym-board--done'
                      : 'sym-board'
                }
                onClick={() => run.startAt(i)}
              />
            ))}
          </nav>
        </>
      )}
    </div>
  )
}
