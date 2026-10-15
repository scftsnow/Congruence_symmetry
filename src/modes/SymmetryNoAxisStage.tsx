/**
 * The no-axis row — 대칭축이 없는 도형.
 *
 * The fourth door into the line-symmetry unit: the one figure with no axis, on
 * its own because it asks the opposite question. Every other board is settled by
 * drawing a line; this one is settled by folding and watching the mismatch, or
 * by saying there is none. The "there is none" answer stands here as it stands
 * everywhere, so its presence leaks nothing.
 */

import { DonePanel } from '../components/DonePanel'
import { symmetryNextLabelFor, symmetryNoAxisDonePanelFor } from '../components/symmText'
import { SYMM_NOAXIS_BOARDS } from '../geometry/symmetryShapes'
import { useSymmetryRun } from './useSymmetryRun'
import { AxisBoard } from './AxisBoard'

export function SymmetryNoAxisStage({ onBack }: { onBack: () => void }) {
  const run = useSymmetryRun(SYMM_NOAXIS_BOARDS)
  const done = symmetryNoAxisDonePanelFor()
  const board = run.board
  const key = board.kind === 'axis' ? board.item.id : board.id

  return (
    <div className="mode">
      <header className="mode__header">
        <button type="button" className="back-btn" onClick={onBack}>
          ← 홈으로
        </button>
        <h1 className="mode__title">대칭축이 없는 도형</h1>
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
            {SYMM_NOAXIS_BOARDS.map((b, i) => (
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