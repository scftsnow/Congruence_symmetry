/**
 * Stage 1 screen — find the congruent pair.
 *
 * The child drags from one shape to another. Every pair, right or wrong, is
 * sent to stage 2 to be stacked by hand, because stacking is the proof.
 *
 * Coach messages follow one rule: never confirm a wrong answer, and never
 * use "different direction" as a reason to reject a pair. In 초5 2학기 a
 * rotated pair is congruent.
 */

import { useState } from 'react'
import { stage1Points, useStage1 } from './useStage1'
import type { Stage1Shape } from './useStage1'
import { pointsToPath } from '../components/svgPath'

interface Stage1Props {
  onBack: () => void
  onVerifyPair: (fromId: string, toId: string) => void
}

export function Stage1({ onBack, onVerifyPair }: Stage1Props) {
  const board = useStage1()
  const [dragFrom, setDragFrom] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const startDrag = (item: Stage1Shape) => {
    setSelected(item.id)
    setDragFrom(item.id)
  }

  const finishDrag = (target: Stage1Shape | null) => {
    if (dragFrom && target && dragFrom !== target.id) {
      board.addLink(dragFrom, target.id)
      // every pair goes to the stacking screen for proof
      onVerifyPair(dragFrom, target.id)
    }
    setDragFrom(null)
  }

  const allFound = board.foundCount >= board.correctCount

  return (
    <div className="mode">
      <header className="mode__header">
        <button type="button" className="back-btn" onClick={onBack}>
          ← 돌아가기
        </button>
        <h2 className="mode__title">합동인 도형 찾기</h2>
        <div className="star-counter" aria-label={`찾은 개수 ${board.foundCount}`}>
          {board.foundCount} / {board.correctCount}
        </div>
      </header>

      <CoachBanner
        foundCount={board.foundCount}
        total={board.correctCount}
        hasMisread={board.misread.size > 0}
        allFound={allFound}
      />

      <div className="canvas-wrap">
        <svg
          className="canvas"
          viewBox={`0 0 ${board.canvas.width} ${board.canvas.height}`}
          onPointerUp={() => finishDrag(null)}
        >
          {/* shapes */}
          {board.items.map((item) => (
            <BoardShape
              key={item.id}
              item={item}
              selected={selected === item.id}
              onPointerDown={() => startDrag(item)}
              onPointerUp={() => finishDrag(item)}
            />
          ))}

          {/* drawn links */}
          {board.links.map((link, index) => {
            const from = board.items.find((i) => i.id === link.from)!
            const to = board.items.find((i) => i.id === link.to)!
            const ok = board.checkPair(link.from, link.to).isCongruent
            return (
              <g key={index}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={ok ? '#2a9d8f' : '#c1121f'}
                  strokeWidth={5}
                  strokeLinecap="round"
                  opacity={0.85}
                />
                <circle
                  cx={(from.x + to.x) / 2}
                  cy={(from.y + to.y) / 2}
                  r={16}
                  fill={ok ? '#2a9d8f' : '#c1121f'}
                />
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 + 7}
                  fontSize={20}
                  fontWeight="700"
                  fill="#fff"
                  textAnchor="middle"
                >
                  {ok ? '✓' : '✕'}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="toolbar">
        <p className="stage1-hint">
          두 도형을 <strong>끌어서 이어 보세요</strong> — 모양과 크기가 같으면
          합동이에요.
        </p>
        <div className="toolbar__actions">
          <button type="button" className="mini-btn mini-btn--ghost" onClick={board.reset}>
            ↺ 처음부터
          </button>
        </div>
      </div>
    </div>
  )
}

function BoardShape({
  item,
  selected,
  onPointerDown,
  onPointerUp,
}: {
  item: Stage1Shape
  selected: boolean
  onPointerDown: () => void
  onPointerUp: () => void
}) {
  const pts = stage1Points(item)
  return (
    <g
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      style={{ cursor: 'pointer', touchAction: 'none' }}
    >
      <path d={pointsToPath(pts)} fill="transparent" stroke="transparent" strokeWidth={44} />
      <path
        d={pointsToPath(pts)}
        fill={item.shape.color}
        stroke={selected ? '#023047' : '#1d3557'}
        strokeWidth={selected ? 4 : 2.5}
        strokeLinejoin="round"
      />
      <text x={item.x} y={item.y + 74} fontSize={22} fontWeight={700} fill="#023047" textAnchor="middle">
        {item.id}
      </text>
    </g>
  )
}

function CoachBanner({
  foundCount,
  total,
  hasMisread,
  allFound,
}: {
  foundCount: number
  total: number
  hasMisread: boolean
  allFound: boolean
}) {
  if (allFound) {
    return (
      <div className="banner banner--success" role="status">
        <span className="banner__icon">⭐</span>
        <span className="banner__text">모두 찾았어! 방향이 달라도 합동이라는 걸 봤지?</span>
      </div>
    )
  }
  if (hasMisread) {
    return (
      <div className="banner banner--hint" role="status">
        <span className="banner__icon">🔍</span>
        <span className="banner__text">
          모양은 똑같은데 <strong>크기가 달라</strong>서 합동이 아니야
        </span>
      </div>
    )
  }
  return (
    <div className="banner banner--neutral" role="status">
      <span className="banner__icon">👆</span>
      <span className="banner__text">
        합동인 쌍을 찾아서 이어 보세요. <strong>지금까지 {foundCount} / {total}</strong>
      </span>
    </div>
  )
}