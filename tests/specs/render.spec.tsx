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

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from '../harness/api'
import expected from '../harness/expected.json' with { type: 'json' }
import { renderToStaticMarkup } from 'react-dom/server'
import App from '../../src/App'
import { CongruenceStage } from '../../src/modes/CongruenceStage'
import { CorrespondenceStage } from '../../src/modes/CorrespondenceStage'
import { buildBoard } from '../../src/modes/useBoard'
import { DonePanel } from '../../src/components/DonePanel'
import { donePanelFor } from '../../src/components/verdictText'
import { donePanelFor as corrDonePanelFor } from '../../src/components/corrText'

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

// ── home ──────────────────────────────────────────────────
describe('home screen renders', () => {
  const html = renderToStaticMarkup(<App />)

  it('produces markup', () => {
    expect(html.length > 500).toBeTruthy()
  })

  it('shows the title', () => {
    expect(html.includes(expected.home.title)).toBeTruthy()
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
    expect(rows.length >= 2 ? 'ok' : rows.length + ' rows').toBe('ok')
    expect(html.includes(expected.home.corrUnitTitle)).toBeTruthy()
  })

  it('has no second way into a unit', () => {
    expect(html.includes('시작하기')).toBeFalsy()
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

  it('tells the child to drag a shape', () => {
    expect(html.includes(expected.board.dragHint)).toBeTruthy()
  })

  it('says the shape will be matched automatically', () => {
    expect(html.includes(expected.board.autoMatch)).toBeTruthy()
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
      'src/components/VerdictBanner.tsx',
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
    expect(html.length > 1200 ? 'ok' : html.length + ' bytes').toBe('ok')
  })

  it('shows its title', () => {
    expect(html.includes(expected.corr.stageTitle)).toBeTruthy()
  })

  it('draws both shapes and labels them', () => {
    expect(html.includes(expected.corr.firstShape)).toBeTruthy()
    expect(html.includes(expected.corr.secondShape)).toBeTruthy()
    // two filled outlines, which is one shape per side
    expect((html.match(/class="corr-shape/g) || []).length).toBe(2)
  })

  it('asks for the first correspondence', () => {
    expect(html.includes(expected.corr.askPoint)).toBeTruthy()
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
    // The layers have to be rendered from a found count rather than a phase, or
    // the mark cannot appear until the pass is over. Checked in the source
    // because the state that drives it lives in the hook.
    const scene = source('src/components/CorrespondenceScene.tsx')
    expect(scene.includes('foundPoints')).toBeTruthy()
    expect(scene.includes('foundSides')).toBeTruthy()
    expect(scene.includes('foundAngles')).toBeTruthy()
    // and the marks must be sliced to that count, not gated on the phase
    expect(scene.includes('corr.vertices.slice(0, foundPoints)')).toBeTruthy()
    expect(scene.includes('corr.sides.slice(0, foundSides)')).toBeTruthy()
    expect(scene.includes("phase !== 'points' &&\n        corr.vertices.map")).toBeFalsy()
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

  it('offers all three pairs', () => {
    for (const note of expected.corr.pairNotes) {
      expect(html.includes(note)).toBeTruthy()
    }
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
  const words = donePanelFor()
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

  it('both units name their own lesson', () => {
    expect(donePanelFor().note).toBe(expected.home.congruenceNote)
    expect(corrDonePanelFor().note).toBe(expected.home.corrNote)
    expect(donePanelFor().note === corrDonePanelFor().note).toBeFalsy()
  })
})

const { report } = await import('../harness/spec.mjs')
report()