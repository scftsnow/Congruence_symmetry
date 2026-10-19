/**
 * The center row — 점대칭도형 찾기.
 *
 * The first of four doors into the point-symmetry unit: four figures with
 * middles to tap, then the one with none. The shell holds only what belongs to
 * the whole row — where the child is in it, which boards are done, and the
 * ending — and each board renders itself.
 */

import { DonePanel } from '../components/DonePanel'
import { pointSymmetryDonePanelFor, pointSymmetryNextLabelFor } from '../components/pointSymmText'
import { POINT_CENTER_BOARDS } from '../geometry/pointSymmetryShapes'
import { useSymmetryRun } from './useSymmetryRun'
import { useMarkComplete } from './useUnitProgress'
import { CenterBoard } from './CenterBoard'

export function SymmetryPointAxisStage({
  onBack,
  onComplete,
}: {
  onBack: () => void
  onComplete?: () => void
}) {
  const run = useSymmetryRun(POINT_CENTER_BOARDS)
  const settledCount = run.settled.filter(Boolean).length
  useMarkComplete(run.finished, onComplete)
  const done = pointSymmetryDonePanelFor()
  const board = run.board
  const key = board.kind === 'center' ? board.item.id : board.id

  return (
    <div className="mode">
      <header className="mode__header">
        <button type="button" className="back-btn" onClick={onBack}>
          ← 홈으로
        </button>
        <h1 className="mode__title">점대칭도형 찾기</h1>
        <div className="star-counter" aria-label={`진행 ${settledCount} / ${POINT_CENTER_BOARDS.length}`}>
          {settledCount} / {POINT_CENTER_BOARDS.length}
        </div>
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
          {/* keyed by board, so one board's turns never become the next's */}
          {board.kind === 'center' && (
            <CenterBoard
              key={`${key}:${run.round}`}
              item={board.item}
              onSettled={run.markSettled}
              onNext={run.next}
              nextLabel={pointSymmetryNextLabelFor(run.last)}
            />
          )}

          <nav className="sym-boards" aria-label="진행">
            {POINT_CENTER_BOARDS.map((b, i) => (
              <button
                key={b.kind === 'center' ? b.item.id : b.id}
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
