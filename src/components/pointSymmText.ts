/**
 * Every sentence the center-finding row says, in one place.
 *
 * The mirror image of symmText: the same kinds of sentences — the standing
 * instruction, what a proved center says, what a miss says, the "there is none"
 * answer and its label, the ending — with the line exchanged for the point it
 * turns about. Nothing here quotes a length or an angle, for the same reason
 * the overlap percentage was removed from the congruence stage.
 */

import type { Message } from './tone'

/**
 * The one standing instruction, shown at the bottom of the screen.
 *
 * It names the gesture, not the answer: turn from where the middle is thought
 * to be, never which point. A bare press with no drag is not a turn, so the
 * sentence asks for the drag.
 */
export function pointSymmetryInstructionFor(): string {
  return '대칭의 중심을 손가락으로 돌려 보세요'
}

/** Said the moment a tapped center proves itself in the turn. */
export function pointSymmetryFoundFor(): Message {
  return { tone: 'success', icon: '⭐', text: '점대칭도형이에요! 이 점이 대칭의 중심이에요' }
}

/**
 * Said when the turn lands and nothing coincides.
 *
 * This is the whole lesson of the figure with no center: the mismatch IS the
 * answer, not a failure to find one. It is spoken as a discovery rather than a
 * correction, so the child does not go hunting for a point that is not there.
 */
export function pointSymmetryNoCenterFor(): Message {
  return {
    tone: 'success',
    icon: '🎉',
    text: '이 도형은 어떻게 돌려도 겹치지 않아요. 점대칭도형이 아니에요',
  }
}

/**
 * What to say after a miss.
 *
 * Three misses, three sentences. A tap off the figure entirely is not a wrong
 * answer but a press that never became one — the middle of a bounded shape is
 * inside it — so it gets its own hint rather than the generic one. And claiming
 * "there is none" is judged like any other answer: right on the one figure with
 * no center, wrong everywhere else.
 */
export function pointSymmetryHintFor(kind: 'off' | 'miss' | 'deny'): Message {
  return {
    tone: 'hint',
    icon: '💡',
    text:
      kind === 'off'
        ? '도형 안을 눌러 보세요'
        : kind === 'deny'
          ? '돌리면 겹치는 점이 있어요. 찾아보세요'
          : '아직이네요. 돌렸을 때 완전히 겹치는 중심을 찾아보세요',
  }
}

/**
 * The label of the "there is none" answer.
 *
 * It lives here rather than in the markup so the screen never hardcodes
 * wording — the same rule that keeps every other sentence out of JSX.
 */
export const POINT_DENY_LABEL = '대칭의 중심이 없어요'

/**
 * What the button that leaves a settled board says.
 *
 * The last board does not offer another problem, because there is none: it says
 * so rather than leading a child back into a row they have finished.
 */
export function pointSymmetryNextLabelFor(last: boolean): string {
  return last ? '결과 보기 →' : '다음 문제 보기 →'
}

/**
 * The words for the end of the center row.
 *
 * The row finds symmetric figures by turning them about their middles, so its
 * ending names the figures, not the points: the middle was the way, never the
 * goal. The note is the definition in one sentence.
 */
export function pointSymmetryDonePanelFor(): {
  title: Array<{ text: string; strong?: boolean }>
  note: string
  homeLabel: string
  againLabel: string
} {
  return {
    title: [{ text: '점대칭도형을 ' }, { text: '모두 찾았어!', strong: true }],
    note: '한 점을 중심으로 반 바퀴 돌렸을 때 완전히 겹치는 도형이 점대칭도형이야',
    homeLabel: '첫 화면으로',
    againLabel: '↺ 처음부터',
  }
}
