/**
 * Every sentence the boards after the axis say, in one place.
 *
 * Split from symmText because the unit outgrew one file: the axis board is about
 * finding a line, and everything here is about what a line already found lets
 * you say. Nothing here quotes a length or an angle — the two facts are proved
 * by a drawn square and two ticks, and the sentences only name what was seen.
 */

import type { Message } from './tone'
import type { Pass, Phase } from './corrText'

/* The same three questions the congruence unit asks, on one folded shape. The pass
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
export function symmetryPartsFoundFor(phase: Phase): Message | null {
  if (phase === 'compare') return null
  return { tone: 'success', icon: '⭐', text: PARTS_FOUND[phase as Pass] }
}

/** The one standing instruction for the parts board, or nothing during the show. */
export function symmetryPartsInstructionFor(phase: Phase): string | null {
  if (phase === 'compare') return null
  return PARTS_ASK[phase as Pass]
}

/** While a part is folding, and the moment it lands on its partner. */
const PARTS_MOVING = { side: '대응변을 접어 보고 있어요', angle: '대응각을 접어 보고 있어요' }
/*
 * The fold is the way, never the claim: what landing proves is that the two are
 * the same size. The same sentences the congruence unit says, because it is the
 * same fact about the same pair.
 */
const PARTS_LANDED = { side: '대응변의 길이가 같아요', angle: '대응각의 크기가 같아요' }

/** The one sentence on the parts board, decided from where the child has got to. */
export function symmetryPartsMessageFor(input: {
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
      text: '선대칭도형의 마주 보는 점과 변과 각은 꼭 같아요',
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
    return { tone: 'hint', icon: '💡', text: symmetryPartsHintFor(input.phase as Pass) }
  }
  return { tone: 'neutral', icon: '👉', text: PARTS_ASK[input.phase as Pass] }
}

/**
 * What to say after a miss on the parts board.
 *
 * Each hint names what makes the pair a pair — facing it across the axis — rather
 * than which corner to press, because the child did press something and naming
 * the corner would do the exercise for them.
 */
const PARTS_HINT: Record<Pass, string> = {
  points: '아직이네요. 축을 사이에 두고 마주 보는 점을 찾아보세요',
  sides: '아직이네요. 축을 사이에 두고 마주 보는 변을 찾아보세요',
  angles: '아직이네요. 축을 사이에 두고 마주 보는 각을 찾아보세요',
}

export function symmetryPartsHintFor(phase: Pass): string {
  return PARTS_HINT[phase]
}

/* ── the two facts about the axis ────────────────────────
 *
 * Both are proved by something on the board rather than announced: a square at
 * the crossing, and a tick on each of two equal spans.
 */

/** Where the facts board is asking the child to draw: only the joining. */
const FACTS_ASK: Record<string, string> = {
  join: '대응점을 손가락으로 이어 보세요',
}

export function symmetryFactsInstructionFor(stage: string): string | null {
  return FACTS_ASK[stage] ?? null
}

const FACTS_MISS: Record<string, string> = {
  pair: '아직이네요. 축을 사이에 두고 마주 보는 점을 이어보세요',
}

export function symmetryFactsHintFor(kind: string): Message {
  return { tone: 'hint', icon: '💡', text: FACTS_MISS[kind] }
}

const FACTS_FACT: Record<string, string> = {
  join: '대응점을 잘 이었어요',
  square: '대응점을 연결한 선분은 대칭축과 수직으로 만나요',
  equal: '대응점에서 대칭축까지의 거리는 같아요',
}

export function symmetryFactsSuccessFor(stage: string): Message {
  return { tone: 'success', icon: '⭐', text: FACTS_FACT[stage] }
}

/* ── drawing the other half ──────────────────────────────
 *
 * `waiting` is how many points are still to find. It is a key into these tables,
 * never a number in a sentence: the points already placed are the count the
 * child can see, and the instruction names the next thing to do rather than how
 * many are left.
 */

const DRAW_ASK: Record<number, string> = {
  3: '축을 사이에 두고 마주 보는 점을 손가락으로 눌러 보세요',
  2: '다음 점을 눌러 보세요',
  1: '마지막 점을 눌러 보세요',
}

const DRAW_MISSED = '조금만 아쉬워요. 축에서 같은 거리, 반대쪽 점을 눌러 보세요'

const DRAW_DONE: Record<number, string> = {
  2: '맞아요! 대칭점은 축에서 같은 거리에 있어요',
  1: '마지막 점도 마주 보는 자리에 왔어요',
  0: '선대칭도형을 완성했어요!',
}

export function symmetryDrawInstructionFor(waiting: number): string {
  return waiting > 0 ? DRAW_ASK[waiting] : '어떤 점이 어디에 왔는지 눈으로 확인해 보세요'
}

export function symmetryDrawMissedFor(): Message {
  return { tone: 'hint', icon: '💡', text: DRAW_MISSED }
}

export function symmetryDrawSuccessFor(waiting: number): Message {
  return { tone: 'success', icon: '⭐', text: DRAW_DONE[waiting] }
}

/* ── the ends of the rows after the first ────────────────
 *
 * Each row ends its own way, with the sentence the row was for. The parts row
 * ends on what facing pairs share; the facts row ends on the two facts together,
 * because together they are the one piece of reasoning the row proved; and the
 * drawing row ends on the finished figure, which is what the facts were for.
 */

interface DonePanel {
  title: Array<{ text: string; strong?: boolean }>
  note: string
  homeLabel: string
  againLabel: string
}

const HOME_LABEL = '첫 화면으로'
const AGAIN_LABEL = '↺ 처음부터'

export function symmetryPartsDonePanelFor(): DonePanel {
  return {
    title: [{ text: '대응을 ' }, { text: '모두 찾았어!', strong: true }],
    note: '선대칭도형의 마주 보는 점과 변과 각은 꼭 같아요',
    homeLabel: HOME_LABEL,
    againLabel: AGAIN_LABEL,
  }
}

export function symmetryFactsDonePanelFor(): DonePanel {
  return {
    title: [{ text: '두 가지 성질을 ' }, { text: '찾았어!', strong: true }],
    note: '마주 보는 점을 잇는 선분은 대칭축과 수직이고, 대칭점과 대칭축 사이의 거리는 같아요',
    homeLabel: HOME_LABEL,
    againLabel: AGAIN_LABEL,
  }
}

export function symmetryDrawDonePanelFor(): DonePanel {
  return {
    title: [{ text: '선대칭도형을 ' }, { text: '완성했어!', strong: true }],
    note: '마주 보는 점을 잇는 선분은 대칭축과 수직이고, 대칭점과 대칭축 사이의 거리는 같아요',
    homeLabel: HOME_LABEL,
    againLabel: AGAIN_LABEL,
  }
}