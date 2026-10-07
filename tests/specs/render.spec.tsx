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
  it('renders the shared region', () => {
    expect(source('src/components/OverlapLayer.tsx').includes('intersection')).toBeTruthy()
    expect(source('src/geometry/pairs.ts').includes('heldOverlap')).toBeTruthy()
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
  it('states the verdict', () => {
    expect(source('src/modes/CongruenceStage.tsx').includes(expected.board.congruentMsg)).toBeTruthy()
  })

  it('teaches that direction does not matter', () => {
    expect(source('src/modes/CongruenceStage.tsx').includes(expected.board.directionMsg)).toBeTruthy()
  })

  it('names the size trap without giving the answer away', () => {
    const stage = source('src/modes/CongruenceStage.tsx')
    expect(stage.includes(expected.board.sizeTrap)).toBeTruthy()
  })
})

describe('the board is twelve shapes', () => {
  it('lays out twelve', () => {
    expect(buildBoard().length).toBe(12)
  })
})

const { report } = await import('../harness/spec.mjs')
report()