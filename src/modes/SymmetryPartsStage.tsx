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
import { useDoneAfter, DONE_AFTER_MS } from './useDoneAfter'
import { PartsBoard } from './PartsBoard'

export function SymmetryPartsStage({
  onBack,
  onComplete,
}: {
  onBack: () => void
  onComplete?: () => void
}) {
  const run = useSymmetryRun(SYMM_PARTS_BOARDS)
  const settledCount = run.settled.filter(Boolean).length
  useMarkComplete(run.finished, onComplete)
  // The ending waits three times as long as anywhere else, because the board
  // it replaces is gone with it: the last explanation gets the same lifetime
  // as any found sentence before the ending arrives.
  const showDone = useDoneAfter(run.finished, DONE_AFTER_MS * 3)
  const done = symmetryPartsDonePanelFor()
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
        <h1 className="mode__title">선대칭도형의 대응점·대응변·대응각</h1>
        <div className="star-counter" aria-label={`진행 ${settledCount} / ${SYMM_PARTS_BOARDS.length}`}>
          {settledCount} / {SYMM_PARTS_BOARDS.length}
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
            <PartsBoard
              key={`${board.id}:${run.round}`}
              board={board}
              onSettled={run.markSettled}
              onNext={run.next}
              nextLabel={symmetryNextLabelFor(run.last)}
              last={run.last}
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