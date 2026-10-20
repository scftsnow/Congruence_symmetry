/**
 * Which units this child has finished, kept by the browser itself.
 *
 * A star on the home screen is a promise — it says a unit was worked through —
 * so it cannot live in a component that forgets on reload. There is no account
 * and no server here, so the browser's own storage is the only place that
 * outlives a visit.
 *
 * Written the moment a unit's ending appears, and never taken back: doing a unit
 * again does not lose its star, because the star says "this has been done", not
 * "this is being done right now".
 *
 * Reading is defensive on purpose. A store that is absent, blocked, or
 * hand-edited into nonsense has to leave a child with an empty count and a
 * working first screen — never a broken one, and never a crash before they have
 * touched anything.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

const KEY = 'congruence-symmetry:done'

function readDone(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string')
  } catch {
    return []
  }
}

export interface UnitProgress {
  /** every unit id finished so far, in the order they were finished */
  done: string[]
  isDone: (unit: string) => boolean
  count: number
  markDone: (unit: string) => void
  /** a unit finished this visit and not yet celebrated on the doors */
  fresh: string | null
  /** the doors have shown it: the next arrival is a remembered one */
  settleFresh: () => void
}

export function useUnitProgress(): UnitProgress {
  const [done, setDone] = useState<string[]>(readDone)
  const [fresh, setFresh] = useState<string | null>(null)
  const doneRef = useRef<string[]>(done)

  /*
   * Written from the state rather than from the tap that changed it, so the
   * store and the count on screen can never disagree: one list, one write.
   */
  useEffect(() => {
    doneRef.current = done
    try {
      window.localStorage.setItem(KEY, JSON.stringify(done))
    } catch {
      /* nothing that can be done about it: the star still counts for this visit */
    }
  }, [done])

  const markDone = useCallback((unit: string) => {
    // Only a first finish is an arrival: doing a unit again adds no star, so
    // there is nothing for the doors to celebrate.
    if (!doneRef.current.includes(unit)) setFresh(unit)
    setDone((prev) => (prev.includes(unit) ? prev : [...prev, unit]))
  }, [])

  const settleFresh = useCallback(() => setFresh(null), [])

  return {
    done,
    isDone: (unit: string) => done.includes(unit),
    count: done.length,
    markDone,
    fresh,
    settleFresh,
  }
}

/**
 * Records a unit the moment its ending appears.
 *
 * All ten units finish the same way — the run is over, or the board is cleared —
 * and each says so by putting its ending popup up. The star is written from that
 * moment rather than from the button that closes the popup, so a child who
 * wanders off with the popup still up keeps the star.
 */
export function useMarkComplete(finished: boolean, onComplete?: () => void): void {
  useEffect(() => {
    if (finished) onComplete?.()
  }, [finished, onComplete])
}