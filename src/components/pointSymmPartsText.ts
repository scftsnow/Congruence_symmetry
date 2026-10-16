/**
 * Every sentence the boards after the center say, in one place.
 *
 * The mirror image of symmPartsText: the same three questions the congruence
 * unit asks — 대응점, 대응변, 대응각 — then the two facts about the middle,
 * then the drawing they make possible. Everywhere the line unit says axis this
 * one says center, and everywhere it says fold this one says turn; the shapes
 * of the sentences are the same because the lessons are the same, but the
 * words live here with their own unit so neither unit can drift the other's.
 *
 * NO FIGURES
 * ----------
 * Nothing here quotes a length or an angle. The two facts on the facts board are
 * proved by a dot on the segment and a tick on each of two equal spans, and the
 * sentences only name what was seen.
 */

import type { Message } from './tone'
import type { Pass, Phase } from './corrText'

/* The same three questions the congruence unit asks, on one turned shape. The pass
 * machinery is shared; the sentences are not, and every find says which of the
 * three it was, because stars cannot. */

const PARTS_ASK: Record<Pass, string> = {
  points: '빛나는 점의 대응점을 찾아요',
  sides: '빛나는 변의 대응변을 찾아요',
  angles: '빛나는 각의 대응각을 찾아요',
}

const PARTS_FOUND: Record<Pass, string> = {
  points: '대응점을 찾았어!',
  sides: '대응변을 찾았어!',
  angles: '대응각을 찾았어!',
}

/** What was just found, in the unit's own words. */
export function pointPartsFoundFor(phase: Phase): Message | null {
  if (phase === 'compare') return null
  return { tone: 'success', icon: '⭐', text: PARTS_FOUND[phase as Pass] }
}

/** The one standing instruction for the parts board, or nothing during the show. */
export function pointPartsInstructionFor(phase: Phase): string | null {
  if (phase === 'compare') return null
  return PARTS_ASK[phase as Pass]
}

/** While a part is turning, and the moment it lands on its partner. */
const PARTS_MOVING = { side: '대응변을 돌려 보고 있어요', angle: '대응각을 돌려 보고 있어요' }
/* The turn is the way, never the claim: landing proves the same size, in the
 * same sentences the congruence unit says. */
const PARTS_LANDED = { side: '대응변의 길이가 같아요', angle: '대응각의 크기가 같아요' }

/** The one sentence on the parts board, decided from where the child has got to. */
export function pointPartsMessageFor(input: {
  phase: Phase
  wrong: boolean
  done: boolean
  flying: boolean
  flyingAngle: boolean
  landed: boolean
}): Message {
  if (input.done) {
    return {
      tone: 'success',
      icon: '🎉',
      text: '점대칭도형의 마주 보는 점과 변과 각은 똑같아요',
    }
  }
  if (input.landed) {
    return {
      tone: 'success',
      icon: '✅',
      text: input.flyingAngle ? PARTS_LANDED.angle : PARTS_LANDED.side,
    }
  }
  if (input.flying) {
    return {
      tone: 'neutral',
      icon: '👉',
      text: input.flyingAngle ? PARTS_MOVING.angle : PARTS_MOVING.side,
    }
  }
  if (input.wrong && input.phase !== 'compare') {
    return { tone: 'hint', icon: '💡', text: pointPartsHintFor(input.phase as Pass) }
  }
  return { tone: 'neutral', icon: '👉', text: PARTS_ASK[input.phase as Pass] }
}

/* Each hint names what makes the pair a pair rather than which corner to press,
 * because naming the corner would do the exercise for them. */
const PARTS_HINT: Record<Pass, string> = {
  points: '아직이네요. 중심을 사이에 두고 마주 보는 점을 찾아보세요',
  sides: '아직이네요. 중심을 사이에 두고 마주 보는 변을 찾아보세요',
  angles: '아직이네요. 중심을 사이에 두고 마주 보는 각을 찾아보세요',
}

export function pointPartsHintFor(phase: Pass): string {
  return PARTS_HINT[phase]
}

/* The two facts: proved by a dot on the segment and two ticks on the board. */

/** Where the facts board is asking the child to draw: only the joining. */
const FACTS_ASK: Record<string, string> = {
  join: '대응점을 손가락으로 이어 보세요',
}

export function pointFactsInstructionFor(stage: string): string | null {
  return FACTS_ASK[stage] ?? null
}

const FACTS_MISS: Record<string, string> = {
  pair: '아직이네요. 중심을 사이에 두고 마주 보는 점을 이어보세요',
  dup: '이 쌍은 이미 이었어요. 다른 대응점을 이어 보세요',
}

export function pointFactsHintFor(kind: string): Message {
  return { tone: 'hint', icon: '💡', text: FACTS_MISS[kind] }
}

const FACTS_FACT: Record<string, string> = {
  join: '대응점을 잘 이었어요',
  hub: '대응점을 연결한 선분은 대칭의 중심을 지나요',
  equal: '대응점에서 대칭의 중심까지의 거리는 같아요',
}

export function pointFactsSuccessFor(stage: string): Message {
  return { tone: 'success', icon: '⭐', text: FACTS_FACT[stage] }
}

/* Drawing the other half. `waiting` is a key into these tables, never a number
 * in a sentence: the points already placed are the count the child can see. */

const DRAW_ASK: Record<number, string> = {
  3: '대응점을 찾아 누르세요',
  2: '다음 점을 눌러 보세요',
  1: '마지막 점을 눌러 보세요',
}

const DRAW_MISSED = '조금만 아쉬워요. 중심에서 같은 거리, 반대쪽 점을 눌러 보세요'

const DRAW_DONE: Record<number, string> = {
  2: '맞아요! 대칭점은 중심에서 같은 거리에 있어요',
  1: '잘했어요! 다음 점도 찾아 보세요',
  0: '마지막 점도 마주 보는 자리에 왔어요',
}

export function pointDrawInstructionFor(waiting: number): string {
  return waiting > 0 ? DRAW_ASK[waiting] : '어떤 점이 어디에 왔는지 눈으로 확인해 보세요'
}

export function pointDrawMissedFor(): Message {
  return { tone: 'hint', icon: '💡', text: DRAW_MISSED }
}

export function pointDrawSuccessFor(waiting: number): Message {
  return { tone: 'success', icon: '⭐', text: DRAW_DONE[waiting] }
}

export function pointDrawDoneAll(): Message {
  return { tone: 'success', icon: '⭐', text: '점대칭도형을 완성했어요!' }
}

/* The joins. The remaining half is drawn by joining the found points in
 * outline order — the chain they make, tied to the given half's own corners.
 * Nothing is drawn to the middle: it was how the points were found, and the
 * finding is over once they are placed. */
export const POINT_DRAW_LINK_ASK = '남은 절반을 점끼리 이어서 그려 보세요'
export const POINT_DRAW_LINK_MISS = '옆에 있는 두 점을 이어 보세요'
export const POINT_DRAW_LINKED = '잘 연결했어요'

/* How to find a corresponding point, spoken while the first point walks it. */
export const POINT_PARTS_HOW_LEG = '한 점에서 대칭의 중심을 향해 곧게 가요'
export const POINT_PARTS_HOW_CARRY = '그대로 중심을 지나 같은 만큼 더 가면 거기가 대응점이에요'

/* Each row ends its own way, with the sentence the row was for. */

interface DonePanel {
  title: Array<{ text: string; strong?: boolean }>
  note: string
  homeLabel: string
  againLabel: string
}

const HOME_LABEL = '첫 화면으로'
const AGAIN_LABEL = '↺ 처음부터'

export function pointPartsDonePanelFor(): DonePanel {
  return {
    title: [{ text: '대응을 ' }, { text: '모두 찾았어!', strong: true }],
    note: '점대칭도형의 마주 보는 점과 변과 각은 똑같아요',
    homeLabel: HOME_LABEL,
    againLabel: AGAIN_LABEL,
  }
}

/* The lesson both later rows end on, in the textbook's sentence. */
const POINT_FACTS_NOTE =
  '점대칭도형에서 대응점끼리 이은 선분은 대칭의 중심을 지나고, 대응점에서 대칭의 중심까지의 거리는 같아요'

export function pointFactsDonePanelFor(): DonePanel {
  return {
    title: [{ text: '두 가지 성질을 ' }, { text: '찾았어!', strong: true }],
    note: POINT_FACTS_NOTE,
    homeLabel: HOME_LABEL,
    againLabel: AGAIN_LABEL,
  }
}

export function pointDrawDonePanelFor(): DonePanel {
  return {
    title: [{ text: '점대칭도형을 ' }, { text: '완성했어!', strong: true }],
    note: POINT_FACTS_NOTE,
    homeLabel: HOME_LABEL,
    againLabel: AGAIN_LABEL,
  }
}