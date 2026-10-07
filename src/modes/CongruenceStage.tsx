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
import { BoardShapeView, Grid, PairMark, StackedOverlay } from '../components/BoardParts'
import { Celebration, VerdictBanner, type BannerTone } from '../components/VerdictBanner'
import { isMatch } from '../geometry/verdict'
import type { VerdictResult } from '../geometry/verdict'

interface CongruenceStageProps {
  onBack: () => void
}

export function CongruenceStage({ onBack }: CongruenceStageProps) {
  const board = useBoard()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [justFound, setJustFound] = useState(false)
  /** true only after the child lets go, so a mere touch never turns a shape */
  const [released, setReleased] = useState(false)
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
    if (drag.current) setReleased(true)
    drag.current = null
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

      <VerdictBanner {...bannerFor(verdict, turned, count, board.target)} />

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
              onPointerDown={onPointerDown}
            />
          ))}

          {held && <StackedOverlay held={held} items={board.items} />}

          {justFound && (
            <Celebration x={board.canvas.width / 2} y={board.canvas.height / 2} />
          )}
        </svg>
      </div>

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
    </div>
  )
}

/**
 * What the system reports.
 *
 * It speaks only about a real stack. A shape that has not been laid over
 * anything gets the neutral prompt and nothing else, because "합동이야" on a
 * shape floating in mid-air is the one answer this stage must never give.
 * On a match it states the fact. On a near miss it names the difference, and
 * for a shape still on its own it stays silent, because naming "turn it" would
 * hand over the answer.
 */
function bannerFor(
  verdict: VerdictResult | null,
  turned: boolean,
  count: number,
  target: number,
): { tone: BannerTone; icon: string; parts: Array<{ text: string; strong?: boolean }> } {
  if (count >= target) {
    return {
      tone: 'success',
      icon: '⭐',
      parts: [
        { text: '모두 찾았어! ' },
        { text: '방향이 달라도', strong: true },
        { text: ' 겹치면 합동이야' },
      ],
    }
  }

  if (verdict && isMatch(verdict)) {
    // `turned` outlives the turn itself: landing the shape on its partner
    // changes the verdict to match-direct, and the child should still be told
    // that it had to be turned to get there.
    const didTurn = turned || verdict.verdict !== 'match-direct'
    return {
      tone: 'success',
      icon: '⭐',
      parts: [
        { text: didTurn ? '돌려서 겹쳤어! ' : '겹쳤어! ' },
        { text: '합동이야', strong: true },
      ],
    }
  }

  if (verdict?.verdict === 'same-shape-different-size') {
    return {
      tone: 'hint',
      icon: '🔍',
      parts: [
        { text: '모양은 같지만 ' },
        { text: '크기가 달라', strong: true },
        { text: '서 합동이 아니야' },
      ],
    }
  }

  if (verdict?.verdict === 'different-shape') {
    return {
      tone: 'hint',
      icon: '🔍',
      parts: [
        { text: '이건 ' },
        { text: '모양이 달라', strong: true },
        { text: ' — 합동이 아니야' },
      ],
    }
  }

  return {
    tone: 'neutral',
    icon: '👆',
    parts: [
      { text: '도형을 ' },
      { text: '겹쳐 보세요', strong: true },
      { text: ' — 같은 모양이면 알아서 맞춰집니다 · ' },
      { text: `${count} / ${target}`, strong: true },
    ],
  }
}