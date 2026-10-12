/**
 * Shows one message over the board, for a moment.
 *
 * It exists so a message is not a permanent change of state. Nothing on screen is
 * a standing instruction any more — each unit says what to do at the bottom, where
 * it is read once and then left alone — so everything that crosses the board is
 * something that just happened, and everything has to leave again.
 *
 * ONE RULE, WRITTEN ONCE
 * ----------------------
 * Both units had this: work out whether the message deserves the board, give it
 * the right tone, and retire it after a while. Written in each screen it was the
 * same four decisions in two places, and the correspondence screen had drifted —
 * it sent successes to the popup and left hints in a strip that no longer existed,
 * so a wrong tap there was met with silence.
 *
 * So the rule is here. A screen hands over a message and a count of attempts, and
 * receives either nothing to draw or something to draw.
 *
 * WHY A COUNT, NOT THE WORDS
 * --------------------------
 * Two wrong stacks in a row produce the same sentence, and two successful taps in
 * a row produce the same sentence. Keyed on the words alone the second one would
 * find nothing changed and stay silent — and for a hint that is the one thing it
 * must never do, because the child is still stuck.
 */

import { useEffect, useState } from 'react'
import type { Message, Popup } from '../components/tone'
import { isPopup, said } from '../components/tone'

/** how long a message stays up. Long enough to read, short enough not to wait. */
export const POPUP_MS = 1800

export function useStageMessage(message: Message, attempts: number, ms: number = POPUP_MS): Popup {
  const [live, setLive] = useState<Popup>(null)
  const words = said(message)
  const popup = isPopup(message)

  useEffect(() => {
    if (!popup || !words) {
      setLive(null)
      return
    }
    const next: Popup = { tone: message.tone, icon: message.icon, ...(message.parts ? { parts: message.parts } : { text: words }) }
    setLive(next)
    const timer = window.setTimeout(() => setLive(null), ms)
    return () => window.clearTimeout(timer)
    // `attempts` is the point: it is what makes an identical sentence show again.
  }, [popup, words, attempts, ms, message])

  return live
}