/**
 * The example walk's clock, shared by both drawing boards.
 *
 * Finding a point is a walk — the given corner, the middle it crosses, its
 * mirror — and the walk is watched, never answered, so its timing lives apart
 * from the answering. Three steps, then placing: corner, middle, mirror.
 *
 * Each moving step gets the same beat: the line is drawn, its mark arrives, and
 * then a pause long enough to see what stands there before the next sentence
 * replaces the last. The carry is never spoken while the leg is still being
 * drawn, and the mirror is never marked before the carried leg lands on it.
 */

import { useEffect, useRef, useState } from 'react'

/** the corner step: lit, then looked at before the leg starts */
const WALK_MS = 3600
/** the leg step: drawn, its square, then a look at both before the carry */
const LEG_MS = 3000
/** how long after the leg starts its square arrives: once the line is drawn */
const LEG_DRAWN_MS = 1200
/** how long the carry travels, matched by .sym-carry in symmetry.css */
const CARRY_MS = 1200
/** how long the landed mirror is looked at before the placing starts */
const LANDED_MS = 1800
/** the carry step: the travel, the mark it earns, then a look at the marked point */
const SHOWN_MS = CARRY_MS + LANDED_MS

export function useDrawWalk() {
  const [walk, setWalk] = useState(0)
  const walking = walk < 3
  /* The square names what the leg just proved, so it arrives once the leg has
   * finished being drawn — tracked in state, because state is observable. */
  const [legDrawn, setLegDrawn] = useState(false)
  /* The mirror is where the carried leg lands, so its mark waits for the
   * carry to arrive: a point cannot appear before the line that finds it. */
  const [landed, setLanded] = useState(false)
  const timer = useRef<number | null>(null)
  const legTimer = useRef<number | null>(null)
  const carryTimer = useRef<number | null>(null)

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

  useEffect(() => {
    if (walk !== 2) return
    carryTimer.current = window.setTimeout(() => setLanded(true), CARRY_MS)
    return () => {
      if (carryTimer.current) window.clearTimeout(carryTimer.current)
    }
  }, [walk])

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
      if (legTimer.current) window.clearTimeout(legTimer.current)
      if (carryTimer.current) window.clearTimeout(carryTimer.current)
    },
    [],
  )

  return { walk, walking, legDrawn, landed }
}
