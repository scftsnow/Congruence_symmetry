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
import { useDoneAfter, DONE_AFTER_MS } from './useDoneAfter'
import { FactsBoard } from './FactsBoard'

export function SymmetryFactsStage({
  onBack,
  onComplete,
}: {
  onBack: () => void
  onComplete?: () => void
}) {
  const run = useSymmetryRun(SYMM_FACTS_BOARDS)
  const settledCount = run.settled.filter(Boolean).length
  useMarkComplete(run.finished, onComplete)
  // The ending waits three times as long as anywhere else, because the board
  // it replaces is gone with it: the last explanation gets the same lifetime
  // as any found sentence before the ending arrives.
  const showDone = useDoneAfter(run.finished, DONE_AFTER_MS * 3)
  const done = symmetryFactsDonePanelFor()
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
        <h1 className="mode__title">선대칭도형의 성질</h1>
        <div className="star-counter" aria-label={`진행 ${settledCount} / ${SYMM_FACTS_BOARDS.length}`}>
          {settledCount} / {SYMM_FACTS_BOARDS.length}
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
          {/* keyed by board, so one board's marks never become the next's */}
          {board.kind === 'facts' && (
            <FactsBoard
              key={`${key}:${run.round}`}
              board={board}
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