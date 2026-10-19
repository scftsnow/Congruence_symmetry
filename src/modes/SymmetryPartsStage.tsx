/**
 * The parts row — 선대칭도형의 대응점·대응변·대응각 찾기.
 *
 * The second of three doors into the line-symmetry unit: the one figure whose
 * parts face each other across its axis. One board, so the run is a formality —
 * but the row still ends its own way, with the sentence the row was for.
 */

import { DonePanel } from '../components/DonePanel'
import { symmetryPartsDonePanelFor } from '../components/symmPartsText'
import { symmetryNextLabelFor } from '../components/symmText'
import { SYMM_PARTS_BOARDS } from '../geometry/symmetryShapes'
import { useSymmetryRun } from './useSymmetryRun'
import { useMarkComplete } from './useUnitProgress'
import { PartsBoard } from './PartsBoard'

export function SymmetryPartsStage({
  onBack,
  onComplete,
}: {
  onBack: () => void
  onComplete?: () => void
}) {
  const run = useSymmetryRun(SYMM_PARTS_BOARDS)
  useMarkComplete(run.finished, onComplete)
  const done = symmetryPartsDonePanelFor()
  const board = run.board

  return (
    <div className="mode">
      <header className="mode__header">
        <button type="button" className="back-btn" onClick={onBack}>
          ← 홈으로
        </button>
        <h1 className="mode__title">선대칭도형의 대응점·대응변·대응각</h1>
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
            <PartsBoard
              key={`${board.id}:${run.round}`}
              board={board}
              onSettled={run.markSettled}
              onNext={run.next}
              nextLabel={symmetryNextLabelFor(run.last)}
            />
          )}

          <nav className="sym-boards" aria-label="진행">
            {SYMM_PARTS_BOARDS.map((b, i) => (
              <button
                key={b.kind === 'axis' ? b.item.id : b.id}
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