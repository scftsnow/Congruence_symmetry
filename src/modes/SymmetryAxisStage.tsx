/**
 * The axis row — 대칭축으로 선대칭도형 찾기.
 *
 * The first of three doors into the line-symmetry unit: four shapes with axes to
 * draw, then the one with none. The shell holds only what belongs to the whole
 * row — where the child is in it, which boards are done, and the ending — and
 * each board renders itself.
 */

import { DonePanel } from '../components/DonePanel'
import { symmetryAxisDonePanelFor, symmetryNextLabelFor } from '../components/symmText'
import { SYMM_AXIS_BOARDS } from '../geometry/symmetryShapes'
import { useSymmetryRun } from './useSymmetryRun'
import { useMarkComplete } from './useUnitProgress'
import { useDoneAfter, DONE_AFTER_MS } from './useDoneAfter'
import { AxisBoard } from './AxisBoard'

export function SymmetryAxisStage({
  onBack,
  onComplete,
}: {
  onBack: () => void
  onComplete?: () => void
}) {
  const run = useSymmetryRun(SYMM_AXIS_BOARDS)
  const settledCount = run.settled.filter(Boolean).length
  useMarkComplete(run.finished, onComplete)
  // The ending waits three times as long as anywhere else, because the board
  // it replaces is gone with it: the last explanation gets the same lifetime
  // as any found sentence before the ending arrives.
  const showDone = useDoneAfter(run.finished, DONE_AFTER_MS * 3)
  const done = symmetryAxisDonePanelFor()
  const board = run.board
  const key = board.kind === 'axis' ? board.item.id : board.id

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
        <h1 className="mode__title">선대칭도형 찾기</h1>
        <div className="star-counter" aria-label={`진행 ${settledCount} / ${SYMM_AXIS_BOARDS.length}`}>
          {settledCount} / {SYMM_AXIS_BOARDS.length}
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
          {/* keyed by board, so one board's lines and folds never become the next's */}
          {board.kind === 'axis' && (
            <AxisBoard
              key={`${key}:${run.round}`}
              item={board.item}
              onSettled={run.markSettled}
              onNext={run.next}
              nextLabel={symmetryNextLabelFor(run.last)}
              last={run.last}
            />
          )}

        </>
      )}
    </div>
  )
}