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

import { useEffect, useRef, useState } from 'react'
import type { Message, Popup } from '../components/tone'
import { isPopup, said } from '../components/tone'

/** how long a message stays up. Long enough to read, short enough not to wait. */
export const POPUP_MS = 1800
/*
 * How long a guide stays up. A guide tells what to do next, so it is read
 * while doing — seven seconds, then gone. Guides are the 👉 popups; every
 * other popup answers something that just happened and keeps the short time.
 */
export const GUIDE_MS = 7000

export function useStageMessage(message: Message, attempts: number, ms: number = POPUP_MS): Popup {
  const [live, setLive] = useState<Popup>(null)
  const words = said(message)
  const popup = isPopup(message)
  const guide = popup && message.tone === 'success' && message.icon === '👉'
  const duration = guide ? GUIDE_MS : ms
  /*
   * What re-arms the popup, as a string: every screen builds a fresh message
   * object on every render, so depending on the object itself would reset the
   * timer on every render and the popup would never leave — which is exactly
   * what the opening popup used to do.
   */
  const key = popup ? `${message.tone}|${message.icon}|${words}|${attempts}|${duration}` : 'off'
  const ref = useRef(message)
  ref.current = message

  useEffect(() => {
    if (key === 'off') {
      setLive(null)
      return
    }
    const m = ref.current
    if (!isPopup(m) || !said(m)) {
      setLive(null)
      return
    }
    const next: Popup = { tone: m.tone, icon: m.icon, ...(m.parts ? { parts: m.parts } : { text: said(m) }) }
    setLive(next)
    const timer = window.setTimeout(() => setLive(null), duration)
    return () => window.clearTimeout(timer)
    // `attempts` is the point: it is what makes an identical sentence show again.
  }, [key, duration])

  return live
}