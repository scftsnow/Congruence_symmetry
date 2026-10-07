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
import { isMatch } from '../geometry/verdict'
import type { VerdictResult } from '../geometry/verdict'

interface CongruenceStageProps {
  onBack: () => void
}

export function CongruenceStage({ onBack }: CongruenceStageProps) {
  const board = useBoard()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [justFound, setJustFound] = useState(false)
  const foundTimer = useRef<number | null>(null)
  const drag = useRef<{ id: string; startX: number; startY: number; ox: number; oy: number } | null>(
    null,
  )

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
    drag.current = null
  }

  /**
   * The system performs the turn.
   *
   * Applied on release, not continuously, so the child lets go and then
   * watches the shape swing round onto the other one.
   */
  const verdict = board.verdict
  const appliedRef = useRef<string>('')

  useEffect(() => {
    if (!verdict || !verdict.solution || !board.held) return
    // Apply once per distinct solution, so holding still does not keep turning.
    const key = board.held + ':' + verdict.solution.degrees + ':' + verdict.solution.flipped
    if (appliedRef.current === key) return
    appliedRef.current = key
    board.applyTurn(board.held, verdict.solution)
  }, [verdict, board])

  const count = board.foundCount
  useEffect(() => {
    if (count === 0) return
    setJustFound(true)
    if (foundTimer.current) window.clearTimeout(foundTimer.current)
    foundTimer.current = window.setTimeout(() => setJustFound(false), 1500)
  }, [count])

  const complete = count >= board.target
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

      <Banner verdict={verdict} count={count} target={board.target} complete={complete} />

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
 * On a match it states the fact. On a near miss it states what is wrong, and
 * for the last case it stays silent, because naming "turn it" would give the
 * answer away.
 */
function Banner({
  verdict,
  count,
  target,
  complete,
}: {
  verdict: VerdictResult | null
  count: number
  target: number
  complete: boolean
}) {
  if (complete) {
    return (
      <div className="banner banner--success" role="status">
        <span className="banner__icon">⭐</span>
        <span className="banner__text">
          모두 찾았어! <strong>방향이 달라도</strong> 겹치면 합동이야
        </span>
      </div>
    )
  }

  if (verdict && isMatch(verdict)) {
    const turned = verdict.verdict !== 'match-direct'
    return (
      <div className="banner banner--success" role="status">
        <span className="banner__icon">⭐</span>
        <span className="banner__text">
          {turned ? '돌려서 겹쳤어! ' : '겹쳤어! '}합동이야
        </span>
      </div>
    )
  }

  if (verdict?.verdict === 'same-shape-different-size') {
    return (
      <div className="banner banner--hint" role="status">
        <span className="banner__icon">🔍</span>
        <span className="banner__text">
          모양은 같지만 <strong>크기가 달라</strong>서 합동이 아니야
        </span>
      </div>
    )
  }

  if (verdict?.verdict === 'different-shape') {
    return (
      <div className="banner banner--hint" role="status">
        <span className="banner__icon">🔍</span>
        <span className="banner__text">이건 <strong>모양이 달라</strong> — 합동이 아니야</span>
      </div>
    )
  }

  return (
    <div className="banner banner--neutral" role="status">
      <span className="banner__icon">👆</span>
      <span className="banner__text">
        도형을 <strong>겹쳐 보세요</strong> — 같은 모양이면 알아서 맞춰집니다 ·{' '}
        <strong>
          {count} / {target}
        </strong>
      </span>
    </div>
  )
}

function Celebration({ x, y }: { x: number; y: number }) {
  return (
    <g className="celebrate" pointerEvents="none">
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * Math.PI) / 4
        return (
          <text
            key={i}
            x={x + Math.cos(angle) * 120}
            y={y + Math.sin(angle) * 120}
            fontSize="42"
            textAnchor="middle"
            className="celebrate__star"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            ⭐
          </text>
        )
      })}
    </g>
  )
}