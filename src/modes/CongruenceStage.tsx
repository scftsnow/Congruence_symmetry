/**
 * Congruence stage — one board, one act.
 *
 * The child drags a shape onto another and stops there. The system judges the
 * stack: it reports whether they already match, which quarter turn or mirror
 * would make them match, or what is wrong when nothing will.
 *
 * There is deliberately no rotate button and no flip button. Offering one
 * would tell the child that direction matters, which is the opposite of what
 * this unit teaches, and it would turn a judgement about shape into a puzzle
 * about controls. The angle is the system's problem, not the child's.
 *
 * On a match the shape eases into place, so the child watches the coincidence
 * rather than assembling it.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useBoard } from './useBoard'
import type { BoardShape } from './useBoard'
import { BoardShapeView } from '../components/BoardShapeView'
import { Grid } from '../components/BoardGrid'
import { PairMark } from '../components/PairMark'
import { StackedOverlay } from '../components/StackedOverlay'
import { Toast } from '../components/Toast'
import { Celebration } from '../components/Celebration'
import { DonePanel } from '../components/DonePanel'
import { donePanelFor, messageFor } from '../components/verdictText'
import { useToast } from './useToast'

interface CongruenceStageProps {
  onBack: () => void
}

export function CongruenceStage({ onBack }: CongruenceStageProps) {
  const board = useBoard()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [justFound, setJustFound] = useState(false)
  /** true only after the child lets go, so a mere touch never turns a shape */
  const [released, setReleased] = useState(false)
  /** one per release; re-arms the popup so a repeated miss still says something */
  const [attempts, setAttempts] = useState(0)
  /**
   * True while a finger is actually moving a shape.
   *
   * The turn is animated, which means the position is animated too, and an
   * animated position under a moving finger lags behind it — the shape would
   * trail the child by most of a second. So the transition is switched off for
   * the duration of the drag and back on the moment it is released, which is
   * also exactly when the turn starts.
   */
  const [dragging, setDragging] = useState(false)
  /**
   * Whether the shape was turned rather than simply dropped in place.
   *
   * The turn lands the shape exactly on its partner, so the verdict a moment
   * later reads match-direct and the "돌려서 겹쳤어" message would vanish at
   * the same instant the star appears. Held until the child picks up the next
   * shape, so the fact that it had to be turned is actually reported.
   */
  const [turned, setTurned] = useState(false)
  const foundTimer = useRef<number | null>(null)
  const drag = useRef<{ id: string; startX: number; startY: number; ox: number; oy: number } | null>(
    null,
  )
  const appliedRef = useRef<string>('')

  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const vb = svg.viewBox.baseVal
    return {
      x: ((clientX - rect.left) / rect.width) * vb.width,
      y: ((clientY - rect.top) / rect.height) * vb.height,
    }
  }, [])

  const onPointerDown = (item: BoardShape, e: React.PointerEvent) => {
    e.preventDefault()
    board.setHeld(item.id)
    // Judging on press would turn a shape the moment it is touched, which is
    // the opposite of what was asked for. The verdict waits for release.
    setReleased(false)
    setTurned(false)
    // Each pickup is a fresh judgement, so a shape moved away and brought back
    // is checked again rather than dismissed by a stale key.
    appliedRef.current = ''
    setDragging(true)
    const p = toCanvas(e.clientX, e.clientY)
    drag.current = { id: item.id, startX: p.x, startY: p.y, ox: item.x, oy: item.y }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const p = toCanvas(e.clientX, e.clientY)
    board.move(d.id, d.ox + (p.x - d.startX), d.oy + (p.y - d.startY))
  }

  const onPointerUp = () => {
    if (drag.current) {
      setReleased(true)
      /*
       * One release, one attempt. This is the nonce that re-arms the popup, so a
       * second stack on the same wrong partner gets the same sentence again — the
       * words do not change between the first miss and the second, and keying on
       * the words alone would mean the hint faded after one try and said nothing
       * for the next three.
       */
      setAttempts((n) => n + 1)
    }
    drag.current = null
    // Hand the position back to the animation, so the turn that follows is
    // something the child watches rather than something that already happened.
    setDragging(false)
  }

  /**
   * The system performs the turn, and only once a stack actually exists.
   *
   * judge() returns a solution only when the held shape has been laid over
   * another one, so a shape lifted and set back down in its own place, or one
   * moved near its partner but not onto it, leaves everything alone.
   */
  const verdict = board.verdict

  useEffect(() => {
    if (!released) return
    if (!verdict || !verdict.solution || !board.held) return
    // Apply once per distinct solution, so holding still does not keep turning.
    const key = board.held + ':' + verdict.solution.degrees + ':' + verdict.solution.flipped
    if (appliedRef.current === key) return
    appliedRef.current = key
    setTurned(true)
    board.applyTurn(board.held, verdict.solution)
  }, [released, verdict, board])

  const count = board.foundCount
  useEffect(() => {
    if (count === 0) return
    setJustFound(true)
    if (foundTimer.current) window.clearTimeout(foundTimer.current)
    foundTimer.current = window.setTimeout(() => setJustFound(false), 1500)
  }, [count])

  const held = board.heldItem
  const cleared = count >= board.target
  const done = donePanelFor()

  /*
   * Everything said goes through the popup in the middle of the board.
   *
   * The strip along the top is gone. What it said was already said twice — the
   * toolbar at the bottom carries the instruction and the header carries the
   * count — so it was a third copy of the same two facts, in a place the child
   * was not looking at.
   *
   * `attempts` counts releases. It is the nonce that re-arms the popup, so a
   * second wrong stack gets the same sentence again. Keyed on the words alone the
   * hint would have faded after the first attempt and stayed silent through the
   * next three, which is the one thing a hint must never do.
   */
  const message = messageFor(verdict, turned, count, board.target)
  const toast = useToast(
    !cleared && message.tone !== 'neutral' ? message.parts.map((p) => p.text).join('') : null,
    attempts,
  )

  return (
    <div className="mode">
      <header className="mode__header">
        <button type="button" className="back-btn" onClick={onBack}>
          ← 돌아가기
        </button>
        <h2 className="mode__title">합동인 도형 찾기</h2>
        <div className="star-counter" aria-label={`찾은 개수 ${count}`}>
          ⭐ {count} / {board.target}
        </div>
      </header>

      {/*
       * The only thing that is ever said over the board: a match, or a miss, or
       * the board being finished. The standing instruction is at the bottom of the
       * screen in the toolbar, where it can be read once and then left alone.
       */}
      {toast && !cleared && (
        <Toast tone={message.tone === 'success' ? 'success' : 'hint'} icon={message.icon} parts={message.parts} />
      )}

      <div className="canvas-wrap">
        <svg
          ref={svgRef}
          className="canvas"
          viewBox={`0 0 ${board.canvas.width} ${board.canvas.height}`}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <Grid width={board.canvas.width} height={board.canvas.height} />

          {board.pairs.map((pair) => (
            <PairMark key={pair.key} a={pair.a} b={pair.b} />
          ))}

          {board.items.map((item) => (
            <BoardShapeView
              key={item.id}
              item={item}
              held={board.held === item.id}
              dragging={dragging && board.held === item.id}
              onPointerDown={onPointerDown}
            />
          ))}

          {held && <StackedOverlay held={held} items={board.items} />}

          {justFound && (
            <Celebration x={board.canvas.width / 2} y={board.canvas.height / 2} />
          )}
        </svg>
      </div>

      {cleared ? (
        /*
         * The ending, and it stays.
         *
         * The star burst above fades after a second and a half, which is not long
         * enough to be an ending. This panel does not go away, so the child is
         * told the board is finished in words they can act on, and there is one
         * obvious way back to the start. The drag hint goes with it: there is
         * nothing left to drag.
         */
        <DonePanel
          title={done.title}
          note={done.note}
          homeLabel={done.homeLabel}
          againLabel={done.againLabel}
          onHome={onBack}
          onAgain={board.reset}
        />
      ) : (
        <div className="toolbar">
          <div className="toolbar__actions">
            <p className="stage1-hint">
              도형을 <strong>누른 뒤 끌어다</strong> 겹쳐 보세요. 맞으면 저절로 맞춰집니다
            </p>
            <button type="button" className="mini-btn mini-btn--ghost" onClick={board.reset}>
              ↺ 처음부터
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
