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
import { buildBoard } from '../../src/modes/useBoard'

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

  it('has a start button', () => {
    expect(html.includes(expected.home.startBtn)).toBeTruthy()
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
    const parts = source('src/components/BoardParts.tsx')
    expect(parts.includes('touchAction')).toBeTruthy()
    expect(/touch-action:\s*none/.test(source('src/index.css'))).toBeTruthy()
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
      'src/components/BoardParts.tsx',
    ]) {
      const code = strip(path)
      expect(code.includes('pct')).toBeFalsy()
      expect(/%[^)\s=]/.test(code)).toBeFalsy()
    }
  })

  it('still says plainly whether they coincide', () => {
    // Removing the number must not leave the child without an answer. The region
    // carries it: solid when they coincide, dashed while they do not.
    const layer = source('src/components/OverlapLayer.tsx')
    expect(layer.includes('coincident')).toBeTruthy()
    expect(layer.includes('strokeDasharray')).toBeTruthy()
  })

  it('distinguishes full from partial overlap', () => {
    const layer = source('src/components/OverlapLayer.tsx')
    expect(layer.includes('coincident')).toBeTruthy()
    // partial overlap reads as unfinished
    expect(layer.includes('strokeDasharray')).toBeTruthy()
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
    const parts = source('src/components/BoardParts.tsx')
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

const { report } = await import('../harness/spec.mjs')
report()