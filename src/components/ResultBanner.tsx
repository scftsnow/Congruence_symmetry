/**
 * Result banner for the stacking screen.
 *
 * The verdict is always stated. The child has already made a claim by
 * choosing this pair in stage 1, so withholding "합동 / 합동 아님" would be
 * unhelpful here. What stays hidden is WHY: the banner points at the next
 * action rather than naming the fix.
 *
 * shape-only ("same shape, different size") cannot occur on this screen
 * because the scale tool was removed from the curriculum order. The branch
 * is kept because the engine still produces the value and the corresponding
 * points stage reuses it.
 */

import type { CongruenceResult } from '../geometry/types'
import type { OverlapInfo } from '../geometry/overlap'

interface ResultBannerProps {
  result: CongruenceResult
  justSolved: boolean
  overlap?: OverlapInfo
}

export function ResultBanner({ result, justSolved, overlap }: ResultBannerProps) {
  const { verdict } = result

  if (verdict === 'congruent') {
    return (
      <div className="banner banner--success" role="status" aria-live="polite">
        <span className="banner__icon" aria-hidden="true">
          ⭐
        </span>
        <span className="banner__text">
          {justSolved ? '완전히 겹쳤어! 합동이야!' : '합동이야!'}
        </span>
      </div>
    )
  }

  if (verdict === 'shape-only') {
    return (
      <div className="banner banner--hint" role="status" aria-live="polite">
        <span className="banner__icon" aria-hidden="true">
          🔍
        </span>
        <span className="banner__text">
          모양은 똑같아! 그런데 <strong>크기가 조금 달라</strong>서 합동이 아니야
        </span>
      </div>
    )
  }

  // The child has moved the shape but it does not coincide.
  // State the verdict, then point at the next move without naming it.
  const pct = overlap ? Math.round(overlap.coverage * 100) : 0

  return (
    <div className="banner banner--neutral" role="status" aria-live="polite">
      <span className="banner__icon" aria-hidden="true">
        👆
      </span>
      <span className="banner__text">
        아직 <strong>합동이 아니야</strong>
        {pct > 0 ? ` — 겹친 부분이 ${pct}%야` : ' — 겹치는 곳이 없어'}
      </span>
    </div>
  )
}