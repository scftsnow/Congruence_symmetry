/**
 * The drawing row — 선대칭도형 그리기.
 *
 * The last door into the line-symmetry unit, and the only one where the child's
 * own marks are the finished thing: everything before it asks the child to find
 * something that was already there, and this asks them to make something that
 * was not, out of the two facts the row before proved.
 */

import { DonePanel } from '../components/DonePanel'
import { symmetryDrawDonePanelFor } from '../components/symmPartsText'
import { symmetryNextLabelFor } from '../components/symmText'
import { SYMM_DRAW_BOARDS } from '../geometry/symmetryShapes'
import { useSymmetryRun } from './useSymmetryRun'
import { DrawBoard } from './DrawBoard'

export function SymmetryDrawStage({ onBack }: { onBack: () => void }) {
  const run = useSymmetryRun(SYMM_DRAW_BOARDS)
  const done = symmetryDrawDonePanelFor()
  const board = run.board
  const key = board.kind === 'axis' ? board.item.id : board.id

  return (
    <div className="mode">
      <header className="mode__header">
        <button type="button" className="back-btn" onClick={onBack}>
          ← 홈으로
        </button>
        <h1 className="mode__title">선대칭도형 그리기</h1>
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
          {board.kind === 'draw' && (
            <DrawBoard
              key={`${key}:${run.round}`}
              board={board}
              onSettled={run.markSettled}
              onNext={run.next}
              nextLabel={symmetryNextLabelFor(run.last)}
            />
          )}

          <nav className="sym-boards" aria-label="진행">
            {SYMM_DRAW_BOARDS.map((b, i) => (
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