/**
 * The drawing row — 점대칭도형 그리기.
 *
 * The last door into the point-symmetry unit, and the only one where the child's
 * own marks are the finished thing: everything before it asks the child to find
 * something that was already there, and this asks them to make something that
 * was not, out of the two facts the row before proved.
 */

import { DonePanel } from '../components/DonePanel'
import { pointDrawDonePanelFor } from '../components/pointSymmPartsText'
import { pointSymmetryNextLabelFor } from '../components/pointSymmText'
import { POINT_DRAW_BOARDS } from '../geometry/pointSymmetryShapes'
import { useSymmetryRun } from './useSymmetryRun'
import { useMarkComplete } from './useUnitProgress'
import { useDoneAfter, DONE_AFTER_MS } from './useDoneAfter'
import { PointDrawBoard } from './PointDrawBoard'

export function SymmetryPointDrawStage({
  onBack,
  onComplete,
}: {
  onBack: () => void
  onComplete?: () => void
}) {
  const run = useSymmetryRun(POINT_DRAW_BOARDS)
  const settledCount = run.settled.filter(Boolean).length
  useMarkComplete(run.finished, onComplete)
  // The ending waits three times as long as anywhere else, because the board
  // it replaces is gone with it: the last explanation gets the same lifetime
  // as any found sentence before the ending arrives.
  const showDone = useDoneAfter(run.finished, DONE_AFTER_MS * 3)
  const done = pointDrawDonePanelFor()
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
        <h1 className="mode__title">점대칭도형 그리기</h1>
        <div className="star-counter" aria-label={`진행 ${settledCount} / ${POINT_DRAW_BOARDS.length}`}>
          {settledCount} / {POINT_DRAW_BOARDS.length}
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
          {board.kind === 'draw' && (
            <PointDrawBoard
              key={`${run.boardIndex}:${run.round}`}
              board={board}
              onSettled={run.markSettled}
              onNext={run.next}
              nextLabel={pointSymmetryNextLabelFor(run.last)}
            />
          )}

          <nav className="sym-boards" aria-label="진행">
            {POINT_DRAW_BOARDS.map((_, i) => (
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
