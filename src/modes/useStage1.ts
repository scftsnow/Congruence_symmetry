/**
 * Stage 1 — find the congruent pair among scattered shapes.
 *
 * Follows the textbook order for 초5 2학기 3단원: the search comes right
 * after the definition, before corresponding points.
 *
 * The child drags a line from one shape to another. Correct and incorrect
 * pairs both go to stage 2, because stacking them is what actually proves
 * the answer. A mislabel stays selectable: "different direction" is NOT a
 * reason to rule a pair out, and mislabelling it teaches the opposite of
 * the textbook. When the child picks it, the app says so and moves on.
 */

import { useMemo, useState } from 'react'
import type { CongruenceResult, Point, Shape } from '../geometry/types'
import { applyTransform, identity } from '../geometry/transforms'
import { checkCongruence, EPSILON_STACK, toScreenPoints } from '../geometry/compare'
import { findShape } from '../geometry/shapes'

export type Stage1Kind = 'congruent' | 'different-shape' | 'different-size'

export interface Stage1Shape {
  id: string
  shape: Shape
  /** position on the canvas */
  x: number
  y: number
  rotation: number
  /** why this item is what it is, used for the coach message */
  kind: Stage1Kind
  /** the congruent twin's id, if any */
  pairId?: string
}

export interface Stage1Link {
  from: string
  to: string
}

const CANVAS = 1000
const CANVAS_H = 620

/**
 * A scattered board of shapes containing several congruent pairs plus
 * deliberate distractors.
 *
 * Distractor coverage is the pedagogical point:
 *   - different-shape : the child must not accept "looks similar"
 *   - different-size  : the child must not accept "same shape"
 *   - rotated          : included AS a correct pair, because direction
 *                        does not matter in 초5 2학기
 */
export function buildStage1Board(seed = 0): Stage1Shape[] {
  const pick = (id: string) => findShape(id) as Shape

  // positions are hand-placed so nothing overlaps at a glance
  const items: Stage1Shape[] = [
    { id: 'ga', shape: pick('square'), x: 130, y: 150, rotation: 0, kind: 'congruent', pairId: 'sa' },
    { id: 'na', shape: pick('triangle'), x: 400, y: 130, rotation: 0, kind: 'congruent', pairId: 'ra' },
    { id: 'da', shape: pick('rectangle'), x: 690, y: 150, rotation: 90, kind: 'congruent', pairId: 'ba' },
    { id: 'ra', shape: pick('triangle'), x: 850, y: 380, rotation: 180, kind: 'congruent', pairId: 'na' },
    { id: 'ma', shape: pick('square'), x: 300, y: 420, rotation: 0, kind: 'different-size', pairId: undefined },
    { id: 'ba', shape: pick('rectangle'), x: 560, y: 430, rotation: 90, kind: 'congruent', pairId: 'da' },
    { id: 'sa', shape: pick('square'), x: 730, y: 500, rotation: 0, kind: 'congruent', pairId: 'ga' },
    { id: 'a', shape: pick('pentagon'), x: 180, y: 330, rotation: 0, kind: 'different-shape', pairId: undefined },
  ]

  // a deliberately larger square, sharing the shape but not the size
  const big = { ...pick('square'), vertices: pick('square').vertices.map((v) => ({ x: v.x * 1.55, y: v.y * 1.55 })) }
  items[4] = { ...items[4], shape: big }

  void seed
  return items
}

export function useStage1(seed = 0) {
  const items = useMemo(() => buildStage1Board(seed), [seed])

  /** links the child has drawn, in order */
  const [links, setLinks] = useState<Stage1Link[]>([])
  const [active, setActive] = useState<{ from: string; to: string } | null>(null)
  const [solved, setSolved] = useState<Set<string>>(new Set())
  /** ids the child got wrong, remembered so the coach can mention them */
  const [misread, setMisread] = useState<Set<string>>(new Set())

  /** congruence is decided with position ignored: it is about shape and size */
  const verdicts = useMemo(() => {
    const map = new Map<string, CongruenceResult>()
    for (const a of items) {
      for (const b of items) {
        if (a.id >= b.id) continue
        const pa = toScreenPoints(a.shape, identity(a.x, a.y))
        const pb = toScreenPoints(b.shape, { ...identity(b.x, b.y), rotation: b.rotation })
        map.set(
          a.id + '|' + b.id,
          checkCongruence(pa, pb, EPSILON_STACK, CANVAS, false),
        )
      }
    }
    return map
  }, [items])

  const checkPair = (from: string, to: string): CongruenceResult => {
    const key = from < to ? from + '|' + to : to + '|' + from
    return (
      verdicts.get(key) ?? {
        shapeMatches: false,
        sizeMatches: false,
        isCongruent: false,
        verdict: 'different',
        maxDeviation: Infinity,
      }
    )
  }

  /** every correct pair currently on the board */
  const correctPairs = useMemo(
    () => items.filter((i) => i.kind === 'congruent' && i.pairId).map((i) => i.id + '|' + i.pairId!),
    [items],
  )

  const foundCount = useMemo(() => {
    const found = new Set<string>()
    for (const link of links) {
      if (checkPair(link.from, link.to).isCongruent) {
        found.add(link.from < link.to ? link.from + '|' + link.to : link.to + '|' + link.from)
      }
    }
    return [...found].filter((k) => correctPairs.includes(k)).length
  }, [links, verdicts, correctPairs])

  const addLink = (from: string, to: string) => {
    if (from === to) return
    const key = from < to ? from + '|' + to : to + '|' + from
    if (links.some((l) => (l.from < l.to ? l.from + '|' + l.to : l.to + '|' + l.from) === key)) return

    const result = checkPair(from, to)
    setLinks((prev) => [...prev, { from, to }])

    if (result.isCongruent) {
      setSolved((prev) => new Set(prev).add(key))
    } else if (result.verdict === 'shape-only') {
      // same shape, different size: worth naming explicitly
      setMisread((prev) => new Set(prev).add(key))
    }
  }

  const removeLink = (index: number) => setLinks((prev) => prev.filter((_, i) => i !== index))

  const reset = () => {
    setLinks([])
    setSolved(new Set())
    setMisread(new Set())
    setActive(null)
  }

  return {
    items,
    links,
    active,
    setActive,
    addLink,
    removeLink,
    checkPair,
    foundCount,
    correctCount: correctPairs.length,
    solved,
    misread,
    reset,
    canvas: { width: CANVAS, height: CANVAS_H },
  }
}

/** Screen points for one board item. */
export function stage1Points(item: Stage1Shape): Point[] {
  return applyTransform(item.shape.vertices, {
    ...identity(item.x, item.y),
    rotation: item.rotation,
  })
}