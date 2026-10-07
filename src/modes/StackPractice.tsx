/**
 * Stage 2 — prove congruence by stacking.
 *
 * The child drags one shape onto the other. Congruence is defined by complete
 * overlap, so the screen has to make the overlap visible:
 *
 *   - both shapes are semi transparent, so the one behind stays visible
 *   - the real intersection is drawn on top as a solid region
 *   - a coverage bar shows how much is shared, in percent
 *   - rotating and flipping are offered, because "direction does not matter"
 *     is only believable if the child sees a rotated pair close up
 *
 * Tools are move, rotate and flip. Scale is deliberately absent: the
 * curriculum places "same shape, different size" later, so this screen never
 * produces that situation.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { ShapeSvg } from '../components/ShapeSvg'
import { ResultBanner } from '../components/ResultBanner'
import { ToolBar } from '../components/ToolBar'
import { OverlapLayer } from '../components/OverlapLayer'
import { useStackPractice } from './useStackPractice'
import type { Shape } from '../geometry/types'
import { identity } from '../geometry/transforms'
import { measureOverlap } from '../geometry/overlap'

interface StackPracticeProps {
  referenceShape: Shape
  movableShape: Shape
  /** the pair handed over from stage 1, so the child keeps context */
  pairLabel?: string
  onBack: () => void
}

const CANVAS = 1000
const CANVAS_H = 620

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

  // The visible proof: how much of the two shapes actually coincide.
  const overlap = useMemo(() => measureOverlap(refPoints, movPoints), [refPoints, movPoints])
  const coincident = result.verdict === 'congruent'

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

  return (
    <div className="mode">
      <header className="mode__header">
        <button type="button" className="back-btn" onClick={onBack}>
          ← 돌아가기
        </button>
        <h2 className="mode__title">
          {pairLabel ? `${pairLabel} 포개어 보자` : '포개어 보자'}
        </h2>
        <div className="star-counter" aria-label={`맞힌 개수 ${solvedCount}`}>
          ⭐ {solvedCount}
        </div>
      </header>

      <ResultBanner result={result} justSolved={justSolved} overlap={overlap} />

      <div className="canvas-wrap">
        <svg
          className="canvas"
          viewBox={`0 0 ${CANVAS} ${CANVAS_H}`}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <Grid width={CANVAS} height={CANVAS_H} />

          {/* reference: translucent so the moving shape shows through it */}
          <ShapeSvg
            shape={referenceShape}
            transform={identity(CANVAS * 0.28, CANVAS * 0.3)}
            fillOpacity={0.45}
            stroke="#023047"
          />

          {/* the child controls this one */}
          <ShapeSvg
            shape={movableShape}
            transform={transform}
            fillOpacity={0.45}
            stroke="#023047"
            showVertices
            onPointerDown={onDragStart}
          />

          {/* the shared region, drawn last so it sits on top */}
          <OverlapLayer
            intersection={overlap.intersection}
            coverage={overlap.coverage}
            coincident={coincident}
          />

          {celebrating && (
            <g className="celebrate" pointerEvents="none">
              {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i * Math.PI) / 4
                return (
                  <text
                    key={i}
                    x={CANVAS * 0.5 + Math.cos(angle) * 130}
                    y={CANVAS * 0.3 + Math.sin(angle) * 130}
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

      <ToolBar
        tool={tool}
        onToolChange={setTool}
        onRotateBy={rotateBy}
        onFlip={flip}
        onReset={resetMovable}
      />

      <RotationHint
        moved={transform.cx !== CANVAS * 0.72 || transform.cy !== CANVAS * 0.42}
        rotated={transform.rotation !== 0}
        flipped={transform.flipped}
        coincident={coincident}
      />
    </div>
  )
}

/**
 * Makes "방향이 달라도 합동" explicit.
 *
 * A child who has never rotated anything will assume the shapes must already
 * face the same way. The hint appears only after they have moved the shape,
 * because before that it is noise.
 */
function RotationHint({
  moved,
  rotated,
  flipped,
  coincident,
}: {
  moved: boolean
  rotated: boolean
  flipped: boolean
  coincident: boolean
}) {
  if (!moved || coincident) return null

  if (flipped && !rotated) {
    return (
      <p className="rotate-hint">
        뒤집어서 포개면 <strong>같은 모양</strong>이야. 방향이 달라도 괜찮아!
      </p>
    )
  }
  if (rotated) {
    return (
      <p className="rotate-hint">
        돌려서 포개고 있어! 방향이 달라도 <strong>완전히 겹치면 합동</strong>이야
      </p>
    )
  }
  return (
    <p className="rotate-hint">
      안 맞으면 <strong>돌리거나 뒤집어 보세요</strong> — 방향이 달라도 합동이 됩니다
    </p>
  )
}

function Grid({ width, height }: { width: number; height: number }) {
  const step = 50
  const lines = []
  for (let x = 0; x <= width; x += step) {
    lines.push(
      <line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke="#dbe4ee" strokeWidth={1} />,
    )
  }
  for (let y = 0; y <= height; y += step) {
    lines.push(
      <line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke="#dbe4ee" strokeWidth={1} />,
    )
  }
  return <g>{lines}</g>
}