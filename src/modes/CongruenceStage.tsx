/**
 * Congruence stage — one board, one act.
 *
 * The child touches a shape to hold it, drags it onto another, then rotates
 * and flips that same held shape until the two coincide. Coincidence is the
 * answer, so there is no submit button: the moment they overlap and match, the
 * pair is recorded and a star appears.
 *
 * Everything stays semi transparent so overlap is something the child sees
 * rather than something the app asserts.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useBoard } from './useBoard'
import type { BoardShape } from './useBoard'
import { BoardShapeView, Grid, HeldOverlap, PairMark } from '../components/BoardParts'

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

  /** client coordinates -> canvas viewBox coordinates */
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

  // celebrate when a pair locks in, in an effect rather than the render body
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

      <Banner count={count} target={board.target} heldName={held?.shape.name} complete={complete} />

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

          {/* confirmed pairs sit under the shapes */}
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

          <HeldOverlap overlap={board.overlap} />

          {justFound && (
            <Celebration x={board.canvas.width / 2} y={board.canvas.height / 2} />
          )}
        </svg>
      </div>

      <HoldBar
        held={held}
        onRotate={(deg) => held && board.rotateBy(held.id, deg)}
        onFlip={() => held && board.flip(held.id)}
        onReset={board.reset}
      />
    </div>
  )
}

function Banner({
  count,
  target,
  heldName,
  complete,
}: {
  count: number
  target: number
  heldName?: string
  complete: boolean
}) {
  if (complete) {
    return (
      <div className="banner banner--success" role="status">
        <span className="banner__icon">⭐</span>
        <span className="banner__text">모두 찾았어! 방향이 달라도 겹치면 합동이야</span>
      </div>
    )
  }
  if (heldName) {
    return (
      <div className="banner banner--neutral" role="status">
        <span className="banner__icon">👆</span>
        <span className="banner__text">
          <strong>{heldName}</strong>를 잡았어. 안 맞으면 <strong>돌리기</strong>나{' '}
          <strong>뒤집기</strong>를 눌러봐 — 방향이 달라도 겹치면 합동이야
        </span>
      </div>
    )
  }
  return (
    <div className="banner banner--neutral" role="status">
      <span className="banner__icon">👆</span>
      <span className="banner__text">
        도형을 <strong>누른 뒤 끌어다</strong> 겹쳐 보세요 — <strong>{count} / {target}</strong>
      </span>
    </div>
  )
}

/**
 * The tools act on the held shape.
 *
 * They stay disabled until something is held, because an enabled button that
 * does nothing teaches nothing.
 */
function HoldBar({
  held,
  onRotate,
  onFlip,
  onReset,
}: {
  held: BoardShape | undefined
  onRotate: (deg: number) => void
  onFlip: () => void
  onReset: () => void
}) {
  return (
    <div className="toolbar">
      <div className="toolbar__actions">
        <button type="button" className="mini-btn" disabled={!held} onClick={() => onRotate(-90)}>
          ↺ 90°
        </button>
        <button type="button" className="mini-btn" disabled={!held} onClick={() => onRotate(90)}>
          ↻ 90°
        </button>
        <button type="button" className="mini-btn" disabled={!held} onClick={() => onRotate(45)}>
          45°
        </button>
        <button type="button" className="mini-btn" disabled={!held} onClick={onFlip}>
          🪞 뒤집기
        </button>
        <button type="button" className="mini-btn mini-btn--ghost" onClick={onReset}>
          ↺ 처음부터
        </button>
      </div>
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