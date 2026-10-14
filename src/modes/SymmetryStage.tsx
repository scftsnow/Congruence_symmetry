/**
 * Symmetry stage — draw the line, watch it fold.
 *
 * The chrome around the scene: a row of dots showing which shape is up, the one
 * standing instruction at the bottom, and the ending once every shape is
 * settled. All the state lives in the hook and all the drawing lives in the
 * scene, so this file is just a description of the screen.
 */

import { SymmetryScene } from '../components/SymmetryScene'
import { Toast } from '../components/Toast'
import { DonePanel } from '../components/DonePanel'
import { symmetryDonePanelFor } from '../components/symmText'
import { SYMMETRY_ITEMS } from '../geometry/symmetryShapes'
import { useSymmetry } from './useSymmetry'
import { useStageMessage } from './useStageMessage'

export function SymmetryStage({ onBack }: { onBack: () => void }) {
  const s = useSymmetry()
  const last = s.shapeIndex + 1 >= SYMMETRY_ITEMS.length
  const done = symmetryDonePanelFor()

  /*
   * The same rule as the other units, in the same place: every answer is
   * answered. A fold that lands, a line that misses the shape, a line at the
   * wrong angle — all of it crosses the board and then leaves. Only the standing
   * instruction is different, and that sits at the bottom.
   *
   * `attempts` counts drawn lines, and it is what re-arms the popup: two wrong
   * lines produce the same words, so keying on the words alone would leave the
   * child still stuck and told nothing.
   */
  const toast = useStageMessage(s.message, s.attempts)

  return (
    <div className="mode">
      <header className="mode__header">
        <button type="button" className="back-btn" onClick={onBack}>
          ← 홈으로
        </button>
        <h1 className="mode__title">선대칭</h1>
      </header>

      {toast && <Toast {...toast} />}

      <div className="canvas-wrap">
        <SymmetryScene
          shape={s.shape.shape}
          axis={s.axis}
          draft={s.draft}
          folded={s.folded}
          justFound={s.justFound}
          foundLines={s.foundLines}
          onDrawStart={s.beginDraw}
          onDrawMove={s.moveDraw}
          onDrawEnd={s.endDraw}
        />
      </div>

      <div className="sym-foot">
        {s.resolved ? (
          /*
           * Settled shapes stay settled. Going back to an earlier shape would
           * unspend the answer without asking anything new, and looping the last
           * shape round to the first — which an earlier unit did — leaves a unit
           * with no ending at all.
           */
          last ? (
            <DonePanel
              title={done.title}
              note={done.note}
              homeLabel={done.homeLabel}
              againLabel={done.againLabel}
              onHome={onBack}
              onAgain={() => s.startShape(0)}
            />
          ) : (
            <button type="button" className="start-btn" onClick={s.nextShape}>
              다음 도형 보기 →
            </button>
          )
        ) : (
          <>
            {/*
             * The one standing instruction, at the bottom.
             *
             * It names the gesture, never the answer: above the shape is a place
             * the child is not looking at, and both earlier units keep it in the
             * same place, so all three say it from there.
             */}
            <p className="stage1-hint sym-instruction">{s.instruction}</p>
            <ol className="sym-dots" aria-label="진행">
              {SYMMETRY_ITEMS.map((item, i) => (
                <li
                  key={item.id}
                  className={
                    i === s.shapeIndex
                      ? 'sym-dot sym-dot--now'
                      : i < s.shapeIndex
                        ? 'sym-dot sym-dot--done'
                        : 'sym-dot'
                  }
                />
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  )
}
