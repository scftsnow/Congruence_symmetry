/**
 * Stage 2 — stack the chosen pair by hand.
 *
 * The child drags one shape onto the other. Stacking is the proof that a
 * pair is congruent, which is why stage 1 hands every pair over to this
 * screen instead of scoring it there.
 *
 * Tools are move, rotate and flip. Scale is deliberately absent: the
 * curriculum places "same shape, different size" later, so this screen
 * never produces that situation.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Shape, Transform } from '../geometry/types'
import { checkCongruence, EPSILON_STACK, toScreenPoints } from '../geometry/compare'
import { identity } from '../geometry/transforms'
import type { CongruenceVerdict } from '../geometry/types'

export type DragMode = 'move' | 'rotate' | 'flip'

const CANVAS = 1000

export interface Stage2State {
  transform: Transform
  tool: DragMode
  result: ReturnType<typeof checkCongruence>
  solvedCount: number
  justSolved: boolean
}

export function useStackPractice(
  reference: Shape,
  movable: Shape,
  canvasWidth: number = CANVAS,
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

  // Stacking is about overlap, so position is part of the judgement here.
  const result = useMemo(
    () => checkCongruence(refPoints, movPoints, EPSILON_STACK, canvasWidth, true),
    [refPoints, movPoints, canvasWidth],
  )

  // Derived state must change in an effect, not in the render body.
  // Setting it during render cascades: change -> rerender -> change.
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

  const dragStart = useRef<{ x: number; y: number; transform: Transform } | null>(null)

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
      const start = dragStart.current.transform

      switch (tool) {
        case 'move':
          setTransform({ ...start, cx: start.cx + dx, cy: start.cy + dragStart.current.y * 0 })
          break
        case 'rotate':
          setTransform({ ...start, rotation: start.rotation + dx * 0.5 })
          break
        case 'flip':
          if (Math.abs(dx) > 30) {
            const next = { ...start, flipped: !start.flipped }
            setTransform(next)
            dragStart.current = { x: e.clientX, y: e.clientY, transform: next }
          }
          break
      }
    },
    [tool],
  )

  const onDragEnd = useCallback(() => {
    dragStart.current = null
  }, [])

  const rotateBy = useCallback((deg: number) => {
    setTransform((t) => ({ ...t, rotation: t.rotation + deg }))
  }, [])

  const flip = useCallback(() => {
    setTransform((t) => ({ ...t, flipped: !t.flipped }))
  }, [])

  const resetMovable = useCallback(() => {
    setTransform(identity(canvasWidth * 0.72, canvasWidth * 0.42))
  }, [canvasWidth])

  return {
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
  }
}