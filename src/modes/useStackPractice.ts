/**
 * 모드 1. 포개기 연습 — 상태 관리 훅
 *
 * 철학: 정답 버튼이 없다. 아이가 직접 포개는 행위가 학습이다.
 *       앱은 그 결과를 실시간으로 알려줄 뿐, 유도하지 않는다.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Shape, Transform } from '../geometry/types'
import {
  checkCongruence,
  EPSILON_STACK,
  toScreenPoints,
} from '../geometry/compare'
import { identity } from '../geometry/transforms'
import type { CongruenceVerdict } from '../geometry/types'

export type DragMode = 'move' | 'rotate' | 'flip' | 'scale'

export interface WorkbenchState {
  /** 작업대에 놓인 도형들 (id → 도형 + 변환) */
  shapes: Record<string, { shape: Shape; transform: Transform }>
  /** 기준 도형 (왼쪽, 고정) */
  referenceId: string
  /** 움직이는 도형 (오른쪽, 아이가 조작) */
  movableId: string
  /** 현재 선택된 도구 */
  tool: DragMode
  /** 현재 판정 결과 */
  verdict: CongruenceVerdict
  /** 판정 결과가 확정되었는지 (아이에게 표시할지) */
  hasJudged: boolean
  /** 정답 맞춘 횟수 (별 모으기용) */
  solvedCount: number
  /** 방금 정답을 맞힌 순간 (축하 애니메이션 트리거) */
  justSolved: boolean
}

export function useStackPractice(
  reference: Shape,
  movable: Shape,
  canvasWidth: number,
) {
  const [transform, setTransform] = useState<Transform>(() =>
    identity(canvasWidth * 0.72, canvasWidth * 0.42),
  )
  const [tool, setTool] = useState<DragMode>('move')
  const [solvedCount, setSolvedCount] = useState(0)
  const [justSolved, setJustSolved] = useState(false)
  const prevVerdict = useRef<CongruenceVerdict>('different')

  const refPoints = useMemo(
    () => toScreenPoints(reference, identity(canvasWidth * 0.28, canvasWidth * 0.42)),
    [reference, canvasWidth],
  )
  const movPoints = useMemo(
    () => toScreenPoints(movable, transform),
    [movable, transform],
  )

  // 실시간 판정 — 포개기 모드이므로 위치 포함
  const result = useMemo(
    () => checkCongruence(refPoints, movPoints, EPSILON_STACK, canvasWidth, true),
    [refPoints, movPoints, canvasWidth],
  )

  // 정답 맞힌 순간 감지 (축하 애니메이션 + 별 증가)
  //
  // ⚠️ effect로 처리한다. 렌더 중 setState를 부르면
  //    별 개수가 바뀔 때마다 재렌더 → 다시 setState가 걸려 무한 루프가 된다.
  useEffect(() => {
    const wasCongruent = prevVerdict.current === 'congruent'
    const isCongruent = result.verdict === 'congruent'

    if (isCongruent && !wasCongruent) {
      setSolvedCount((c) => c + 1)
      setJustSolved(true)
    } else if (!isCongruent && wasCongruent) {
      setJustSolved(false)
    }

    prevVerdict.current = result.verdict
  }, [result.verdict])

  // ── 드래그 핸들러 ────────────────────────────────────
  const dragStart = useRef<{ x: number; y: number; transform: Transform } | null>(
    null,
  )

  const onDragStart = useCallback(
    (e: React.PointerEvent) => {
      dragStart.current = { x: e.clientX, y: e.clientY, transform: { ...transform } }
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
    },
    [transform],
  )

  const onDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStart.current) return
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      const start = dragStart.current.transform

      switch (tool) {
        case 'move':
          setTransform({
            ...start,
            cx: start.cx + dx,
            cy: start.cy + dy,
          })
          break
        case 'rotate':
          setTransform({
            ...start,
            rotation: start.rotation + dx * 0.5,
          })
          break
        case 'scale':
          // 드래그 거리에 비례해 크기 조절 (최소 0.3, 최대 2.5)
          setTransform({
            ...start,
            scale: Math.max(0.3, Math.min(2.5, start.scale + dx / 200)),
          })
          break
        case 'flip':
          // 뒤집기는 드래그 거리가 일정 이상이면 발동
          if (Math.abs(dx) > 30) {
            setTransform({ ...start, flipped: !start.flipped })
            dragStart.current = {
              x: e.clientX,
              y: e.clientY,
              transform: { ...start, flipped: !start.flipped },
            }
          }
          break
      }
    },
    [tool],
  )

  const onDragEnd = useCallback(() => {
    dragStart.current = null
  }, [])

  // ── 도구 버튼 액션 ───────────────────────────────────
  const rotateBy = useCallback((deg: number) => {
    setTransform((t) => ({ ...t, rotation: t.rotation + deg }))
  }, [])

  const flip = useCallback(() => {
    setTransform((t) => ({ ...t, flipped: !t.flipped }))
  }, [])

  const scaleBy = useCallback((factor: number) => {
    setTransform((t) => ({
      ...t,
      scale: Math.max(0.3, Math.min(2.5, t.scale * factor)),
    }))
  }, [])

  const resetMovable = useCallback(() => {
    setTransform(identity(canvasWidth * 0.72, canvasWidth * 0.42))
  }, [canvasWidth])

  return {
    transform,
    setTransform,
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
    scaleBy,
    resetMovable,
  }
}