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
import { foldPoint, foldTransform, SNAP_PITCH } from '../../src/geometry/symmetry'
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

  it('names the part that is actually folding, sides first and angles after', () => {
    /*
     * The demonstration folds the asked sides, then the asked angles — two and
     * two on this board, not five and five. The sentence used to change sides
     * at the corner count instead, so every folding angle was announced as a
     * 대응변: the words and the picture said different things. The message and
     * the scene now change sides at the same step, the length of the asked
     * sides, which is the only boundary the demonstration itself knows.
     */
    const hook = source('src/modes/useSymmetryParts.ts')
    expect((hook.match(/pass\.flyStep >= pass\.flySides\.length/g) || []).length).toBe(2)
    expect(hook.includes('flyStep >= corners')).toBeFalsy()
    const scene = source('src/components/SymmetryPartsScene.tsx')
    expect(scene.includes('flyStep < flySides.length')).toBeTruthy()
    // and the words themselves keep side and angle apart
    const folding = (flyingAngle: boolean) =>
      symmetryPartsMessageFor({
        phase: 'compare',
        wrong: false,
        done: false,
        flying: true,
        flyingAngle,
        landed: false,
      }).text ?? ''
    expect(folding(false).includes('대응변')).toBeTruthy()
    expect(folding(false).includes('대응각')).toBeFalsy()
    expect(folding(true).includes('대응각')).toBeTruthy()
    expect(folding(true).includes('대응변')).toBeFalsy()
  })
})

describe('the two facts about the axis', () => {
  it('puts the foot of a perpendicular on the axis, square to it', () => {
    const foot = footOnAxis({ x: 620, y: 200 }, VERTICAL)
    expect(foot.x).toBe(550)
    expect(foot.y).toBe(200)
    // and a segment from the point to its foot reads as square, which is the
    // claim the walk draws and the facts board names
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
  })
})

describe('the four rows on the home screen', () => {
  it('runs the ten boards in the textbook\'s order', () => {
    expect(SYMM_BOARDS.length).toBe(10)
    expect(SYMM_BOARDS.slice(0, 4).every((b) => b.kind === 'axis')).toBe(true)
    expect(SYMM_BOARDS[4].kind).toBe('parts')
    expect(SYMM_BOARDS[5].kind).toBe('facts')
    expect(SYMM_BOARDS[6].kind).toBe('axis')
    // three drawings close the unit, because completing them uses both facts
    expect(SYMM_BOARDS.slice(7).map((b) => b.kind)).toEqual(['draw', 'draw', 'draw'])
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
    expect(SYMM_DRAW_BOARDS.length).toBe(3)
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

  it('asks each pair once, and the axis never', () => {
    // A pair has two ends, so asking every corner would ask every pair twice.
    // The board asks the lower index of each pair — and a corner standing on
    // the axis is asked never, because it has no counterpart to find. The
    // sides and angles keep to their pairs.
    const hook = source('src/modes/useSymmetryParts.ts')
    expect(hook.includes('pairs.points.map(([a]) => a)')).toBeTruthy()
    expect(hook.includes('pairs.sides.map(([a]) => a)')).toBeTruthy()
    expect(hook.includes('pairs.points.some')).toBeFalsy()
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
    // lands — one popup per leg, because the two legs are two different claims —
    // and no press counts until the walk is done. The leg is drawn with its
    // square, and only after a look does the carry's sentence arrive; the mirror
    // is marked only once the carried leg has landed on it, because the point is
    // where the line arrives.
    const unit = source('src/modes/useSymmetryDraw.ts')
    expect(unit.includes('SYMM_PARTS_HOW_LEG')).toBeTruthy()
    expect(unit.includes('SYMM_PARTS_HOW_CARRY')).toBeTruthy()
    // the walk demonstrates the topmost point, where the eye goes first
    expect(unit.includes('a.y < b.y')).toBeTruthy()
    expect(unit.includes('footOnAxis(givens[top]')).toBeTruthy()
    // the walk's clock lives in useDrawWalk so both units share it; one popup
    // per step, because sharing one across two steps lets seven seconds run out
    // mid-step and leaves a gap.
    const clock = source('src/modes/useDrawWalk.ts')
    expect(clock.includes('walk < 3')).toBeTruthy()
    expect(clock.includes('WALK_MS = 3600')).toBeTruthy()
    // the square arrives once the line is drawn, not on a fixed later delay
    expect(clock.includes('LEG_DRAWN_MS = 1200')).toBeTruthy()
    // and the leg's sentence holds until the carry's own step begins, so the
    // explanation follows the drawing rather than racing it
    const shared = source('src/modes/useDrawBoard.ts')
    expect(shared.includes('walk < 2 ? texts.howLeg : texts.howCarry')).toBeTruthy()
    const scene = source('src/components/SymmetryDrawScene.tsx')
    expect(scene.includes('sym-carry')).toBeTruthy()
    expect(scene.includes('sym-draw--slow')).toBeTruthy()
    // the leg meets the axis squarely, so its square arrives once the leg has
    // finished being drawn — tracked in state, because state is what the board
    // can observe and test.
    expect(scene.includes('legDrawn')).toBeTruthy()
    expect(clock.includes('LEG_DRAWN_MS')).toBeTruthy()
    // the mirror waits for the carry to land: no mark may appear before the
    // line that finds it. The travel is one beat written in two places, so the
    // timer that marks the landing and the CSS that slides the line must agree.
    expect(clock.includes('CARRY_MS = 1200')).toBeTruthy()
    expect(source('src/styles/symmetry.css').includes('transition: transform 1200ms')).toBeTruthy()
    expect(clock.includes('landed')).toBeTruthy()
    expect(scene.includes('landed')).toBeTruthy()
    // the carry stays invisible until its turn: it lies exactly on the leg
    // being drawn, and would cover the drawing with a finished line.
    expect(scene.includes('opacity: walk >= 2 ? 1 : 0')).toBeTruthy()
    expect(scene.includes('walking')).toBeTruthy()
  })

  it('gives the carry the same time as the leg', () => {
    // Two explanations, and neither may flash past. The leg's sentence is read
    // across two steps — the lit corner and the leg's own — while the carry's
    // is read across one, so its step is stretched to the same length: the
    // extension through the middle keeps the floor as long as the leg did.
    const clock = source('src/modes/useDrawWalk.ts')
    expect(clock.includes('LEG_SAID_MS = WALK_MS + LEG_MS')).toBeTruthy()
    expect(clock.includes('LANDED_MS = LEG_SAID_MS - CARRY_MS')).toBeTruthy()
    expect(clock.includes('SHOWN_MS = CARRY_MS + LANDED_MS')).toBeTruthy()
  })

  it('draws each joining segment instead of appearing it', () => {
    // A line that only appears reads as the system asserting it; a line drawn
    // reads as something being done. pathLength normalizes any length to one,
    // so one keyframe serves every pair on both boards that join one.
    for (const scene of [
      'src/components/SymmetryFactsScene.tsx',
      'src/components/SymmetryDrawScene.tsx',
    ]) {
      const code = source(scene)
      expect(code.includes('sym-draw')).toBeTruthy()
      expect(code.includes('pathLength')).toBeTruthy()
    }
    expect(source('src/styles/symmetry.css').includes('@keyframes sym-draw')).toBeTruthy()
  })

  it('flies each placed point across instead of appearing it', () => {
    // A tap used to stamp the point where it belongs, which reads as the child
    // asserting the answer. Now the point flies from its given corner to its
    // mirror spot, so the placing is watched arriving: arriving is the proof it
    // belongs there. And with the bottom line gone, which point is awaited
    // arrives as a popup for every point — in staged popups that stay up long
    // enough to read, because placing takes looking.
    const hook = source('src/modes/useDrawBoard.ts')
    expect(hook.includes('flying')).toBeTruthy()
    expect(hook.includes('FLY_MS')).toBeTruthy()
    const scene = source('src/components/SymmetryDrawScene.tsx')
    expect(scene.includes('sym-trip')).toBeTruthy()
    const board = source('src/modes/DrawBoard.tsx')
    expect(board.includes('sym-instruction') ? 'the bottom line is back' : 'ok').toBe('ok')
    // guides stay up seven seconds: long enough to read while doing.
    expect(source('src/modes/useStageMessage.ts').includes('GUIDE_MS')).toBeTruthy()
  })

  it('joins the outline before calling the figure whole', () => {
    // Placing the last point used to finish the board, so one tap completed a
    // figure whose outline was never drawn. Now only joined edges count: a
    // stroke has to land on both ends of one outline edge, either way round,
    // while a repeat or a stroke off the edges matches nothing. The edges are
    // the placed-point neighbours plus the two that tie the chain to the half.
    const hook = source('src/modes/useDrawBoard.ts')
    expect(hook.includes('joined')).toBeTruthy()
    expect(hook.includes('matchJoin')).toBeTruthy()
    expect(hook.includes('joinEdges')).toBeTruthy()
    expect(hook.includes('linkAsk')).toBeTruthy()
    const geo = source('src/geometry/symmetryParts.ts')
    expect(geo.includes('matchSpot')).toBeTruthy()
    expect(geo.includes('matchJoin')).toBeTruthy()
    // and nothing stands between placing and joining: the half is completed by
    // joining the points, never by drawing a line out to the axis
    expect(hook.includes('spanFalls') ? 'a span stage is back' : 'ok').toBe('ok')
    expect(geo.includes('spanFalls') ? 'a span helper outlived the span' : 'ok').toBe('ok')
    for (const scene of [
      'src/components/SymmetryDrawScene.tsx',
      'src/components/PointDrawScene.tsx',
    ]) {
      const code = source(scene)
      expect(code.includes('joins')).toBeTruthy()
      // the whole outline appears only once every edge is joined
      expect(code.includes('{complete && (')).toBeTruthy()
    }
  })

  it('lets the finished figure stand three seconds before the way out', () => {
    // Showing the way out in the same instant as the outline would trade
    // looking at it for leaving it.
    const hook = source('src/modes/useDrawBoard.ts')
    expect(hook.includes('DONE_SHOW_MS = 3000')).toBeTruthy()
    expect(hook.includes('complete')).toBeTruthy()
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

  it('stands every corner of each drawing on the lattice', () => {
    // Placing means pointing exactly, and a corner between grid lines is one
    // the child cannot point at. Screen coordinates come out as multiples of
    // the grid pitch, symmetric about the axis — on all three drawings.
    const draws = SYMM_BOARDS.filter((b) => b.kind === 'draw')
    expect(draws.length).toBe(3)
    for (const draw of draws) {
      if (draw.kind !== 'draw') continue
      const pts = [...draw.shape.vertices, ...draw.half]
      expect(pts.length > 0).toBe(true)
      for (const p of pts) {
        const sx = p.x + SYMM_CENTER.x
        const sy = p.y + SYMM_CENTER.y
        expect(sx % SNAP_PITCH === 0 && sy % SNAP_PITCH === 0 ? 'ok' : `off lattice: ${sx},${sy}`).toBe('ok')
      }
      // and each given half closes along the axis rather than across empty
      // space — on the slant board too, where "along the axis" is no longer
      // "both ends have x === 0"
      const first = draw.half[0]
      const last = draw.half[draw.half.length - 1]
      const onAxis = (p: { x: number; y: number }) => offLine(screen(p), draw.axis) < 0.5
      expect(first && last && onAxis(first) && onAxis(last) ? 'ok' : 'the half leaves the axis').toBe('ok')
    }
  })

  it('folds the last drawing on a slant, on a shape the first two are not', () => {
    // The first two drawings are upright, convex outlines, so completing the
    // third the same way would be doing the second again. The last one changes
    // both at once: its axis runs tip to tip at 45°, and its outline turns both
    // ways — a four-pointed star. A child who has completed two hexagons cannot
    // complete this one from memory.
    const [octagon, wide, last] = SYMM_DRAW_BOARDS
    expect([octagon, wide, last].every((b) => b.kind === 'draw')).toBe(true)
    if (octagon.kind !== 'draw' || wide.kind !== 'draw' || last.kind !== 'draw') return
    // upright: the first two fold on a vertical line
    expect(octagon.axis.a.x === octagon.axis.b.x).toBe(true)
    expect(wide.axis.a.x === wide.axis.b.x).toBe(true)
    // slanted: the last one crosses both ways, so "left of the axis" is not
    // "x smaller" and the fold has to be read rather than pointed at
    const dx = last.axis.b.x - last.axis.a.x
    const dy = last.axis.b.y - last.axis.a.y
    expect(dx !== 0 && dy !== 0 && Math.abs(dx) === Math.abs(dy)).toBe(true)
    // convex: the first two only ever turn one way, the star turns both
    const ways = (pts: Array<{ x: number; y: number }>) =>
      new Set(pts.map((_, i) => {
        const a = pts[i]
        const b = pts[(i + 1) % pts.length]
        const c = pts[(i + 2) % pts.length]
        return Math.sign((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x))
      })).size
    expect(ways(octagon.shape.vertices)).toBe(1)
    expect(ways(wide.shape.vertices)).toBe(1)
    expect(ways(last.shape.vertices) > 1).toBe(true)
    // and the star is symmetric about the slant itself: every corner has its
    // mirror among the corners, and only the two tips on the axis are their
    // own partners — the same shape of answer the octagon and hexagon give
    const partners = mirrorIndex(last.shape.vertices.map(screen), last.axis)
    expect(partners.every((p, i) => partners[p] === i)).toBe(true)
    expect(partners.filter((p, i) => p === i).length).toBe(2)
  })

  it('snaps a placed point exactly onto the mirror image', () => {
    // The drawing that results is the true one, because the true one is the
    // answer; what is the child's is knowing where it goes. The answer always
    // stands across the axis from the half it completes — square across on the
    // upright boards, and diagonally across on the slant one — and it is always
    // a real corner of the shape, never a spot the scene conjured.
    for (const draw of SYMM_DRAW_BOARDS) {
      if (draw.kind !== 'draw') continue
      const half = draw.half.map(screen)
      const corners = draw.shape.vertices.map(screen)
      const given = draw.place.map((i) => screen(draw.shape.vertices[i]))
      expect(given.length > 0).toBe(true)
      for (const p of given) {
        const image = mirrorOf(p, draw.axis)
        const own = side(p, draw.axis)
        // nothing to place was already on the board: the given half stands on
        // its own side of the axis, the answer squarely on the other
        expect(half.every((h) => side(h, draw.axis) * own >= 0) ? 'ok' : 'the half crosses the axis').toBe('ok')
        expect(side(image, draw.axis) * own < 0 ? 'ok' : 'the answer was already on the board').toBe('ok')
        expect(corners.some((c) => near(c, image)) ? 'ok' : 'the mirror is not a corner').toBe('ok')
      }
    }
  })

  it('joins every drawing along its sides, never across it', () => {
    // The child's joins have to land on the figure's own edges: the chain runs
    // from the first corner of the given half, through the found points, to
    // its last corner — every consecutive pair a side. A list in the wrong
    // order would ask the child to draw across the figure instead.
    for (const draw of SYMM_DRAW_BOARDS) {
      if (draw.kind !== 'draw') continue
      const corners = draw.shape.vertices.map(screen)
      const half = draw.half.map(screen)
      const answers = draw.place.map((i) => mirrorOf(screen(draw.shape.vertices[i]), draw.axis))
      const joins = [
        { a: half[0], b: answers[0] },
        ...answers.slice(0, -1).map((a, i) => ({ a, b: answers[i + 1] })),
        { a: answers[answers.length - 1], b: half[half.length - 1] },
      ]
      const isSide = (a: { x: number; y: number }, b: { x: number; y: number }) =>
        corners.some((v, i) => {
          const w = corners[(i + 1) % corners.length]
          return (near(v, a) && near(w, b)) || (near(v, b) && near(w, a))
        })
      for (const join of joins) {
        expect(isSide(join.a, join.b) ? 'ok' : `a join cuts across ${draw.id}`).toBe('ok')
      }
    }
  })

  it('asks for the corresponding point without saying how many are left', () => {
    expect(symmetryDrawInstructionFor(3)).toBe('대응점을 찾아 눌러보세요')
    expect(symmetryDrawInstructionFor(2)).toBe('대응점을 찾아 눌러보세요')
    expect(symmetryDrawInstructionFor(1)).toContain('마지막 대응점')
    expect(symmetryDrawInstructionFor(0)).not.toContain('0')
    expect(symmetryDrawMissedFor().text).toContain('같은 거리')
    expect(symmetryDrawMissedFor().text).toContain('대응점')
    expect(symmetryDrawSuccessFor(2).text).toContain('같은 거리')
    expect(symmetryDrawSuccessFor(1).text).toContain('대응점')
    expect(symmetryDrawSuccessFor(0).text).toContain('대응점')
    for (const n of [0, 1, 2, 3]) {
      expect(/[0-9]/.test(symmetryDrawInstructionFor(n)) ? 'counts what is left' : 'ok').toBe('ok')
      expect(/[0-9]/.test(symmetryDrawSuccessFor(n).text) ? 'counts what is left' : 'ok').toBe('ok')
    }
  })

  it('draws the whole figure only once every neighbour pair is joined', () => {
    // Before that it is the answer painted under the question, so the whole
    // outline hangs off `complete` — which needs every join, not every point —
    // while the way out still waits on `resolved` three seconds later.
    const scene = source('src/components/SymmetryDrawScene.tsx')
    expect(/\{complete && \(/.test(scene) ? 'ok' : 'the whole figure is shown early').toBe('ok')
    expect(scene.includes('sym-shape--whole')).toBeTruthy()
    // and the axis is given rather than asked for on this board
    expect(scene.includes('sym-axis--given')).toBeTruthy()
    // a tap and a drag both end on release, and the hook tells them apart by
    // distance: a press without a real drag is not a line, and a line without
    // two real ends is not an answer.
    expect(scene.includes('onPointerUp')).toBeTruthy()
    expect(source('src/modes/useDrawBoard.ts').includes('MIN_DRAG')).toBeTruthy()
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

/** A point of a board's own frame, placed on the canvas. */
function screen(p: { x: number; y: number }): { x: number; y: number } {
  return { x: p.x + SYMM_CENTER.x, y: p.y + SYMM_CENTER.y }
}

/**
 * Which side of a line a point stands on, sign only.
 *
 * The cross product of the line's direction with the point's offset — the one
 * measure that reads the same on a vertical axis and on the slant the last
 * drawing folds over, where "left of the axis" is no longer "x smaller".
 */
function side(
  p: { x: number; y: number },
  line: { a: { x: number; y: number }; b: { x: number; y: number } },
): number {
  return (p.x - line.a.x) * (line.b.y - line.a.y) - (p.y - line.a.y) * (line.b.x - line.a.x)
}

/** How far a point stands off a line, in pixels. */
function offLine(
  p: { x: number; y: number },
  line: { a: { x: number; y: number }; b: { x: number; y: number } },
): number {
  const dx = line.b.x - line.a.x
  const dy = line.b.y - line.a.y
  return Math.abs(side(p, line)) / Math.hypot(dx, dy)
}

const { report } = await import('../harness/spec.mjs')
report()