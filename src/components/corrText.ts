/**
 * Every sentence the correspondence stage says, in one place.
 *
 * The same rule as verdictText: wording that lives only in the screen cannot be
 * read as wording. Here the teaching is carried almost entirely by what is said
 * rather than by what is drawn, so it matters more than usual.
 *
 * NO FIGURES
 * ----------
 * Nothing here quotes a length or an angle size. The overlap percentage was
 * removed from the congruence stage for the same reason — a number the child
 * cannot produce with their own hands is one they can only be told — and degrees
 * belong to a later unit in fifth grade, so quoting one here would teach the
 * wrong chapter. The claim is made by the part fitting its partner, not by a
 * reading.
 */

import type { BannerTone } from './VerdictBanner'

/** The three passes, in the textbook's order, then the demonstration. */
export type Phase = 'points' | 'sides' | 'angles' | 'compare'
export const PASSES = ['points', 'sides', 'angles'] as const
/** a phase the child is asked about, as opposed to the demonstration */
export type Pass = (typeof PASSES)[number]

const ASK: Record<Pass, string> = {
  points: '왼쪽에서 빛나는 점을 오른쪽에서 찾아 눌러요',
  sides: '왼쪽에서 빛나는 변을 오른쪽에서 찾아 눌러요',
  angles: '왼쪽에서 빛나는 각을 오른쪽에서 찾아 눌러요',
}

/**
 * What to say after a miss.
 *
 * Each hint names the thing to compare rather than the shape to press, because
 * the child did press something — they pressed the wrong one, and telling them
 * which corner is the answer would do the exercise for them.
 */
const HINT: Record<Pass, string> = {
  points: '아직이네요. 빛나는 점과 모양이 꼭 닮은 점을 찾아보세요',
  sides: '아직이네요. 빛나는 변과 길이가 꼭 같은 변을 찾아보세요',
  angles: '아직이네요. 빛나는 각과 크기가 꼭 같은 각을 찾아보세요',
}

/**
 * The two captions under the shapes.
 *
 * They are words rather than drawing, so they live here with the rest of the
 * wording rather than in the markup, so they can be read as sentences.
 */
export const FIRST_SHAPE = '첫 번째 도형'
export const SECOND_SHAPE = '두 번째 도형'

export interface Banner {
  tone: BannerTone
  icon: string
  text: string
}

/** The one sentence on screen, decided from where the child has got to. */
export function bannerFor(input: {
  phase: Phase
  /** true while a miss is being explained */
  wrong: boolean
  /** the demonstration has run to the end */
  done: boolean
  /** a part is on its way across */
  flying: boolean
  /** that part is an angle rather than a side */
  flyingAngle: boolean
}): Banner {
  if (input.done) {
    return {
      tone: 'success',
      icon: '🎉',
      text: '합동인 도형은 대응변의 길이와 대응각의 크기가 같아요',
    }
  }
  if (input.flying) {
    return {
      tone: 'neutral',
      icon: '👉',
      text: input.flyingAngle ? '대응각을 옮겨 보고 있어요' : '대응변을 옮겨 보고 있어요',
    }
  }
  if (input.wrong && input.phase !== 'compare') {
    return { tone: 'hint', icon: '💡', text: HINT[input.phase as Pass] }
  }
  return { tone: 'neutral', icon: '👉', text: ASK[input.phase as Pass] }
}