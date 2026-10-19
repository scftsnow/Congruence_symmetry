/**
 * The facts row — 선대칭도형의 성질.
 *
 * The third door into the line-symmetry unit: the two facts about the axis
 * together, the segment joining a pair standing square and the equal spans.
 * The textbook puts the two together because together they are one piece of
 * reasoning, and the drawing they make possible stands in its own row after.
 */

import { DonePanel } from '../components/DonePanel'
import { symmetryFactsDonePanelFor } from '../components/symmPartsText'
import { symmetryNextLabelFor } from '../components/symmText'
import { SYMM_FACTS_BOARDS } from '../geometry/symmetryShapes'
import { useSymmetryRun } from './useSymmetryRun'
import { useMarkComplete } from './useUnitProgress'
import { FactsBoard } from './FactsBoard'

export function SymmetryFactsStage({
  onBack,
  onComplete,
}: {
  onBack: () => void
  onComplete?: () => void
}) {
  const run = useSymmetryRun(SYMM_FACTS_BOARDS)
  useMarkComplete(run.finished, onComplete)
  const done = symmetryFactsDonePanelFor()
  const board = run.board
  const key = board.kind === 'axis' ? board.item.id : board.id

  return (
    <div className="mode">
      <header className="mode__header">
        <button type="button" className="back-btn" onClick={onBack}>
          ← 홈으로
        </button>
        <h1 className="mode__title">선대칭도형의 성질</h1>
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
          {/* keyed by board, so one board's marks never become the next's */}
          {board.kind === 'facts' && (
            <FactsBoard
              key={`${key}:${run.round}`}
              board={board}
              onSettled={run.markSettled}
              onNext={run.next}
              nextLabel={symmetryNextLabelFor(run.last)}
            />
          )}

          <nav className="sym-boards" aria-label="진행">
            {SYMM_FACTS_BOARDS.map((b, i) => (
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