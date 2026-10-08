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

import type { BannerTone } from './tone'

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

/**
 * The words for the end of the unit.
 *
 * This used to be the same panel as the end of a pair, with the last pair
 * looping round to the first one — which left the unit with no ending at all. It
 * is now its own sentence, and the note names what the whole unit was for.
 */
export function donePanelFor(): {
  title: Array<{ text: string; strong?: boolean }>
  note: string
  homeLabel: string
  againLabel: string
} {
  return {
    title: [{ text: '대응점을 ' }, { text: '모두 찾았어!', strong: true }],
    note: '합동인 두 도형은 마주 보는 점과 변과 각이 같아져',
    homeLabel: '첫 화면으로',
    againLabel: '↺ 처음부터',
  }
}

/**
 * The one standing instruction, shown at the bottom of the screen.
 *
 * This is the only thing that was ever in the strip along the top, and it now
 * sits under the board instead: above the shapes is a place the child is not
 * looking at, and the congruence board already keeps its instruction in its
 * bottom toolbar, so both units say it from the same place.
 */
export function instructionFor(phase: Phase): string {
  return ASK[phase as Pass]
}

/**
 * Not a Banner, because nothing is drawn in a strip any more.
 *
 * The screen decides where words go — a success and a miss arrive over the board,
 * the standing instruction sits at the bottom — and this file only decides what
 * is said.
 */
export interface Message {
  tone: BannerTone
  icon: string
  text: string
}

/**
 * What is said while a part is travelling, and the moment it lands.
 *
 * The animation was there before the sentence was. A side lifted off one shape,
 * crossed and fitted the other, and the child was left to work out what they had
 * just been shown — which is watching, not learning.
 *
 * So the claim arrives with the fit: while it travels the banner says what is
 * being shown, and the moment it lands it says the fact and stays up long enough
 * to be read.
 *
 * The wording is the unit's own vocabulary rather than a description of the
 * picture. "이 두 변의 길이는 같아요" is true of the two lines on screen and
 * teaches nothing; "대응변의 길이가 같아요" is the sentence the child is meant to
 * be able to say afterwards, and it is the sentence the textbook uses.
 */
const MOVING = { side: '대응변을 옮겨 보고 있어요', angle: '대응각을 옮겨 보고 있어요' }
const LANDED = { side: '대응변의 길이가 같아요', angle: '대응각의 크기가 같아요' }

/** The one sentence on screen, decided from where the child has got to. */
export function messageFor(input: {
  phase: Phase
  /** true while a miss is being explained */
  wrong: boolean
  /** the demonstration has run to the end */
  done: boolean
  /** a part is on its way across */
  flying: boolean
  /** that part is an angle rather than a side */
  flyingAngle: boolean
  /** and it has just arrived */
  landed: boolean
}): Message {
  if (input.done) {
    return {
      tone: 'success',
      icon: '🎉',
      text: '합동인 도형은 대응변의 길이와 대응각의 크기가 같아요',
    }
  }
  if (input.landed) {
    return {
      tone: 'success',
      icon: '✅',
      text: input.flyingAngle ? LANDED.angle : LANDED.side,
    }
  }
  if (input.flying) {
    return { tone: 'neutral', icon: '👉', text: input.flyingAngle ? MOVING.angle : MOVING.side }
  }
  if (input.wrong && input.phase !== 'compare') {
    return { tone: 'hint', icon: '💡', text: HINT[input.phase as Pass] }
  }
  return { tone: 'neutral', icon: '👉', text: ASK[input.phase as Pass] }
}