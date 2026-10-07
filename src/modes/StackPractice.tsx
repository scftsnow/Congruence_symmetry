/**
 * 모드 1. 포개기 연습
 *
 * 🎯 이 화면의 목표:
 *    아이가 직접 도형을 끌어다 포개고, 돌리고, 뒤집고, 크기를 바꾸면서
 *    "모양은 같아도 크기가 다르면 합동이 아니구나"를 스스로 발견한다.
 *
 * ⚠️ 정답 버튼이 없다. 시스템은 결과를 알려줄 뿐 유도하지 않는다.
 */

import { useEffect, useRef, useState } from 'react'
import { ShapeSvg } from '../components/ShapeSvg'
import { ResultBanner } from '../components/ResultBanner'
import { ToolBar } from '../components/ToolBar'
import { useStackPractice } from './useStackPractice'
import type { Shape } from '../geometry/types'
import { identity } from '../geometry/transforms'

interface StackPracticeProps {
  referenceShape: Shape
  movableShape: Shape
  /** pair handed over from stage 1, so the child keeps context */
  pairLabel?: string
  onBack: () => void
}

const CANVAS = 1000

export function StackPractice({
  referenceShape,
  movableShape,
  pairLabel,
  onBack,
}: StackPracticeProps) {
  const [celebrating, setCelebrating] = useState(false)
  const celebrateTimer = useRef<number | null>(null)

  const {
    transform,
    tool,
    setTool,
    result,
    refPoints,
    movPoints,
    solvedCount,
    justSolved,
    onDragStart,
    onDragMove,
    onDragEnd,
    rotateBy,
    flip,
    resetMovable,
  } = useStackPractice(referenceShape, movableShape, CANVAS)

  // 축하 애니메이션 트리거
  useEffect(() => {
    if (justSolved) {
      setCelebrating(true)
      if (celebrateTimer.current) window.clearTimeout(celebrateTimer.current)
      celebrateTimer.current = window.setTimeout(() => setCelebrating(false), 1600)
    }
    return () => {
      if (celebrateTimer.current) window.clearTimeout(celebrateTimer.current)
    }
  }, [justSolved])

  const highlight =
    result.verdict === 'congruent'
      ? '#95d5b2'
      : result.verdict === 'shape-only'
        ? '#ffd166'
        : undefined

  return (
    <div className="mode">
      {/* 헤더 */}
      <header className="mode__header">
        <button type="button" className="back-btn" onClick={onBack}>
          ← 돌아가기
        </button>
        <h2 className="mode__title">{pairLabel ? `${pairLabel} 포개어 보자` : '포개어 보자'}</h2>
        <div className="star-counter" aria-label={`맞힌 개수 ${solvedCount}`}>
          ⭐ {solvedCount}
        </div>
      </header>

      {/* 판정 결과 */}
      <ResultBanner result={result} justSolved={justSolved} />

      {/* 캔버스 */}
      <div className="canvas-wrap">
        <svg
          className="canvas"
          viewBox={`0 0 ${CANVAS} ${CANVAS * 0.62}`}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          {/* 은은한 격자 (스냅은 하지 않지만 시각적 기준 제공) */}
          <Grid width={CANVAS} height={CANVAS * 0.62} />

          {/* 기준 도형 (고정) */}
          <ShapeSvg
            shape={referenceShape}
            transform={identity(CANVAS * 0.28, CANVAS * 0.31)}
            opacity={0.95}
          />

          {/* 움직이는 도형 (아이가 조작) */}
          <ShapeSvg
            shape={movableShape}
            transform={transform}
            selected
            highlight={highlight}
            onPointerDown={onDragStart}
          />

          {/* 겹쳤을 때의 시각적 연결 */}
          {result.shapeMatches && result.verdict !== 'different' && (
            <OverlapGlow a={refPoints} b={movPoints} color={highlight ?? '#95d5b2'} />
          )}

          {/* 축하 이펙트 */}
          {celebrating && (
            <g className="celebrate">
              {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i * Math.PI) / 4
                return (
                  <text
                    key={i}
                    x={CANVAS * 0.5 + Math.cos(angle) * 130}
                    y={CANVAS * 0.31 + Math.sin(angle) * 130}
                    fontSize="44"
                    textAnchor="middle"
                    className="celebrate__star"
                    style={{ animationDelay: `${i * 0.08}s` }}
                  >
                    ⭐
                  </text>
                )
              })}
            </g>
          )}
        </svg>
      </div>

      {/* 도구 바 */}
      <ToolBar
        tool={tool}
        onToolChange={setTool}
        onRotateBy={rotateBy}
        onFlip={flip}
        onReset={resetMovable}
      />
    </div>
  )
}

/** 은은한 격자 — 손댈 필요 없고 방향 감각만 준다 */
function Grid({ width, height }: { width: number; height: number }) {
  const step = 50
  const lines = []
  for (let x = 0; x <= width; x += step) {
    lines.push(
      <line
        key={`v${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke="#dbe4ee"
        strokeWidth={1}
      />,
    )
  }
  for (let y = 0; y <= height; y += step) {
    lines.push(
      <line
        key={`h${y}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke="#dbe4ee"
        strokeWidth={1}
      />,
    )
  }
  return <g>{lines}</g>
}

/** 겹칠 때 부드러운 원형 효과 */
function OverlapGlow({
  a,
  b,
  color,
}: {
  a: Array<{ x: number; y: number }>
  b: Array<{ x: number; y: number }>
  color: string
}) {
  if (a.length === 0 || b.length === 0) return null
  const cxA = a.reduce((s, p) => s + p.x, 0) / a.length
  const cyA = a.reduce((s, p) => s + p.y, 0) / a.length
  const cxB = b.reduce((s, p) => s + p.x, 0) / b.length
  const cyB = b.reduce((s, p) => s + p.y, 0) / b.length
  const cx = (cxA + cxB) / 2
  const cy = (cyA + cyB) / 2

  return (
    <circle
      cx={cx}
      cy={cy}
      r={110}
      fill={color}
      opacity={0.18}
      className="overlap-glow"
    />
  )
}