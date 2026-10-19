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
import { PointDrawBoard } from './PointDrawBoard'

export function SymmetryPointDrawStage({
  onBack,
  onComplete,
}: {
  onBack: () => void
  onComplete?: () => void
}) {
  const run = useSymmetryRun(POINT_DRAW_BOARDS)
  useMarkComplete(run.finished, onComplete)
  const done = pointDrawDonePanelFor()
  const board = run.board

  return (
    <div className="mode">
      <header className="mode__header">
        <button type="button" className="back-btn" onClick={onBack}>
          ← 홈으로
        </button>
        <h1 className="mode__title">점대칭도형 그리기</h1>
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
