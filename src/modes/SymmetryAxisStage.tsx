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
import { AxisBoard } from './AxisBoard'

export function SymmetryAxisStage({
  onBack,
  onComplete,
}: {
  onBack: () => void
  onComplete?: () => void
}) {
  const run = useSymmetryRun(SYMM_AXIS_BOARDS)
  useMarkComplete(run.finished, onComplete)
  const done = symmetryAxisDonePanelFor()
  const board = run.board
  const key = board.kind === 'axis' ? board.item.id : board.id

  return (
    <div className="mode">
      <header className="mode__header">
        <button type="button" className="back-btn" onClick={onBack}>
          ← 홈으로
        </button>
        <h1 className="mode__title">선대칭도형 찾기</h1>
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
          {/* keyed by board, so one board's lines and folds never become the next's */}
          {board.kind === 'axis' && (
            <AxisBoard
              key={`${key}:${run.round}`}
              item={board.item}
              onSettled={run.markSettled}
              onNext={run.next}
              nextLabel={symmetryNextLabelFor(run.last)}
            />
          )}

          <nav className="sym-boards" aria-label="진행">
            {SYMM_AXIS_BOARDS.map((b, i) => (
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