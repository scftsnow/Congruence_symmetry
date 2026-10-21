/**
 * Render spec — the board must actually mount.
 *
 * The `flower()` loop bug compiled, deployed, passed every bundle check, and
 * still served a blank screen. A build is not a render.
 *
 * The runner executes this with a 128MB heap cap and a wall-clock timeout, so
 * an unbounded loop inside a component is reported as NON-TERMINATING rather
 * than hanging CI for twelve seconds.
 *
 * Korean literals live in harness/expected.json; literal escapes get mangled
 * on the way to disk in this environment.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from '../harness/api'
import expected from '../harness/expected.json' with { type: 'json' }
import { renderToStaticMarkup } from 'react-dom/server'
import App, { HomeUnits } from '../../src/App'
import type { UnitProgress } from '../../src/modes/useUnitProgress'
import { CongruenceStage } from '../../src/modes/CongruenceStage'
import { CorrespondenceStage } from '../../src/modes/CorrespondenceStage'
import { SymmetryAxisStage } from '../../src/modes/SymmetryAxisStage'
import { SymmetryPartsStage } from '../../src/modes/SymmetryPartsStage'
import { SymmetryFactsStage } from '../../src/modes/SymmetryFactsStage'
import { SymmetryDrawStage } from '../../src/modes/SymmetryDrawStage'
import { SymmetryPointAxisStage } from '../../src/modes/SymmetryPointAxisStage'
import { SymmetryPointPartsStage } from '../../src/modes/SymmetryPointPartsStage'
import { SymmetryPointFactsStage } from '../../src/modes/SymmetryPointFactsStage'
import { SymmetryPointDrawStage } from '../../src/modes/SymmetryPointDrawStage'
import { buildBoard, useBoard } from '../../src/modes/useBoard'
import { DonePanel } from '../../src/components/DonePanel'
import { Toast } from '../../src/components/Toast'
import { congruenceDonePanelFor, congruenceMessageFor } from '../../src/components/verdictText'
import { correspondenceDonePanelFor as corrDonePanelFor } from '../../src/components/corrText'

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

/**
 * A file with its comments removed.
 *
 * Several of these files explain at length what was taken out and why, so a
 * check over the whole text trips on the explanation rather than on the code.
 */
function strip(path: string): string {
  return source(path).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

// ── cover ─────────────────────────────────────────────────
describe('the cover opens the app', () => {
  const html = renderToStaticMarkup(<App />)

  it('produces markup', () => {
    expect(html.length > 500).toBeTruthy()
  })

  it('shows the title', () => {
    expect(html.includes(expected.home.title)).toBeTruthy()
  })

  it('shows the way in, and no doors yet', () => {
    /*
     * The cover is the place you arrive and the doors are the place you
     * choose: the two never share the frame, so a static render of the first
     * shows the button but none of the ten rows.
     */
    expect(html.includes('시작하기')).toBeTruthy()
    expect(html.includes('단원 고르기')).toBeFalsy()
    expect(html.includes(expected.home.unitTitle)).toBeFalsy()
  })

  it('turns constellations over the cover', () => {
    expect(html.includes('aria-label="별자리"')).toBeTruthy()
  })
})

// ── home ──────────────────────────────────────────────────
describe('home screen renders', () => {
  // The doors live one screen past the cover, so they are read on their own.
  const fresh: UnitProgress = { done: [], isDone: () => false, count: 0, markDone: () => {} }
  const html = renderToStaticMarkup(<HomeUnits progress={fresh} onOpen={() => {}} />)

  it('produces markup', () => {
    expect(html.length > 500).toBeTruthy()
  })

  it('offers the congruence unit', () => {
    expect(html.includes(expected.home.unitTitle)).toBeTruthy()
  })

  /*
   * The list rows are the only doors.
   *
   * The home used to carry a start button under the list pointing at the first
   * unit, so the same place had a small door in the list and a big one underneath.
   * Two doors into one room is not a choice, it is a question the child cannot
   * answer, and the duplicate is now gone.
   */
  it('opens each unit from its own row', () => {
    const rows = html.match(/<button[^>]*class="unit-open"/g) || []
    expect(rows.length >= 5 ? 'ok' : rows.length + ' rows').toBe('ok')
    expect(html.includes(expected.home.corrUnitTitle)).toBeTruthy()
    // line symmetry is four rows: finding, parts, facts, drawing
    for (const title of [
      expected.symm.axisTitle,
      expected.symm.partsTitle,
      expected.symm.factsTitle,
      expected.symm.drawTitle,
    ]) {
      expect(html.includes(title)).toBeTruthy()
    }
    // and so is point symmetry
    for (const title of [
      expected.ptsym.axisTitle,
      expected.ptsym.partsTitle,
      expected.ptsym.factsTitle,
      expected.ptsym.drawTitle,
    ]) {
      expect(html.includes(title)).toBeTruthy()
    }
  })

  it('has no second way into a unit', () => {
    /*
     * The cover carries one button, but it goes to the doors, not into a unit.
     * The failure this guards is the old duplicate: a big button under the
     * list pointing at the first unit next to its small row, two doors into
     * one room. So what has to hold is that no button names a unit to jump to:
     * a literal names its destination, and only home may be named — a unit is
     * always the row's own id travelling through, never a jump to a fixed one.
     */
    const app = strip('src/App.tsx')
    const targets = [...app.matchAll(/setScreen\(([^)]+)\)/g)].map((m) => m[1].trim())
    expect(targets.length).toBeGreaterThan(0)
    for (const target of targets) {
      const named = /^'([^']+)'$/.exec(target)?.[1]
      expect(!named || named === 'home' ? 'ok' : target).toBe('ok')
    }
  })

  it('does not ask the child to pick shapes first', () => {
    expect(html.includes('role="radiogroup"')).toBeFalsy()
  })
})

// ── the board ────────────────────────────────────────────
describe('congruence board renders', () => {
  const html = renderToStaticMarkup(<CongruenceStage onBack={() => {}} />)

  it('produces markup', () => {
    expect(html.length > 1000).toBeTruthy()
  })

  it('draws an SVG canvas', () => {
    expect(html.includes('<svg')).toBeTruthy()
    expect(html.includes('viewBox')).toBeTruthy()
  })

  it('draws the background grid', () => {
    expect(html.includes('<line')).toBeTruthy()
  })

  it('holds the title across the middle of the screen', () => {
    /*
     * With a way back on one side and a counter — or nothing — on the other,
     * space-between leaves the title off-centre by half the difference. It is
     * centred absolutely instead, on every board the same way, and it takes no
     * taps itself so the buttons around it keep theirs.
     */
    const ui = source('src/styles/ui.css')
    expect(/\.mode__header\s*\{[^}]*position:\s*relative/.test(ui)).toBeTruthy()
    expect(/\.mode__title\s*\{[^}]*position:\s*absolute/.test(ui)).toBeTruthy()
    expect(/\.mode__title\s*\{[^}]*text-align:\s*center/.test(ui)).toBeTruthy()
    expect(/\.mode__title\s*\{[^}]*pointer-events:\s*none/.test(ui)).toBeTruthy()
  })

  it('keeps the replay next to the way back, not in a bar of its own', () => {
    /*
     * Starting over is looked for where going back lives, and a whole strip
     * under the board for one button is a strip too many. So the reset sits in
     * the header beside the back button — before the title in the markup — and
     * no toolbar markup is left behind.
     */
    expect(html.includes('처음부터')).toBeTruthy()
    expect(html.includes('toolbar')).toBeFalsy()
    expect(html.indexOf('처음부터') < html.indexOf('합동인 도형 찾기')).toBeTruthy()
  })

  it('draws every shape as a path', () => {
    // twelve shapes plus hit areas and the grid
    expect((html.match(/<path/g) ?? []).length >= 12).toBeTruthy()
  })

  it('prints a hangul syllable under each shape', () => {
    expect((html.match(/<text/g) ?? []).length >= 12).toBeTruthy()
  })

  it('counts progress toward the goal', () => {
    expect(html.includes('0 / 5')).toBeTruthy()
  })

  it('tells the child to drag a shape, as a popup', () => {
    // The bottom line is gone: the ask crosses the top of the panel instead.
    // SSR never runs the popup timer, so the wording is checked in the source.
    const stage = source('src/modes/CongruenceStage.tsx')
    expect(stage.includes('끌어다 겹쳐 보세요')).toBeTruthy()
    expect(stage.includes('stage1-hint') ? 'bottom line is back' : 'ok').toBe('ok')
  })

  it('opens with a guide popup, not a standing line', () => {
    const stage = source('src/modes/CongruenceStage.tsx')
    expect(stage.includes("icon: '👉'")).toBeTruthy()
  })

  it('offers a reset and no angle controls', () => {
    expect(html.includes(expected.board.reset)).toBeTruthy()
    // No rotate or flip control: the angle is the system's problem.
    // Checked in the source, since the viewBox also contains digits.
    const stage = source('src/modes/CongruenceStage.tsx')
    expect(stage.includes('onRotate')).toBeFalsy()
    expect(stage.includes('onFlip')).toBeFalsy()
    expect(stage.includes('rotateBy')).toBeFalsy()
    // the only circular arrow is on the reset button, which is not a turn
    const degreeLabels = stage.match(/>[^<]*(90|45)\s*°/g) ?? []
    expect(degreeLabels.length === 0 ? 'ok' : degreeLabels.join(', ')).toBe('ok')
  })

  it('disables touch panning so dragging does not scroll a tablet', () => {
    const parts = source('src/components/BoardShapeView.tsx')
    expect(parts.includes('touchAction')).toBeTruthy()
    expect(/touch-action:\s*none/.test(source('src/styles/ui.css'))).toBeTruthy()
  })

  it('fits a sideways tablet without scrolling mid-activity', () => {
    /*
     * Upright there is room to spare, but sideways the widest board runs past
     * the fold and shapes hide below it. The canvas is capped against the small
     * viewport height instead, so it binds only there — and the ratio survives
     * the cap, so a capped board is narrower, never stretched.
     */
    const ui = source('src/styles/ui.css')
    expect(/\.canvas\s*\{[^}]*max-height:\s*calc\(100svh/.test(ui)).toBeTruthy()
  })

  it('stacks a narrow header instead of sliding the title under its buttons', () => {
    // Absolutely centred is exact until the screen runs out of room for the
    // title between the buttons. Wrapped, the buttons keep the first row and
    // the title takes a centred second one.
    const ui = source('src/styles/ui.css')
    expect(/@media\s*\(max-width:\s*900px\)[\s\S]*?\.mode__header\s*\{[^}]*flex-wrap:\s*wrap/.test(ui)).toBeTruthy()
    expect(/@media\s*\(max-width:\s*900px\)[\s\S]*?\.mode__title\s*\{[^}]*position:\s*static/.test(ui)).toBeTruthy()
  })
})

// ── the popup waits for the let-go ─────────────────────────
//
// The verdict memo depends on `items`, which moves on every pointer move, so
// it used to recompute live: the hint appeared the moment a shape was picked
// up, and the success the moment it passed over a partner — both while the
// child was still holding it. The verdict is now gated on release, so the
// popup is a reaction to the drop, not a running commentary on the drag.

describe('the popup waits for the let-go', () => {
  /*
   * Drives the hook into the mid-drag state — a shape held and laid exactly on
   * its partner, which is what a press followed by a drag leaves behind —
   * without a DOM. Each update is conditional, so the render converges.
   */
  function HeldOnPartner({ released }: { released: boolean }) {
    const board = useBoard(released)
    if (!board.held) {
      // items carry an id of their own (s-가, s-나, …); the shape id is a field
      board.setHeld(board.items.find((i) => i.shape.id === 'tri-scalene-2')!.id)
    } else {
      const held = board.heldItem!
      const partner = board.items.find((i) => i.shape.id === 'tri-scalene')!
      if (held.x !== partner.x || held.y !== partner.y) {
        board.move(held.id, partner.x, partner.y)
      }
    }
    const message = congruenceMessageFor(board.verdict, false, board.foundCount, board.target)
    return <div>{message.tone}</div>
  }

  it('says nothing while the shape is held over a partner', () => {
    const html = renderToStaticMarkup(<HeldOnPartner released={false} />)
    expect(html.includes('success')).toBeFalsy()
    expect(html.includes('neutral')).toBeTruthy()
  })

  it('celebrates the stack once the child lets go', () => {
    const html = renderToStaticMarkup(<HeldOnPartner released={true} />)
    expect(html.includes('success')).toBeTruthy()
  })

  it('never renders the popup while a finger is down', () => {
    // The verdict gate is not enough on its own: the popup outlives the release
    // that made it, so a child who picks up the next shape inside its reading
    // time would otherwise carry the old message into the new drag. The screen
    // therefore refuses to draw it while dragging, whatever the hook says.
    const stage = source('src/modes/CongruenceStage.tsx')
    expect(stage.includes('!dragging')).toBeTruthy()
    expect(/toast && !dragging && <Toast/.test(stage)).toBeTruthy()
  })
})

describe('the board shows overlap rather than asserting it', () => {
  it('renders every piece of the shared region', () => {
    // Two arrows crossing at right angles share two separate lobes. A single
    // outline cannot describe them, so the layer draws all of them.
    const layer = source('src/components/OverlapLayer.tsx')
    expect(layer.includes('intersection')).toBeTruthy()
    expect(layer.includes('intersection.map')).toBeTruthy()
    expect(source('src/geometry/pairs.ts').includes('heldOverlap')).toBeTruthy()
  })

  it('shows no percentage anywhere on the layer', () => {
    // The bar read "겹친 부분 58%" and had to go. For the arrow pair, stacked
    // dead centre and plainly on top of each other, the honest figure was 58%,
    // so the child was told their perfect stack was barely half right. The
    // number was true and still worth removing: it invited a comparison against
    // something the child has no way to name.
    const code = strip('src/components/OverlapLayer.tsx')

    expect(code.includes('AgreementBar')).toBeFalsy()
    expect(code.includes('agreement')).toBeFalsy()
    expect(code.includes('coverage')).toBeFalsy()
    expect(code.includes('pct')).toBeFalsy()
    // The sign itself, allowing for the modulo operator that walks an array.
    expect(code.replace(/\s%\s/g, ' mod ').includes('%')).toBeFalsy()
  })

  it('does not print a percentage anywhere on the board', () => {
    // ' % ' is the modulo operator walking an array, not a printed percentage.
    for (const path of [
      'src/modes/CongruenceStage.tsx',
      'src/components/Toast.tsx',
      'src/components/verdictText.ts',
      'src/components/BoardShapeView.tsx',
      'src/components/StackedOverlay.tsx',
    ]) {
      const code = strip(path)
      expect(code.includes('pct')).toBeFalsy()
      expect(/%[^)\s=]/.test(code)).toBeFalsy()
    }
  })

  it('still says plainly whether they coincide', () => {
    // Removing the number must not leave the child without an answer. The region
    // carries it: amber while the shapes only partly agree, teal when they
    // coincide. No outline of its own — both shapes are already outlined
    // underneath, and every attempt at a second one drew seams across the middle.
    const layer = strip('src/components/OverlapLayer.tsx')
    expect(layer.includes('coincident')).toBeTruthy()
    expect(layer.includes('strokeDasharray')).toBeFalsy()
    expect(layer.includes('rgba(42, 157, 143')).toBeTruthy()
  })

  it('distinguishes full from partial overlap by colour alone', () => {
    const layer = strip('src/components/OverlapLayer.tsx')
    expect(layer.includes('coincident')).toBeTruthy()
    // two fills, no stroke: partial reads as amber, complete as teal
    expect(layer.includes('rgba(233, 196, 106')).toBeTruthy()
    expect(layer.includes('stroke')).toBeFalsy()
  })

  it('computes overlap from real geometry', () => {
    expect(source('src/geometry/overlap.ts').includes('intersectPolygons')).toBeTruthy()
    expect(source('src/geometry/overlap.ts').includes('polygonCentroid')).toBeTruthy()
  })

  it('requires both congruence and coincidence', () => {
    const pairs = source('src/geometry/pairs.ts')
    expect(pairs.includes('sameCongruence')).toBeTruthy()
    expect(pairs.includes('fullyCovered')).toBeTruthy()
  })

  it('components do not decide congruence', () => {
    const parts = source('src/components/BoardShapeView.tsx')
    expect(parts.includes('checkCongruence')).toBeFalsy()
    expect(parts.includes('judge(')).toBeFalsy()
  })
})

describe('the wording matches the teaching', () => {
  // The sentences live in verdictText.ts, which decides what is said. The screen
  // draws what it is handed and must not restate the verdict in its own markup.
  const words = source('src/components/verdictText.ts')

  it('states the verdict', () => {
    expect(words.includes(expected.board.congruentMsg)).toBeTruthy()
  })

  it('teaches that direction does not matter', () => {
    expect(words.includes(expected.board.directionMsg)).toBeTruthy()
  })

  it('names the size trap without giving the answer away', () => {
    expect(words.includes(expected.board.sizeTrap)).toBeTruthy()
  })

  it('says a turn happened, not which way to turn', () => {
    // "돌려서 겹쳤어" reports that the system turned it. It must not say 90 or
    // 270, because then the child is being told the answer to the next question.
    expect(words.includes('돌려서 겹쳤어')).toBeTruthy()
    expect(/[0-9]+\s*도/.test(words)).toBeFalsy()
  })

  it('says a flip happened when the turn included one', () => {
    // A mirror pair lands by turning over, not by spinning round, and "돌려서"
    // would say what is false. The verdict carries the flip only until the
    // landing — past it the match reads match-direct with no solution left —
    // so the screen remembers the flip the same way it remembers the turn.
    const said = (v: { verdict: 'match-direct' | 'match-by-turn' | 'match-by-turn-and-flip'; solution: { degrees: number; flipped: boolean; center: { x: number; y: number } } | null }, turned: boolean, flipped: boolean) =>
      congruenceMessageFor({ coverage: 1, coincident: true, ...v }, turned, 0, 5, flipped)
        .parts?.map((p) => p.text)
        .join('')
    // before the landing the solution itself says it
    expect(
      said({ verdict: 'match-by-turn-and-flip', solution: { degrees: 90, flipped: true, center: { x: 0, y: 0 } } }, false, false),
    ).toBe('뒤집어서 겹쳤어! 합동이야')
    // past the landing only the remembered flip says it
    expect(
      said({ verdict: 'match-direct', solution: null }, true, true),
    ).toBe('뒤집어서 겹쳤어! 합동이야')
    // and a plain spin, or no turn at all, keeps the old words
    expect(
      said({ verdict: 'match-by-turn', solution: { degrees: 90, flipped: false, center: { x: 0, y: 0 } } }, false, false),
    ).toBe('돌려서 겹쳤어! 합동이야')
    expect(said({ verdict: 'match-direct', solution: null }, false, false)).toBe('겹쳤어! 합동이야')
    const stage = source('src/modes/CongruenceStage.tsx')
    expect(stage.includes('setFlipped(verdict.solution.flipped)')).toBeTruthy()
  })

  it('the wording lives in one place, not in the screen markup', () => {
    expect(source('src/modes/CongruenceStage.tsx').includes(expected.board.congruentMsg)).toBeFalsy()
  })
})

describe('the board is twelve shapes', () => {
  it('lays out twelve', () => {
    expect(buildBoard().length).toBe(12)
  })
})

// ── the correspondence stage ──────────────────────────────
//
// A build is not a render, and neither is a bundle check. The correspondence
// screen was bundled, type-checked and verified with every string present in the
// artefact, and still needed this: nothing here has ever mounted the stage. A
// screen that throws on its first render produces no markup and no error the
// bundle checks can see.

describe('correspondence stage renders', () => {
  const html = renderToStaticMarkup(<CorrespondenceStage onBack={() => {}} />)

  it('produces markup', () => {
    // Not a byte count for its own sake: below this the screen has lost its
    // chrome. The pieces are each checked on their own further down.
    expect(html.length > 900 ? 'ok' : html.length + ' bytes').toBe('ok')
  })

  it('shows its title', () => {
    expect(html.includes(expected.corr.stageTitle)).toBeTruthy()
  })

  it('counts which figure is up, the way the congruence board counts', () => {
    // The congruence header keeps "n / m" on the right; every other header
    // keeps one too. Here the work comes in figures, so it is the figure's
    // number — the first of three before anything is answered.
    expect(html.includes('1 / 3')).toBeTruthy()
  })

  it('offers a fresh start next to the way back', () => {
    expect(html.includes('↺ 처음부터')).toBeTruthy()
  })

  it('draws both shapes and labels them', () => {
    expect(html.includes(expected.corr.firstShape)).toBeTruthy()
    expect(html.includes(expected.corr.secondShape)).toBeTruthy()
    // two filled outlines, which is one shape per side
    expect((html.match(/class="corr-shape/g) || []).length).toBe(2)
  })

  it('asks for the first correspondence, as a popup', () => {
    // The bottom line is gone: each pass opens with its ask over the panel.
    const hook = source('src/modes/useCorrespondence.ts')
    expect(hook.includes('pass.step === 0')).toBeTruthy()
    expect(html.includes('corr-instruction') ? 'bottom line is back' : 'ok').toBe('ok')
  })

  it('lights a point on the left shape and offers a target on the right', () => {
    // one lit point on the left, one tap target on the right, and nothing else
    expect((html.match(/class="corr-target"/g) || []).length).toBe(1)
    expect((html.match(/class="corr-tap"/g) || []).length).toBe(3)
  })

  /*
   * A right answer has to show itself.
   *
   * The marks used to be drawn only once a whole pass had finished, so a child
   * who tapped all three points of the triangle correctly ended up looking at a
   * screen indistinguishable from the one they started on: nothing said they were
   * right except the highlight jumping somewhere else. Nothing is found yet on
   * the first question, so a fresh pair of marks here is the whole difference
   * between "you got it" and silence.
   */
  it('has nothing marked before anything has been found', () => {
    expect(html.includes('corr-mark')).toBeFalsy()
    expect(html.includes('corr-fresh')).toBeFalsy()
  })

  it('will mark a pair the moment one is found', () => {
    // The layers have to be rendered from a found set rather than a phase, or
    // the mark cannot appear until the pass is over. Checked in the source
    // because the state that drives it lives in the hook. The marks themselves
    // are shared with the line-symmetry board, so they take index sets: side by
    // side the set is always a prefix, folded over an axis it is the pairs found
    // so far — and never a word about which phase is running.
    const marks = source('src/components/CorrMarks.tsx')
    expect(marks.includes('points: number[]')).toBeTruthy()
    expect(marks.includes('sides: number[]')).toBeTruthy()
    expect(marks.includes('angles: number[]')).toBeTruthy()
    expect(/phase/.test(marks) ? 'the marks decide by phase' : 'ok').toBe('ok')
    const scene = source('src/components/CorrespondenceScene.tsx')
    expect(scene.includes('range(')).toBeTruthy()
    const folded = source('src/components/SymmetryPartsScene.tsx')
    expect(folded.includes('asked.slice(0, step)')).toBeTruthy()
  })

  it('gives every target a corner to aim at', () => {
    // The tap targets are invisible, so a target with no coordinate is a target
    // that cannot be pressed. cx is required for a circle to exist at all.
    const circles = html.match(/<circle[^>]*class="corr-tap"[^>]*>/g) || []
    expect(circles.length).toBe(3)
    for (const c of circles) {
      expect(/cx="-?[\d.]+"/.test(c) ? 'ok' : c).toBe('ok')
      expect(/r="[\d.]+"/.test(c) ? 'ok' : c).toBe('ok')
    }
  })

  it('offers its pairs in order, with no picking', () => {
    // One pair on screen at a time, each finished pair leading to the next:
    // choosing its own order let a jump to the last pair end the unit with the
    // others untouched, so the picker is gone and the way on is the only door.
    expect(html.includes('corr-pairs') ? 'the picker is still there' : 'ok').toBe('ok')
    const stage = source('src/modes/CorrespondenceStage.tsx')
    expect(stage.includes('onClick={c.nextPair}')).toBeTruthy()
  })

  it('quotes no length and no angle size', () => {
    // The claim is made by the fit, not by a reading. A degree belongs to a later
    // unit in fifth grade, and a figure the child cannot produce with their own
    // hands is one they can only be told. The pair notes used to read "90도 돌린
    // 삼각형", which put a degree into the unit without teaching the unit.
    expect(/[0-9]+\s*도/.test(html)).toBeFalsy()
    expect(/[0-9]+\s*(cm|mm|px)/.test(html)).toBeFalsy()
  })

  it('has no turn control', () => {
    expect(/onRotate|onFlip|돌리기|뒤집기/.test(html)).toBeFalsy()
  })
})

// ── the end of a unit ─────────────────────────────────────
//
// A unit ending in silence is a unit that has not said it finished. The star
// burst is over in a second and a half — a flash, not an ending — and the header
// back arrow reads as navigation rather than as the end of something. So each
// unit states its own lesson and offers an unmistakable way back to the start.

describe('a cleared unit ends properly', () => {
  const words = congruenceDonePanelFor()
  const html = renderToStaticMarkup(
    <DonePanel
      title={words.title}
      note={words.note}
      homeLabel={words.homeLabel}
      againLabel={words.againLabel}
      onHome={() => {}}
      onAgain={() => {}}
    />,
  )

  it('says the unit is finished', () => {
    expect(html.includes('모두 찾았어!')).toBeTruthy()
  })

  it('names what was learned, not just that it went well', () => {
    // The note is the one thing worth saying at the end: it is the lesson in a
    // sentence the child can repeat back. "잘했어요" says nothing about what was
    // learned, and praise where the content should be is praise as filler.
    expect(words.note).toBe(expected.home.congruenceNote)
    for (const filler of ['잘했', '대박', '최고', '짝수', '점수']) {
      expect(words.note.includes(filler) ? `note is only praise: ${filler}` : 'ok').toBe('ok')
    }
  })

  it('offers a way back to the first screen', () => {
    expect(html.includes(expected.home.homeLabel)).toBeTruthy()
    expect(html.includes('<button')).toBeTruthy()
  })

  it('still offers a replay', () => {
    // Not asked for, but removing the existing reset would have been a quiet loss
    // rather than a decision, so it stays and is now stated.
    expect(html.includes('처음부터')).toBeTruthy()
  })

  it('spins the ending star, after it pops in', () => {
    // The star turns once it has arrived: the spin waits out the pop, and with
    // no backwards fill it touches nothing until its delay has run — while
    // both run the later one would win and the pop would never show.
    const ui = source('src/styles/ui.css')
    expect(/\.done__mark\s*\{[^}]*done-spin/.test(ui)).toBeTruthy()
    expect(/@keyframes done-spin[^]*to\s*\{\s*transform:\s*rotate\(360deg\)/.test(ui)).toBeTruthy()
  })

  it('both units name their own lesson', () => {
    expect(congruenceDonePanelFor().note).toBe(expected.home.congruenceNote)
    expect(corrDonePanelFor().note).toBe(expected.home.corrNote)
    expect(congruenceDonePanelFor().note === corrDonePanelFor().note).toBeFalsy()
  })
})

// ── where a message is allowed to appear ──────────────────
//
// Success used to arrive as a strip along the top. That is the worst place for it
// twice over: the child has just stacked a shape, so their eyes are on the board
// and not up at the top edge — which on a tablet held upright may not be on screen
// at all. It also fought the stars, which burst from the middle for that same
// answer, so one reaction had its two halves at opposite ends of the screen.

describe('a success is in the middle, not at the top', () => {
  function source(path: string): string {
    return readFileSync(join(process.cwd(), path), 'utf8')
  }

  const html = renderToStaticMarkup(<Toast icon="⭐" text="겹쳤어! 합동이야" />)

  it('is a live region, so it is announced as well as shown', () => {
    expect(html.includes('role="status"')).toBeTruthy()
    expect(html.includes('겹쳤어!')).toBeTruthy()
  })

  it('is fixed to the top of its panel, clear of the hands', () => {
    // The popup lives at the top of the canvas panel, not the window: every
    // screen renders it as the first child of .canvas-wrap.
    for (const screen of [
      'src/modes/CongruenceStage.tsx',
      'src/modes/CorrespondenceStage.tsx',
      'src/modes/AxisBoard.tsx',
      'src/modes/PartsBoard.tsx',
      'src/modes/FactsBoard.tsx',
      'src/modes/DrawBoard.tsx',
      'src/modes/CenterBoard.tsx',
      'src/modes/PointPartsBoard.tsx',
      'src/modes/PointFactsBoard.tsx',
      'src/modes/PointDrawBoard.tsx',
    ]) {
      expect(source(screen).includes('<div className="canvas-wrap">')).toBeTruthy()
    }
    const ui = source('src/styles/ui.css')
    expect(/\.canvas-wrap\s*\{[^}]*position:\s*relative/.test(ui)).toBeTruthy()
    expect(/\.toast\s*\{[^}]*position:\s*absolute/.test(ui)).toBeTruthy()
    expect(/\.toast\s*\{[^}]*top:\s*10px/.test(ui)).toBeTruthy()
    expect(/\.toast\s*\{[^}]*top:\s*50%/.test(ui) ? 'still in the middle' : 'ok').toBe('ok')
  })

  it('shares the ending popup\'s shape, so the two look like one kind of event', () => {
    const ui = source('src/styles/ui.css')
    const toast = /\.toast\s*\{([^}]*)\}/.exec(ui)![1]
    const card = /\.done__card\s*\{([^}]*)\}/.exec(ui)![1]
    const value = (block: string, property: string) =>
      new RegExp(property + ':\\s*([^;]+)').exec(block)![1].trim()

    for (const property of ['background', 'border-radius']) {
      const a = value(toast, property)
      const b = value(card, property)
      expect(a === b ? 'ok' : `${property}: toast ${a} vs card ${b}`).toBe('ok')
    }

    // The shadow is compared on its geometry, not its alpha: the ending sits on a
    // dimmed backdrop and the toast on the live board, so the same shadow wants a
    // slightly different opacity there. Same offset, blur and spread is what makes
    // them read as the same kind of card.
    const geometry = (block: string) => value(block, 'box-shadow').split('rgba')[0].trim()
    expect(
      geometry(toast) === geometry(card) ? 'ok' : `shadow: ${geometry(toast)} vs ${geometry(card)}`,
    ).toBe('ok')
  })

  it('does not dim the board behind it', () => {
    // The ending stops the board, so it dims it. A success does not: the child
    // carries straight on, and a backdrop would swallow the taps.
    const ui = source('src/styles/ui.css')
    const toast = /\.toast\s*\{([^}]*)\}/.exec(ui)![1]
    expect(toast.includes('background: rgba') ? 'toast dims the board' : 'ok').toBe('ok')
    expect(toast.includes('pointer-events: none')).toBeTruthy()
  })

  it('every screen shows at most one popup at a time', () => {
    // CorrespondenceStage once rendered the toast twice — once above the pair
    // picker and once inside the panel — so the opening ask arrived doubled.
    for (const stage of [
      'src/modes/CongruenceStage.tsx',
      'src/modes/CorrespondenceStage.tsx',
      'src/modes/AxisBoard.tsx',
      'src/modes/PartsBoard.tsx',
      'src/modes/FactsBoard.tsx',
      'src/modes/DrawBoard.tsx',
      'src/modes/CenterBoard.tsx',
      'src/modes/PointPartsBoard.tsx',
      'src/modes/PointFactsBoard.tsx',
      'src/modes/PointDrawBoard.tsx',
    ]) {
      const code = source(stage)
      const renders = (code.match(/<Toast \{/g) || []).length
      expect(renders === 1 ? 'ok' : `${stage} renders ${renders} toasts`).toBe('ok')
    }
  })

  it('both units send every message to it', () => {
    for (const stage of [
      'src/modes/CongruenceStage.tsx',
      'src/modes/CorrespondenceStage.tsx',
      // the symmetry unit's boards each say it, so the rule is checked on all of them
      'src/modes/AxisBoard.tsx',
      'src/modes/PartsBoard.tsx',
      'src/modes/FactsBoard.tsx',
      'src/modes/DrawBoard.tsx',
    ]) {
      const code = source(stage)
      expect(code.includes('<Toast')).toBeTruthy()
      // and no screen re-decides which tone goes where
      expect(/tone === 'success'/.test(code)).toBeFalsy()
      expect(/tone !== 'neutral'/.test(code)).toBeFalsy()
    }
  })

  it('nothing is said in a strip along the top', () => {
    // The strip repeated the toolbar and the header, and sat above the shapes
    // rather than in them. Both units now say everything over the board instead.
    const styles = readdirSync(join(process.cwd(), 'src', 'styles'))
      .filter((f) => f.endsWith('.css'))
      .map((f) => readFileSync(join(process.cwd(), 'src', 'styles', f), 'utf8'))
      .join('\n')

    for (const stage of [
      'src/modes/CongruenceStage.tsx',
      'src/modes/CorrespondenceStage.tsx',
      'src/modes/AxisBoard.tsx',
    ]) {
      expect(source(stage).includes('banner')).toBeFalsy()
    }
    expect(styles.includes('.banner')).toBeFalsy()
  })

  it('each unit says what to do, over the panel', () => {
    /*
     * The bottom lines are gone everywhere: every ask now crosses the top of
     * the panel as a popup instead, so nothing competes with the shapes.
     */
    const board = renderToStaticMarkup(<CongruenceStage onBack={() => {}} />)
    expect(board.includes('stage1-hint') ? 'bottom line is back' : 'ok').toBe('ok')

    const corr = renderToStaticMarkup(<CorrespondenceStage onBack={() => {}} />)
    expect(corr.includes('corr-instruction') ? 'bottom line is back' : 'ok').toBe('ok')
    // and it is not up in a strip
    expect(corr.includes('banner')).toBeFalsy()
  })

  it('a success does not last forever', () => {
    /*
     * One hook holds this rule for both units. It used to be asserted against
     * `useToast`, which no longer exists — the point of folding it into
     * `useStageMessage` was that there is exactly one place a message decides
     * to leave, so this now checks that place.
     */
    const hook = source('src/modes/useStageMessage.ts')
    expect(/POPUP_MS/.test(hook)).toBeTruthy()
    expect(/window\.setTimeout/.test(hook)).toBeTruthy()
    // and nothing brings the old one back
    expect(existsSync(join(process.cwd(), 'src/modes/useToast.ts'))).toBeFalsy()
  })

  it('lets a popup leave even when its message object is rebuilt', () => {
    // Every screen builds a fresh message object on every render. Depending on
    // that object would reset the timer on every render, so the opening popup
    // stayed up forever instead of seven seconds.
    const hook = source('src/modes/useStageMessage.ts')
    expect(/\[\s*key\s*,\s*duration\s*\]/.test(hook)).toBeTruthy()
    expect(/GUIDE_MS/.test(hook)).toBeTruthy()
    // the success popup stays up for the guide's own life so it can be read,
    // unless the message names its own time — the ending sentences do
    expect(/message\.ms \?\? \(guide \? GUIDE_MS : ms\)/.test(hook)).toBeTruthy()
  })
})

// ── the symmetry stage ──────────────────────────────
//
// A build is not a render, and neither is a bundle check. A screen that throws
// on its first render produces no markup and no error the bundle checks can
// see — which is exactly what this guards, now that three screens mount.

describe('symmetry rows render', () => {
  const axis = renderToStaticMarkup(<SymmetryAxisStage onBack={() => {}} />)
  const parts = renderToStaticMarkup(<SymmetryPartsStage onBack={() => {}} />)
  const facts = renderToStaticMarkup(<SymmetryFactsStage onBack={() => {}} />)
  const draw = renderToStaticMarkup(<SymmetryDrawStage onBack={() => {}} />)

  it('produces markup', () => {
    // A thousand bytes would fail the parts row for being small: before the
    // first answer its board is one shape, one axis and one walk, and that is
    // all it should be.
    for (const [name, html] of Object.entries({ axis, parts, facts, draw })) {
      expect(html.length > 900 ? 'ok' : name + ': ' + html.length + ' bytes').toBe('ok')
    }
  })

  it('shows its title', () => {
    expect(axis.includes(expected.symm.axisTitle)).toBeTruthy()
    expect(parts.includes(expected.symm.partsTitle)).toBeTruthy()
    expect(facts.includes(expected.symm.factsTitle)).toBeTruthy()
    expect(draw.includes(expected.symm.drawTitle)).toBeTruthy()
  })

  it('counts settled boards in the header, the way the congruence board counts', () => {
    // Nothing settled on a fresh row, so every row opens on zero — over its
    // own board count, the way "0 / 5" opens the congruence board.
    expect(axis.includes('0 / 5')).toBeTruthy()
    expect(parts.includes('0 / 1')).toBeTruthy()
    expect(facts.includes('0 / 1')).toBeTruthy()
    expect(draw.includes('0 / 3')).toBeTruthy()
  })

  it('offers a fresh start next to the way back', () => {
    for (const [name, markup] of Object.entries({ axis, parts, facts, draw })) {
      expect(markup.includes('↺ 처음부터') ? 'ok' : name + ' has no reset').toBe('ok')
    }
  })

  it('draws one shape and asks over the panel', () => {
    expect((axis.match(/class="sym-shape"/g) || []).length).toBe(1)
    // The bottom line is gone: the first ask is a popup, checked in the hook.
    const hook = source('src/modes/useSymmetry.ts')
    expect(hook.includes('attempts === 0')).toBeTruthy()
    expect(axis.includes('sym-instruction') ? 'bottom line is back' : 'ok').toBe('ok')
  })

  it('draws no axis before one has been drawn', () => {
    // The axis layer must start empty: a line on screen before the finger has
    // moved would be an answer the child never gave.
    expect(axis.includes('sym-axis')).toBeFalsy()
    expect(axis.includes('sym-draft')).toBeFalsy()
    expect(axis.includes('sym-fold')).toBeFalsy()
  })

  it('runs its boards in order, with no jumping', () => {
    // One board on screen at a time, each finished board leading to the next:
    // jumping ahead let the last board end the row with the rest untouched, so
    // the board picker is gone and the header counter is the only progress.
    expect(axis.includes('sym-boards') ? 'the picker is still there' : 'ok').toBe('ok')
    expect(facts.includes('startAt(i)') ? 'jumping is still there' : 'ok').toBe('ok')
    expect(draw.includes('startAt(i)') ? 'jumping is still there' : 'ok').toBe('ok')
    // and the run is the whole unit, in the textbook's order
    expect(source('src/geometry/symmetryShapes.ts').includes('SYMM_BOARDS: SymmetryBoard[]')).toBeTruthy()
  })

  it('quotes no length and no angle size', () => {
    expect(/[0-9]+\s*도/.test(axis)).toBeFalsy()
    expect(/[0-9]+\s*(cm|mm|px)/.test(axis)).toBeFalsy()
  })

  it('has no turn control', () => {
    expect(/onRotate|onFlip|돌리기|뒤집기/.test(axis)).toBeFalsy()
  })
})

describe('point-symmetry rows render', () => {
  const axis = renderToStaticMarkup(<SymmetryPointAxisStage onBack={() => {}} />)
  const parts = renderToStaticMarkup(<SymmetryPointPartsStage onBack={() => {}} />)
  const facts = renderToStaticMarkup(<SymmetryPointFactsStage onBack={() => {}} />)
  const draw = renderToStaticMarkup(<SymmetryPointDrawStage onBack={() => {}} />)

  it('produces markup', () => {
    for (const [name, html] of Object.entries({ axis, parts, facts, draw })) {
      expect(html.length > 900 ? 'ok' : name + ': ' + html.length + ' bytes').toBe('ok')
    }
  })

  it('shows its title', () => {
    expect(axis.includes(expected.ptsym.axisTitle)).toBeTruthy()
    expect(parts.includes(expected.ptsym.partsTitle)).toBeTruthy()
    expect(facts.includes(expected.ptsym.factsTitle)).toBeTruthy()
    expect(draw.includes(expected.ptsym.drawTitle)).toBeTruthy()
  })

  it('counts settled boards in the header, the way the congruence board counts', () => {
    expect(axis.includes('0 / 5')).toBeTruthy()
    expect(parts.includes('0 / 1')).toBeTruthy()
    expect(facts.includes('0 / 1')).toBeTruthy()
    expect(draw.includes('0 / 1')).toBeTruthy()
  })

  it('offers a fresh start next to the way back', () => {
    for (const [name, markup] of Object.entries({ axis, parts, facts, draw })) {
      expect(markup.includes('↺ 처음부터') ? 'ok' : name + ' has no reset').toBe('ok')
    }
  })

  it('draws one shape and asks over the panel', () => {
    expect((axis.match(/class="sym-shape"/g) || []).length).toBe(1)
    const hook = source('src/modes/usePointSymmetry.ts')
    expect(hook.includes('attempts === 0')).toBeTruthy()
    expect(axis.includes('sym-instruction') ? 'bottom line is back' : 'ok').toBe('ok')
  })

  it('turns no copy before one has been tapped', () => {
    // The turning layer must start empty: a copy on screen before the finger
    // has moved would be an answer the child never gave.
    expect(axis.includes('sym-turn')).toBeFalsy()
    expect(axis.includes('sym-hub')).toBeFalsy()
  })

  it('runs its boards in order, with no jumping', () => {
    expect(axis.includes('sym-boards') ? 'the picker is still there' : 'ok').toBe('ok')
    expect(facts.includes('startAt(i)') ? 'jumping is still there' : 'ok').toBe('ok')
    expect(draw.includes('startAt(i)') ? 'jumping is still there' : 'ok').toBe('ok')
  })

  it('quotes no length and no angle size', () => {
    expect(/[0-9]+\s*도/.test(axis)).toBeFalsy()
    expect(/[0-9]+\s*(cm|mm|px)/.test(axis)).toBeFalsy()
  })
})

const { report } = await import('../harness/spec.mjs')
report()