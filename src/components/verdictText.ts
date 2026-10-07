/**
 * What the system says about the stack.
 *
 * It speaks only about a real stack. A shape that has not been laid over anything
 * gets the neutral prompt and nothing else, because "합동이야" on a shape floating
 * in mid-air is the one answer this stage must never give. On a match it states
 * the fact. On a near miss it names the difference, and for a shape still on its
 * own it stays silent, because naming "turn it" would hand over the answer.
 *
 * This decides the wording, not the maths: it reads a verdict that geometry
 * already reached. That split is why it can live in components/ — a component
 * that worked out for itself whether two shapes are congruent would be the one
 * place in this app where that could go wrong unseen.
 *
 * It is a separate file so the screen describing what the child sees stays short
 * enough to read in one go.
 */

import type { VerdictResult } from '../geometry/verdict'
import { isMatch } from '../geometry/verdict'
import type { BannerTone } from './VerdictBanner'

export interface Banner {
  tone: BannerTone
  icon: string
  parts: Array<{ text: string; strong?: boolean }>
}

export function bannerFor(
  verdict: VerdictResult | null,
  turned: boolean,
  count: number,
  target: number,
): Banner {
  if (count >= target) {
    return {
      tone: 'success',
      icon: '⭐',
      parts: [
        { text: '모두 찾았어! ' },
        { text: '방향이 달라도', strong: true },
        { text: ' 겹치면 합동이야' },
      ],
    }
  }

  if (verdict && isMatch(verdict)) {
    // `turned` outlives the turn itself: landing the shape on its partner
    // changes the verdict to match-direct, and the child should still be told
    // that it had to be turned to get there.
    const didTurn = turned || verdict.verdict !== 'match-direct'
    return {
      tone: 'success',
      icon: '⭐',
      parts: [
        { text: didTurn ? '돌려서 겹쳤어! ' : '겹쳤어! ' },
        { text: '합동이야', strong: true },
      ],
    }
  }

  if (verdict?.verdict === 'same-shape-different-size') {
    return {
      tone: 'hint',
      icon: '🔍',
      parts: [
        { text: '모양은 같지만 ' },
        { text: '크기가 달라', strong: true },
        { text: '서 합동이 아니야' },
      ],
    }
  }

  if (verdict?.verdict === 'different-shape') {
    return {
      tone: 'hint',
      icon: '🔍',
      parts: [
        { text: '이건 ' },
        { text: '모양이 달라', strong: true },
        { text: ' — 합동이 아니야' },
      ],
    }
  }

  return {
    tone: 'neutral',
    icon: '👆',
    parts: [
      { text: '도형을 ' },
      { text: '겹쳐 보세요', strong: true },
      { text: ' — 같은 모양이면 알아서 맞춰집니다 · ' },
      { text: `${count} / ${target}`, strong: true },
    ],
  }
}
