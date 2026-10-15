/**
 * The parts of a line-symmetric figure, and the two facts about them.
 *
 * The load of these checks is that the pairing is never worked out twice. Every
 * pair here comes from correspondence() applied to an outline and its own
 * reflection, so if these disagree with the congruence unit's, the unit is
 * teaching two different answers to one question.
 */

import {
  angleOffRight,
  footOnAxis,
  isSquareToAxis,
  lineCorrespondence,
  mirrorIndex,
  mirrorOf,
  mirrorPairs,
  mirroredOutline,
  nearestVertexIndex,
  rightAnglePath,
  tickPath,
  GRAB_TOLERANCE,
  SPAN_TOLERANCE,
} from '../../src/geometry/symmetryParts'
import { correspondence } from '../../src/geometry/correspondence'
import {
  SYMM_AXIS_BOARDS,
  SYMM_BOARDS,
  SYMM_CENTER,
  SYMM_DRAW_BOARDS,
  SYMM_FACTS_BOARDS,
  SYMM_PARTS_BOARDS,
} from '../../src/geometry/symmetryShapes'
import { foldPoint, foldTransform } from '../../src/geometry/symmetry'
import {
  symmetryDrawDonePanelFor,
  symmetryDrawInstructionFor,
  symmetryDrawMissedFor,
  symmetryDrawSuccessFor,
  symmetryFactsDonePanelFor,
  symmetryFactsHintFor,
  symmetryFactsInstructionFor,
  symmetryFactsSuccessFor,
  symmetryPartsDonePanelFor,
  symmetryPartsFoundFor,
  symmetryPartsInstructionFor,
  symmetryPartsMessageFor,
} from '../../src/components/symmPartsText'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from '../harness/api'

const source = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')

/** the pentagon, on screen, with the axis it really has */
const pentaBoard = SYMM_BOARDS.find((b) => b.kind === 'parts')!
const HEX = pentaBoard.kind === 'parts' ? pentaBoard.shape.vertices : []
const ON_SCREEN = HEX.map((p) => ({ x: p.x + SYMM_CENTER.x, y: p.y + SYMM_CENTER.y }))
const VERTICAL = { a: { x: 550, y: 50 }, b: { x: 550, y: 550 } }

describe('the parts of a folded figure', () => {
  it('pairs a shape with its own reflection, not with a second shape', () => {
    // The whole point of reusing correspondence(): the pairing is the same
    // function the congruence unit uses, so it cannot drift from it.
    const mirrored = mirroredOutline(ON_SCREEN, VERTICAL)
    expect(lineCorrespondence(ON_SCREEN, VERTICAL)).toEqual(correspondence(ON_SCREEN, mirrored))
  })

  it('reflects every corner to a real corner', () => {
    const partners = mirrorIndex(ON_SCREEN, VERTICAL)
    expect(partners.length).toBe(ON_SCREEN.length)
    for (let i = 0; i < partners.length; i++) {
      // the partner of a corner is its mirror image, and mirroring twice is back
      const p = partners[i]
      expect(partners[p]).toBe(i)
      const back = mirrorOf(ON_SCREEN[p], VERTICAL)
      expect(Math.hypot(back.x - ON_SCREEN[i].x, back.y - ON_SCREEN[i].y) < 2 ? 'ok' : 'unpaired').toBe('ok')
    }
  })

  it('leaves the corner on the axis unpaired, like the sides it sits between', () => {
    // A symmetric pentagon always stands one corner on its axis, and a corner
    // whose mirror image is itself has no partner: a pair is two. So the apex
    // is never a 대응점 question, and the flat top edge never a 대응변 one.
    const partners = mirrorIndex(ON_SCREEN, VERTICAL)
    expect(partners.filter((p, i) => p === i)).toEqual([3])
    const pairs = mirrorPairs(ON_SCREEN, VERTICAL)
    expect(pairs.points).toEqual([[0, 1], [2, 4]])
    expect(pairs.sides).toEqual([[1, 4], [2, 3]])
  })

  it('folds a part onto its partner, which no turn can do', () => {
    // A mirror image is not a rotation. The demonstration moves by folding, and
    // this is the check that the fold really lands each side on its partner.
    const corr = lineCorrespondence(ON_SCREEN, VERTICAL)
    for (const side of corr.sides) {
      const landed = foldPoint(side.a[0], VERTICAL, -1)
      expect(near(landed, side.b[0]) ? 'ok' : 'the fold misses its partner').toBe('ok')
    }
    // and the travel is written as that fold, not as a turn
    expect(foldTransform(VERTICAL, -1).includes('scale(1, -1)')).toBeTruthy()
  })
})

describe('the two facts about the axis', () => {
  it('puts the foot of a span on the axis, square to it', () => {
    const foot = footOnAxis({ x: 620, y: 200 }, VERTICAL)
    expect(foot.x).toBe(550)
    expect(foot.y).toBe(200)
    // and the span itself stands square, which is the claim the board draws
    expect(isSquareToAxis({ x: 620, y: 200 }, foot, VERTICAL)).toBe(true)
    expect(angleOffRight({ x: 620, y: 200 }, { x: 620, y: 260 }, VERTICAL) > 60).toBe(true)
  })

  it('reads a segment the other way round as the same segment', () => {
    // Entering the same line from its other end must not read as a mistake, or
    // half the ways of drawing one answer would be refused.
    const a = { x: 620, y: 200 }
    const b = { x: 620, y: 320 }
    expect(angleOffRight(a, b, VERTICAL)).toBe(angleOffRight(b, a, VERTICAL))
  })

  it('spans the two ends of a pair to the same distance', () => {
    const partners = mirrorIndex(ON_SCREEN, VERTICAL)
    const i = 0
    const j = partners[i]
    const here = Math.abs(ON_SCREEN[i].x - VERTICAL.a.x)
    const there = Math.abs(ON_SCREEN[j].x - VERTICAL.a.x)
    expect(Math.abs(here - there) < 0.001 ? 'ok' : 'the ends are not equally far').toBe('ok')
  })

  it('marks the right angle and the equal ticks as shapes, not figures', () => {
    // No figure may appear, so both claims are drawn: a closed square and a single
    // cross-tick. What the child reads off them is the claim itself.
    const foot = footOnAxis(ON_SCREEN[0], VERTICAL)
    const square = rightAnglePath(foot, VERTICAL, ON_SCREEN[0], 18)
    expect(square.startsWith('M')).toBeTruthy()
    expect(square.endsWith('Z')).toBeTruthy()
    // four corners of the square, no more and no fewer
    expect((square.match(/ L /g) || []).length).toBe(3)
    const tick = tickPath(ON_SCREEN[0], foot, 18)
    expect((tick.match(/ L /g) || []).length).toBe(1)
    // and no unit or symbol is ever drawn with them
    expect(/[a-zA-Z°%]/.test((square + tick).replace(/[MLZ\s.,\d-]/g, '')) ? 'quotes a figure' : 'ok').toBe('ok')
  })

  it('reads a press as the corner it was aimed at, and nothing else', () => {
    expect(nearestVertexIndex(ON_SCREEN[2], ON_SCREEN)).toBe(2)
    expect(nearestVertexIndex({ x: 550, y: 550 }, ON_SCREEN) === -1 ? 'ok' : 'found a corner that is not there').toBe('ok')
    expect(GRAB_TOLERANCE > SPAN_TOLERANCE).toBe(true)
  })
})

describe('the four rows on the home screen', () => {
  it('runs the eight boards in the textbook\'s order', () => {
    expect(SYMM_BOARDS.length).toBe(8)
    expect(SYMM_BOARDS.slice(0, 4).every((b) => b.kind === 'axis')).toBe(true)
    expect(SYMM_BOARDS[4].kind).toBe('parts')
    expect(SYMM_BOARDS[5].kind).toBe('facts')
    expect(SYMM_BOARDS[6].kind).toBe('axis')
    // the drawing is last, because it is where the unit's facts are used
    expect(SYMM_BOARDS[7].kind).toBe('draw')
  })

  it('opens one row per question, not one door for all four', () => {
    // Finding symmetric figures, finding what faces what across the axis, the
    // two facts about it, and the drawing are four different questions, and one
    // door for all four never said which was inside.
    expect(SYMM_AXIS_BOARDS.length).toBe(5)
    expect(SYMM_AXIS_BOARDS.every((b) => b.kind === 'axis')).toBe(true)
    expect(SYMM_PARTS_BOARDS.length).toBe(1)
    expect(SYMM_PARTS_BOARDS.every((b) => b.kind === 'parts')).toBe(true)
    expect(SYMM_FACTS_BOARDS.length).toBe(1)
    expect(SYMM_FACTS_BOARDS.every((b) => b.kind === 'facts')).toBe(true)
    expect(SYMM_DRAW_BOARDS.length).toBe(1)
    expect(SYMM_DRAW_BOARDS.every((b) => b.kind === 'draw')).toBe(true)
    const app = source('src/App.tsx')
    for (const screen of [
      'symmetry-axis',
      'symmetry-parts',
      'symmetry-facts',
      'symmetry-draw',
    ]) {
      expect(app.includes(`'${screen}'`)).toBe(true)
    }
    // and the rows say what each one asks
    for (const row of [
      '선대칭도형 찾기',
      '선대칭도형의 대응점·대응변·대응각',
      '선대칭도형의 성질',
      '선대칭도형 그리기',
    ]) {
      expect(app.includes(row)).toBe(true)
    }
  })

  it('gives the parts board a shape with two pairs and one apex', () => {
    const parts = SYMM_BOARDS[4]
    const onScreen =
      parts.kind === 'parts'
        ? parts.shape.vertices.map((p) => ({ x: p.x + SYMM_CENTER.x, y: p.y + SYMM_CENTER.y }))
        : []
    expect(onScreen.length).toBe(5)
    const partners = mirrorIndex(onScreen, parts.kind === 'parts' ? parts.axis : VERTICAL)
    // four corners in two pairs, and the apex on the axis in neither
    expect(partners.filter((p, i) => p !== i).length).toBe(4)
    expect(parts.kind === 'parts' ? parts.note : '').toBe('오각형')
  })

  it('runs one pass for both correspondence boards, not one each', () => {
    // The DRY claim, checked rather than asserted: both hooks call the same one.
    expect(source('src/modes/useCorrespondence.ts').includes('useCorrPass(')).toBeTruthy()
    expect(source('src/modes/useSymmetryParts.ts').includes('useCorrPass(')).toBeTruthy()
    expect(source('src/modes/useCorrPass.ts').includes('HOLD_MS')).toBeTruthy()
    // and the marks and the travelling part are drawn once between them
    expect(source('src/components/CorrespondenceScene.tsx').includes('<CorrMarks')).toBeTruthy()
    expect(source('src/components/SymmetryPartsScene.tsx').includes('<CorrMarks')).toBeTruthy()
    expect(source('src/components/SymmetryPartsScene.tsx').includes('foldTransform')).toBeTruthy()
  })

  it('settles every board kind, or the row never ends', () => {
    // The parts row ended on a "결과 보기" button that led back to itself,
    // because only the axis hook ever told the run its board was done. Every
    // board reports settling now, from an effect rather than the render body.
    for (const hook of [
      'src/modes/useSymmetry.ts',
      'src/modes/useSymmetryParts.ts',
      'src/modes/useSymmetryFacts.ts',
      'src/modes/useSymmetryDraw.ts',
    ]) {
      expect(source(hook).includes('onSettled')).toBeTruthy()
    }
    // and starting over remounts the board, or "처음부터" reopens a board that
    // is already done with its old answers still in it.
    expect(source('src/modes/useSymmetryRun.ts').includes('round')).toBeTruthy()
    for (const shell of [
      'src/modes/SymmetryAxisStage.tsx',
      'src/modes/SymmetryPartsStage.tsx',
      'src/modes/SymmetryFactsStage.tsx',
      'src/modes/SymmetryDrawStage.tsx',
    ]) {
      expect(source(shell).includes('run.round')).toBeTruthy()
    }
  })

  it('asks each pair once, then the apex meeting itself', () => {
    // A pair has two ends, so asking every corner would ask every pair twice.
    // The board asks the lower index of each pair, then the apex whose partner
    // is itself: three point questions of five corners. The sides and angles
    // keep to their pairs.
    const hook = source('src/modes/useSymmetryParts.ts')
    expect(hook.includes('pairs.points.map(([a]) => a)')).toBeTruthy()
    expect(hook.includes('pairs.sides.map(([a]) => a)')).toBeTruthy()
    expect(hook.includes('pairs.points.some')).toBeTruthy()
    const pass = source('src/modes/useCorrPass.ts')
    expect(pass.includes('asked[step]')).toBeTruthy()
    expect(pass.includes('flySides')).toBeTruthy()
    expect(pass.includes('flyAngles')).toBeTruthy()
    // and the scene marks both ends of every pair found so far
    const scene = source('src/components/SymmetryPartsScene.tsx')
    expect(scene.includes('pairOf')).toBeTruthy()
    expect(scene.includes('asked.slice(0, step)')).toBeTruthy()
  })

  it('walks the first point before asking for any', () => {
    // Placing starts from a walk watched rather than a sentence read: the first
    // given corner draws its square leg, carries it across, and marks where it
    // lands — with the method spoken over it — and no press counts until the
    // walk is done.
    const hook = source('src/modes/useSymmetryDraw.ts')
    expect(hook.includes('SYMM_PARTS_HOW')).toBeTruthy()
    expect(hook.includes('walk < 3')).toBeTruthy()
    expect(hook.includes('footOnAxis(givens[0]')).toBeTruthy()
    const scene = source('src/components/SymmetryDrawScene.tsx')
    expect(scene.includes('sym-carry')).toBeTruthy()
    expect(scene.includes('walking')).toBeTruthy()
    expect(source('src/components/symmPartsText.ts').includes('수직으로 가다가')).toBeTruthy()
  })

  it('names the pass just answered, not the one just entered', () => {
    // The last answer of a pass flipped the phase before its popup arrived, so
    // the second of two point-finds celebrated "대응변". The pass the tap
    // belonged to is remembered instead, and only it is ever said.
    const pass = source('src/modes/useCorrPass.ts')
    expect(pass.includes('setFoundPhase(phase)')).toBeTruthy()
    expect(pass.includes('texts.found(foundPhase)')).toBeTruthy()
  })

  it('asks each pass with a popup first', () => {
    // A line at the bottom is read once and then left alone, so the first
    // question of a pass crosses the board as a popup too — and only the first,
    // because every later step already knows what it is doing.
    const hook = source('src/modes/useSymmetryParts.ts')
    expect(hook.includes('pass.step === 0')).toBeTruthy()
    expect(hook.includes("icon: '👉'")).toBeTruthy()
  })

  it('says which of the three was found, and counts none of them', () => {
    expect(symmetryPartsFoundFor('points')!.text).toBe('대응점을 찾았어!')
    expect(symmetryPartsFoundFor('sides')!.text).toBe('대응변을 찾았어!')
    expect(symmetryPartsFoundFor('angles')!.text).toBe('대응각을 찾았어!')
    expect(symmetryPartsFoundFor('compare')).toBe(null)
    // the ask names the part and nothing else: no axis, no gesture, no count
    expect(symmetryPartsInstructionFor('points')).toBe('빛나는 점의 대응점을 찾아요')
    expect(symmetryPartsInstructionFor('sides')).toBe('빛나는 변의 대응변을 찾아요')
    expect(symmetryPartsInstructionFor('angles')).toBe('빛나는 각의 대응각을 찾아요')
    // landing proves the size, never the fold: the fold is the way the part
    // travelled, and "it fits" is what eyes already see. The claim is the same
    // sentences the congruence unit says.
    for (const flyingAngle of [false, true]) {
      const said = symmetryPartsMessageFor({
        phase: 'compare',
        wrong: false,
        done: false,
        flying: true,
        flyingAngle,
        landed: true,
      }).text
      expect(said).toContain(flyingAngle ? '대응각의 크기가 같아요' : '대응변의 길이가 같아요')
    }
    // every sentence this board can say names no figure
    for (const phase of ['points', 'sides', 'angles'] as const) {
      expect(/[0-9]/.test(symmetryPartsMessageFor({
        phase,
        wrong: true,
        done: false,
        flying: false,
        flyingAngle: false,
        landed: false,
      }).text) ? 'counts in the hint' : 'ok').toBe('ok')
    }
  })

  it('shows both facts after the join, in the textbook\'s order', () => {
    // For each of the three pairs in turn, the child joins it, and then the
    // board shows what that joining proves: first the square where the segment
    // meets the axis, then the span folding across onto its partner. Equal
    // length is shown by moving, not by marking: one span lifts off and lands
    // exactly on the other, because one becoming the other is what "the same
    // distance" means. Joined pairs stay on screen, so the rounds add up where
    // the child can see them — and the ask crosses the board as a popup every
    // round, because after two rounds of watching the bottom line is the last
    // place the child is looking.
    const hook = source('src/modes/useSymmetryFacts.ts')
    expect(hook.includes("'join' | 'square' | 'equal'")).toBeTruthy()
    expect(hook.includes('joinedList')).toBeTruthy()
    expect(hook.includes('current')).toBeTruthy()
    expect(hook.includes('waitingOn') ? 'the child spans again' : 'ok').toBe('ok')
    const scene = source('src/components/SymmetryFactsScene.tsx')
    expect(scene.includes('sym-right')).toBeTruthy()
    expect(scene.includes('<CorrFly')).toBeTruthy()
    expect(scene.includes('foldTransform')).toBeTruthy()
    expect(scene.includes('sym-tick')).toBeTruthy()
    expect(scene.includes('sym-in')).toBeTruthy()
    expect(symmetryFactsInstructionFor('join')).toContain('대응점을 손가락으로')
    expect(symmetryFactsInstructionFor('square')).toBe(null)
    expect(symmetryFactsHintFor('pair').text).toContain('마주 보는 점')
    expect(symmetryFactsHintFor('dup').text).toContain('이미 이었어요')
    expect(symmetryFactsSuccessFor('square').text).toContain('수직으로 만나요')
    expect(symmetryFactsSuccessFor('equal').text).toContain('거리는 같아요')
  })

  it('snaps a placed point exactly onto the mirror image', () => {
    // The drawing that results is the true one, because the true one is the
    // answer; what is the child's is knowing where it goes.
    const draw = SYMM_BOARDS[7]
    const board = draw.kind === 'draw' ? draw : null
    const axis = board ? board.axis : VERTICAL
    const half = board ? board.half : []
    const screen =
      board && board.shape
        ? board.place.map((i) => ({
            x: board.shape.vertices[i].x + SYMM_CENTER.x,
            y: board.shape.vertices[i].y + SYMM_CENTER.y,
          }))
        : []
    expect(screen.length).toBe(3)
    for (const p of screen) {
      const image = mirrorOf(p, axis)
      expect(image.x < axis.a.x ? 'ok' : 'the answer was already on the board').toBe('ok')
      // and the given half is entirely on the other side of the axis from it
      expect(
        half.every((h) => h.x + SYMM_CENTER.x >= axis.a.x) ? 'ok' : 'the half crosses the axis',
      ).toBe('ok')
    }
  })

  it('asks for the next point without saying how many are left', () => {
    expect(symmetryDrawInstructionFor(3)).toContain('마주 보는 점')
    expect(symmetryDrawInstructionFor(1)).toContain('마지막 점')
    expect(symmetryDrawInstructionFor(0)).not.toContain('0')
    expect(symmetryDrawMissedFor().text).toContain('같은 거리')
    expect(symmetryDrawSuccessFor(2).text).toContain('같은 거리')
    for (const n of [0, 1, 2, 3]) {
      expect(/[0-9]/.test(symmetryDrawInstructionFor(n)) ? 'counts what is left' : 'ok').toBe('ok')
      expect(/[0-9]/.test(symmetryDrawSuccessFor(n).text) ? 'counts what is left' : 'ok').toBe('ok')
    }
  })

  it('draws the whole figure only once there is nothing left to copy', () => {
    // Before the last point it is the answer painted under the question, so the
    // whole outline and the completion both hang off `resolved`.
    const scene = source('src/components/SymmetryDrawScene.tsx')
    expect(/\{resolved && \(/.test(scene) ? 'ok' : 'the whole figure is shown early').toBe('ok')
    expect(scene.includes('sym-shape--whole')).toBeTruthy()
    // and the axis is given rather than asked for on this board
    expect(scene.includes('sym-axis--given')).toBeTruthy()
    // a tap is one press: answering the release as well would place two points
    // for one finger, the second landing near enough to count as the next.
    expect(scene.includes('onPointerUp')).toBeFalsy()
  })

  it('ends every row with the sentence the row was for', () => {
    // Four doors, four endings. Each names what its row taught and counts nothing —
    // and the two facts rows end on the textbook's sentence, in this app's voice.
    expect(symmetryPartsDonePanelFor().note).toContain('마주 보는 점과 변과 각')
    expect(symmetryFactsDonePanelFor().title.map((p) => p.text).join('')).toBe('두 가지 성질을 찾았어!')
    expect(symmetryFactsDonePanelFor().note).toContain('대응점끼리 이은 선분은 대칭축과 수직으로 만나고')
    expect(symmetryFactsDonePanelFor().note).toContain('대응점에서 대칭축까지의 거리는 같아요')
    expect(symmetryDrawDonePanelFor().title.map((p) => p.text).join('')).toBe('선대칭도형을 완성했어!')
    expect(symmetryDrawDonePanelFor().note).toBe(symmetryFactsDonePanelFor().note)
    for (const done of [
      symmetryPartsDonePanelFor(),
      symmetryFactsDonePanelFor(),
      symmetryDrawDonePanelFor(),
    ]) {
      expect(/[0-9]/.test(done.note) ? 'counts in the lesson' : 'ok').toBe('ok')
      expect(done.homeLabel).toBe('첫 화면으로')
    }
  })
})

function near(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < 0.5
}

const { report } = await import('../harness/spec.mjs')
report()