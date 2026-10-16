/**
 * The example walk's clock, shared by both drawing boards.
 *
 * Finding a point is a walk — the given corner, the middle it crosses, its
 * mirror — and the walk is watched, never answered, so its timing lives apart
 * from the answering. Three steps, then placing: corner, middle, mirror.
 */

import { useEffect, useRef, useState } from 'react'

/** how long each step lasts, except the leg being drawn */
const WALK_MS = 3600
/** how long the leg step lasts: drawn, then its mark, looked at */
const LEG_MS = 5600
/** how long the landed point is looked at before the placing starts */
const SHOWN_MS = 3600
/** how long after the leg starts its mark may arrive: once the line is drawn */
const LEG_DRAWN_MS = 1200

export function useDrawWalk() {
  const [walk, setWalk] = useState(0)
  const walking = walk < 3
  /* The mark names what the leg just proved, so it arrives once the leg has
   * finished being drawn — tracked in state, because state is observable. */
  const [legDrawn, setLegDrawn] = useState(false)
  const timer = useRef<number | null>(null)
  const legTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!walking) return
    timer.current = window.setTimeout(
      () => setWalk((w) => w + 1),
      walk === 1 ? LEG_MS : walk === 2 ? SHOWN_MS : WALK_MS,
    )
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [walking, walk])

  useEffect(() => {
    if (walk !== 1) return
    legTimer.current = window.setTimeout(() => setLegDrawn(true), LEG_DRAWN_MS)
    return () => {
      if (legTimer.current) window.clearTimeout(legTimer.current)
    }
  }, [walk])

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
      if (legTimer.current) window.clearTimeout(legTimer.current)
    },
    [],
  )

  return { walk, walking, legDrawn }
}
