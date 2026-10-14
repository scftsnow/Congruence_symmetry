/**
 * Every sentence the symmetry stage says, in one place.
 *
 * The same rule as corrText and verdictText: wording that lives only in the
 * screen cannot be read as wording. Here the teaching is carried almost entirely
 * by what is said rather than by what is drawn, so it matters more than usual.
 *
 * NO FIGURES
 * ----------
 * Nothing here quotes a length, an angle size, or a count of degrees. The overlap
 * percentage was removed from the congruence stage for the same reason — a number
 * the child cannot produce with their own hands is one they can only be told —
 * and degrees belong to a later unit in fifth grade, so quoting one here would
 * teach the wrong chapter. The claim is made by the fold landing, not by a
 * reading. Even the axis count stays out of the sentences: "find all four" would
 * turn each shape into a counting task, and one axis is enough to prove the kind.
 */

import type { Message } from './tone'

/**
 * The one standing instruction, shown at the bottom of the screen.
 *
 * It names the gesture, not the answer: where to draw, never which line. Saying
 * "draw the vertical line" would do the exercise for the triangle, and saying it
 * for the square would be wrong four times over.
 */
export function symmetryInstructionFor(): string {
  return '도형 위에 접을 선을 손가락으로 그어 보세요'
}

/** Said the moment a drawn axis proves itself in the fold. */
export function symmetryFoundFor(): Message {
  return { tone: 'success', icon: '⭐', text: '선대칭도형이에요! 이 선이 대칭축이에요' }
}

/**
 * Said when a find was right but the shape is not finished.
 *
 * A square settles only when every axis is found, so the child has to be told
 * there is more to do — otherwise the right line reads as the end of it and the
 * shape never moves on. The sentence asks rather than counts: how many are
 * left is shown by the teal lines already on the board, never spoken.
 */
export function symmetryMoreFor(): Message {
  return { tone: 'success', icon: '⭐', text: '좋아요! 다른 대칭축도 있는지 찾아보세요' }
}

/**
 * Said when the fold lands and nothing coincides.
 *
 * This is the whole lesson of the last shape: the mismatch IS the answer, not a
 * failure to find one. It is spoken as a discovery rather than a correction, so
 * the child does not go hunting for a line that is not there.
 */
export function symmetryNoAxisFor(): Message {
  return {
    tone: 'success',
    icon: '🎉',
    text: '이 도형은 어떻게 접어도 겹치지 않아요. 선대칭도형이 아니에요',
  }
}

/**
 * What to say after a miss.
 *
 * Four misses, four sentences. A line that misses the shape entirely is
 * not a wrong answer but a gesture that never became one — the axis of a
 * bounded shape always meets it — so it gets its own hint rather than the
 * generic one. A line that repeats an axis already found is not wrong
 * either, only done: it says so and asks for another, without counting
 * anything, because the count of axes stays out of the sentences. And
 * claiming "there is none" is judged like any other answer: right on the
 * one shape with no axis, wrong everywhere else.
 */
export function symmetryHintFor(kind: 'off' | 'miss' | 'dup' | 'deny'): Message {
  return {
    tone: 'hint',
    icon: '💡',
    text:
      kind === 'off'
        ? '선을 도형 위에 그어 보세요'
        : kind === 'dup'
          ? '이 축은 이미 찾았어요. 다른 선을 그어 보세요'
          : kind === 'deny'
            ? '접으면 겹치는 선이 있어요. 찾아보세요'
            : '아직이네요. 접었을 때 완전히 겹치는 선을 찾아보세요',
  }
}

/**
 * The label of the "there is none" answer.
 *
 * It lives here rather than in the markup so the screen never hardcodes
 * wording — the same rule that keeps every other sentence out of JSX.
 */
export const SYMM_DENY_LABEL = '대칭축이 없어요'

/**
 * The words for the end of the unit.
 *
 * The note is the definition in one sentence, and it names the two halves the
 * unit taught: that some shapes have such a line, and that some do not.
 */
export function symmetryDonePanelFor(): {
  title: Array<{ text: string; strong?: boolean }>
  note: string
  homeLabel: string
  againLabel: string
} {
  return {
    title: [{ text: '선대칭도형을 ' }, { text: '모두 찾았어!', strong: true }],
    note: '하나의 직선을 따라 접었을 때 완전히 겹치는 도형이 선대칭도형이야',
    homeLabel: '첫 화면으로',
    againLabel: '↺ 처음부터',
  }
}
