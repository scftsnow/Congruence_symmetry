/**
 * Point-symmetry spec.
 *
 * The same three things the line unit checks, about the other mirror: the
 * shapes must be answerable with what little fingers can point at, a tap with
 * no middle behind it judges nothing, and the turn must land. And the pairing
 * is never worked out twice — every pair here comes from the same
 * correspondence() the congruence unit uses, so if these disagree with it the
 * unit is teaching two different answers to one question.
 */

import { describe, it, expect } from '../harness/api'
import {
  judgeCenter,
  pointCenterOf,
  symmetryCenterOf,
  isPointSymmetric,
  isDrag,
  snapPointToGrid,
  turnDirection,
  turnIndex,
  turnOf,
  turnTransform,
} from '../../src/geometry/pointSymmetry'
import { CENTER_TOLERANCE } from '../../src/geometry/symmetry'
import { distance } from '../../src/geometry/transforms'
import {
  POINT_SYMM_BOARDS,
  POINT_SYMM_CENTER,
  POINT_SYMMETRY_ITEMS,
  POINT_CENTER_BOARDS,
  POINT_PARTS_BOARDS,
  POINT_FACTS_BOARDS,
  POINT_DRAW_BOARDS,
} from '../../src/geometry/pointSymmetryShapes'
import { isLineSymmetric } from '../../src/geometry/symmetry'
import {
  pointSymmetryDonePanelFor,
  pointSymmetryFoundFor,
  pointSymmetryHintFor,
  pointSymmetryInstructionFor,
  pointSymmetryNoCenterFor,
  POINT_DENY_LABEL,
} from '../../src/components/pointSymmText'
import {
  pointDrawDonePanelFor,
  pointDrawInstructionFor,
  pointDrawMissedFor,
  pointDrawSuccessFor,
  pointFactsDonePanelFor,
  pointFactsHintFor,
  pointFactsInstructionFor,
  pointFactsSuccessFor,
  pointPartsDonePanelFor,
  pointPartsFoundFor,
  pointPartsHintFor,
  pointPartsInstructionFor,
  pointPartsMessageFor,
  POINT_PARTS_HOW_CARRY,
  POINT_PARTS_HOW_LEG,
} from '../../src/components/pointSymmPartsText'
import { correspondence } from '../../src/geometry/correspondence'
import { reflectionCorrespondence } from '../../src/geometry/symmetryParts'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const source = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')
const onScreen = (pts: Array<{ x: number; y: number }>) =>
  pts.map((p) => ({ x: p.x + POINT_SYMM_CENTER.x, y: p.y + POINT_SYMM_CENTER.y }))
const CENTER = { x: 550, y: 300 }

describe('every figure has its middle where fingers can point', () => {
  it('puts one true center on each of the first four', () => {
    for (const item of POINT_SYMMETRY_ITEMS.slice(0, 4)) {
      const middle = symmetryCenterOf(item.shape.vertices)
      expect(middle ? 'ok' : `${item.id} has no center`).toBe('ok')
      // and on the lattice crossing the whole unit shares
      expect(Math.abs(pointCenterOf(item.shape.vertices).x) < 1 ? 'ok' : 'off middle').toBe('ok')
      expect(item.centers).toBe(1)
    }
    expect(POINT_SYMMETRY_ITEMS[4].centers).toBe(0)
    expect(symmetryCenterOf(POINT_SYMMETRY_ITEMS[4].shape.vertices)).toBe(null)
  })

  it('gives the last figure an axis but no center', () => {
    // Chosen line-symmetric on purpose, so a child fresh from folding lines must
    // notice that folding is not turning.
    const trap = POINT_SYMMETRY_ITEMS[4].shape.vertices
    expect(isLineSymmetric(trap)).toBe(true)
    expect(isPointSymmetric(trap)).toBe(false)
  })

  it('pairs every corner with the corner it turns onto', () => {
    for (const item of POINT_SYMMETRY_ITEMS.slice(0, 4)) {
      const partners = turnIndex(item.shape.vertices, pointCenterOf(item.shape.vertices))
      expect(partners.length).toBe(item.shape.vertices.length)
      for (let i = 0; i < partners.length; i++) {
        expect(partners[partners[i]]).toBe(i)
      }
    }
  })

  it('judges a tapped middle in one frame, never two', () => {
    // The exact browser scenario: the finger taps in screen coordinates while
    // the outline lives in its own frame.
    const para = POINT_SYMMETRY_ITEMS[0].shape.vertices
    expect(judgeCenter(para, { x: 550, y: 300 })).toBe('hit')
    expect(judgeCenter(para, { x: 550 + CENTER_TOLERANCE + 10, y: 300 })).toBe('miss')
    expect(judgeCenter(para, { x: 1000, y: 1000 })).toBe('off')
    expect(CENTER_TOLERANCE > 0 ? 'ok' : 'no tolerance').toBe('ok')
  })

  it('snaps the press and reads only the drag direction', () => {
    // The press lands on the nearest lattice crossing before anything is
    // judged, on the same grid the axis board snaps to.
    expect(snapPointToGrid({ x: 567, y: 312 })).toEqual({ x: 550, y: 300 })
    // Only the direction steers the turn, never the distance: every drag turns
    // the same fixed half turn, so how far the finger went cannot leak anything.
    expect(turnDirection({ x: 550, y: 300 }, { x: 700, y: 300 })).toBe(1)
    expect(turnDirection({ x: 550, y: 300 }, { x: 400, y: 300 })).toBe(-1)
    expect(turnDirection({ x: 550, y: 300 }, { x: 550, y: 100 })).toBe(1)
    // and a press without a real drag is not a turn at all.
    expect(isDrag({ x: 550, y: 300 }, { x: 560, y: 305 })).toBe(false)
    expect(isDrag({ x: 550, y: 300 }, { x: 650, y: 320 })).toBe(true)
    const hook = source('src/modes/usePointSymmetry.ts')
    expect(hook.includes('beginDraw')).toBeTruthy()
    expect(hook.includes('snapPointToGrid')).toBeTruthy()
  })

  it('turns the copy exactly onto the shape, and only there', () => {
    // The demonstration shows the copy travelling halfway round; if the
    // transform string were malformed it would sail off somewhere else.
    expect(turnTransform(CENTER, 180).includes('rotate(180deg)')).toBeTruthy()
    for (const item of POINT_SYMMETRY_ITEMS.slice(0, 4)) {
      for (const v of item.shape.vertices) {
        const landed = turnOf({ x: v.x + 550, y: v.y + 300 }, CENTER)
        const near = item.shape.vertices.some(
          (w) => distance({ x: w.x + 550, y: w.y + 300 }, landed) < 2,
        )
        expect(near ? 'ok' : 'the turn misses its partner').toBe('ok')
      }
    }
  })

  it('pairs each outline with its own half-turn image, like the line unit', () => {
    const hex = POINT_SYMMETRY_ITEMS[3].shape.vertices
    const shown = onScreen(hex)
    expect(reflectionCorrespondence(shown, (p) => turnOf(p, CENTER))).toEqual(
      correspondence(shown, shown.map((p) => turnOf(p, CENTER))),
    )
  })
})

describe('the child taps, the system turns', () => {
  it('holds the state in a hook and the drawing in a component', () => {
    expect(source('src/modes/usePointSymmetry.ts')).toBeTruthy()
    expect(source('src/components/CenterScene.tsx').includes('useState')).toBeFalsy()
    expect(source('src/components/CenterScene.tsx').includes('useEffect')).toBeFalsy()
  })

  it('says the middle in the unit\'s own words', () => {
    expect(pointSymmetryFoundFor().text).toBe('점대칭도형이에요! 이 점이 대칭의 중심이에요')
    expect(pointSymmetryNoCenterFor().text).toContain('점대칭도형이 아니에요')
    expect(pointSymmetryNoCenterFor().tone).toBe('success')
    expect(pointSymmetryHintFor('off').text).toBe('도형 안을 눌러 보세요')
    expect(pointSymmetryHintFor('miss').text).toContain('돌렸을 때 완전히 겹치는 중심')
    expect(pointSymmetryHintFor('deny').text).toContain('돌리면 겹치는 점')
    expect(POINT_DENY_LABEL).toBe('대칭의 중심이 없어요')
    expect(pointSymmetryInstructionFor()).toContain('대칭의 중심')
  })

  it('"there is none" is an answer, judged like any other', () => {
    const board = source('src/modes/CenterBoard.tsx')
    expect(board.includes('denyClaim')).toBeTruthy()
    expect(board.includes('POINT_DENY_LABEL')).toBeTruthy()
    expect(board.includes('대칭의 중심이 없어요') ? 'wording hardcoded in markup' : 'ok').toBe('ok')
    const hook = source('src/modes/usePointSymmetry.ts')
    expect(hook.includes('denyClaim')).toBeTruthy()
    expect(hook.includes("'deny'")).toBeTruthy()
  })

  it('ends the center row on the figures, not the points', () => {
    const done = pointSymmetryDonePanelFor()
    expect(done.title.map((p) => p.text).join('')).toBe('점대칭도형을 모두 찾았어!')
    expect(done.note).toBe('한 점을 중심으로 반 바퀴 돌렸을 때 완전히 겹치는 도형이 점대칭도형이야')
    expect(/[0-9]/.test(done.note) ? 'counts in the lesson' : 'ok').toBe('ok')
  })

  it('reaches each row from the home list', () => {
    const app = source('src/App.tsx')
    for (const stage of [
      'SymmetryPointAxisStage',
      'SymmetryPointPartsStage',
      'SymmetryPointFactsStage',
      'SymmetryPointDrawStage',
    ]) {
      expect(app.includes(stage)).toBe(true)
    }
    for (const screen of ["'point-axis'", "'point-parts'", "'point-facts'", "'point-draw'"]) {
      expect(app.includes(screen)).toBe(true)
    }
  })
})

describe('the four rows on the home screen', () => {
  it('runs the ten boards in the textbook\'s order', () => {
    expect(POINT_SYMM_BOARDS.length).toBe(8)
    expect(POINT_SYMM_BOARDS.slice(0, 4).every((b) => b.kind === 'center')).toBe(true)
    expect(POINT_SYMM_BOARDS[4].kind).toBe('parts')
    expect(POINT_SYMM_BOARDS[5].kind).toBe('facts')
    expect(POINT_SYMM_BOARDS[6].kind).toBe('center')
    expect(POINT_SYMM_BOARDS[7].kind).toBe('draw')
  })

  it('opens one row per question, not one door for all four', () => {
    expect(POINT_CENTER_BOARDS.length).toBe(5)
    expect(POINT_CENTER_BOARDS.every((b) => b.kind === 'center')).toBe(true)
    expect(POINT_PARTS_BOARDS.length).toBe(1)
    expect(POINT_FACTS_BOARDS.length).toBe(1)
    expect(POINT_DRAW_BOARDS.length).toBe(1)
    const app = source('src/App.tsx')
    for (const row of [
      '점대칭도형 찾기',
      '점대칭도형의 대응점·대응변·대응각',
      '점대칭도형의 성질',
      '점대칭도형 그리기',
    ]) {
      expect(app.includes(row)).toBe(true)
    }
  })

  it('runs one pass for both correspondence boards, not one each', () => {
    expect(source('src/modes/useCorrespondence.ts').includes('useCorrPass(')).toBeTruthy()
    expect(source('src/modes/usePointSymmetryParts.ts').includes('useCorrPass(')).toBeTruthy()
    expect(source('src/components/PointPartsScene.tsx').includes('<CorrMarks')).toBeTruthy()
    expect(source('src/components/PointPartsScene.tsx').includes('swap')).toBeTruthy()
    // ... and the turn is about the middle, not about a corner: turning about a
    // corner swings the part round a huge arc, while the middle keeps it tight.
    expect(source('src/components/PointPartsScene.tsx').includes('turnTransform(center, 180)')).toBeTruthy()
  })

  it('settles every board kind, or the row never ends', () => {
    for (const hook of [
      'src/modes/usePointSymmetry.ts',
      'src/modes/usePointSymmetryParts.ts',
      'src/modes/usePointSymmetryFacts.ts',
      'src/modes/usePointSymmetryDraw.ts',
    ]) {
      expect(source(hook).includes('onSettled')).toBeTruthy()
    }
    expect(source('src/modes/useSymmetryRun.ts').includes('round')).toBeTruthy()
  })

  it('asks each pair once, and only the paired sides at all', () => {
    const hook = source('src/modes/usePointSymmetryParts.ts')
    expect(hook.includes('pairs.points.map(([a]) => a)')).toBeTruthy()
    expect(hook.includes('pairs.sides.map(([a]) => a)')).toBeTruthy()
  })

  it('asks each pass with a popup first', () => {
    // A line at the bottom is read once and then left alone, so the first
    // question of a pass crosses the board as a popup too — and only the first,
    // because every later step already knows what it is doing.
    const hook = source('src/modes/usePointSymmetryParts.ts')
    expect(hook.includes('pass.step === 0')).toBeTruthy()
    expect(hook.includes("icon: '👉'")).toBeTruthy()
  })

  it('says which of the three was found, and counts none of them', () => {
    expect(pointPartsFoundFor('points')!.text).toBe('대응점을 찾았어!')
    expect(pointPartsFoundFor('sides')!.text).toBe('대응변을 찾았어!')
    expect(pointPartsFoundFor('angles')!.text).toBe('대응각을 찾았어!')
    expect(pointPartsFoundFor('compare')).toBe(null)
    expect(pointPartsInstructionFor('points')).toBe('빛나는 점의 대응점을 찾아요')
    for (const phase of ['points', 'sides', 'angles'] as const) {
      expect(/[0-9]/.test(pointPartsMessageFor({
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
    const hook = source('src/modes/usePointSymmetryFacts.ts')
    expect(hook.includes("'join' | 'hub' | 'equal'")).toBeTruthy()
    expect(hook.includes('waitingOn') ? 'the child spans again' : 'ok').toBe('ok')
    const scene = source('src/components/PointFactsScene.tsx')
    expect(scene.includes('sym-hub')).toBeTruthy()
    expect(scene.includes('<CorrFly')).toBeTruthy()
    expect(scene.includes('sym-tick')).toBeTruthy()
    expect(pointFactsInstructionFor('join')).toContain('대응점을 손가락으로')
    expect(pointFactsHintFor('pair').text).toContain('마주 보는 점')
    expect(pointFactsSuccessFor('hub').text).toContain('중심을 지나요')
    expect(pointFactsSuccessFor('equal').text).toContain('거리는 같아요')
  })

  it('walks the first point before asking for any', () => {
    const unit = source('src/modes/usePointSymmetryDraw.ts')
    expect(unit.includes('POINT_PARTS_HOW_LEG')).toBeTruthy()
    expect(unit.includes('POINT_PARTS_HOW_CARRY')).toBeTruthy()
    // the clock lives in useDrawWalk so both units share it
    expect(source('src/modes/useDrawWalk.ts').includes('walk < 3')).toBeTruthy()
    const scene = source('src/components/PointDrawScene.tsx')
    expect(scene.includes('sym-join')).toBeTruthy()
    expect(scene.includes('walking')).toBeTruthy()
    expect(POINT_PARTS_HOW_LEG).toContain('중심을 향해')
    expect(POINT_PARTS_HOW_CARRY).toContain('대응점이에요')
  })

  it('joins neighbours before calling the figure whole', () => {
    // Same shared board, so the point unit joins before finishing too: the
    // whole outline appears only once every neighbour pair is joined, and
    // stands three seconds before the way out appears. No span stage stands
    // between placing and joining here either.
    const unit = source('src/modes/usePointSymmetryDraw.ts')
    expect(unit.includes('POINT_DRAW_LINK_ASK')).toBeTruthy()
    expect(unit.includes('POINT_DRAW_LINKED')).toBeTruthy()
    expect(unit.includes('POINT_DRAW_SPAN_ASK') ? 'a span stage is back' : 'ok').toBe('ok')
    const scene = source('src/components/PointDrawScene.tsx')
    expect(scene.includes('joins')).toBeTruthy()
    expect(scene.includes('{complete && (')).toBeTruthy()
  })

  it('ends every row with the sentence the row was for', () => {
    expect(pointPartsDonePanelFor().note).toContain('마주 보는 점과 변과 각')
    expect(pointFactsDonePanelFor().title.map((p) => p.text).join('')).toBe('두 가지 성질을 찾았어!')
    expect(pointFactsDonePanelFor().note).toContain('대칭의 중심을 지나고')
    expect(pointDrawDonePanelFor().title.map((p) => p.text).join('')).toBe('점대칭도형을 완성했어!')
    for (const done of [
      pointPartsDonePanelFor(),
      pointFactsDonePanelFor(),
      pointDrawDonePanelFor(),
    ]) {
      expect(/[0-9]/.test(done.note) ? 'counts in the lesson' : 'ok').toBe('ok')
      expect(done.homeLabel).toBe('첫 화면으로')
    }
  })
})

const { report } = await import('../harness/spec.mjs')
report()