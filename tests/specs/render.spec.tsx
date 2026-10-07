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
import { BASIC_SHAPES, findShape } from '../../src/geometry/shapes'

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
    // choosing shapes before playing was the mistake; the board supplies them
    expect(html.includes('role="radiogroup"')).toBeFalsy()
  })
})

// ── the board ────────────────────────────────────────────
describe('congruence board renders', () => {
  const sq = findShape('square')!
  const tri = findShape('triangle')!
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

  it('draws every board shape as a path', () => {
    expect((html.match(/<path/g) ?? []).length >= 8).toBeTruthy()
  })

  it('prints a hangul syllable under each shape', () => {
    const syllables = (html.match(/<text/g) ?? []).length
    expect(syllables >= 8).toBeTruthy()
  })

  it('offers rotate and flip', () => {
    expect(html.includes(expected.stack.tools[1])).toBeTruthy()
    expect(html.includes(expected.stack.tools[2])).toBeTruthy()
  })

  it('disables the tools until a shape is held', () => {
    // an enabled button that does nothing teaches nothing
    expect(html.includes('disabled')).toBeTruthy()
  })

  it('counts progress toward the goal', () => {
    expect(html.includes('0 / 3')).toBeTruthy()
  })

  it('tells the child to drag a shape', () => {
    expect(html.includes(expected.stack.dragHint)).toBeTruthy()
  })

  it('disables touch panning so dragging does not scroll a tablet', () => {
    // a tablet must not scroll the page while a child drags a shape;
    // renderToStaticMarkup drops style attributes, so check the source
    const parts = source('src/components/BoardParts.tsx')
    expect(parts.includes('touchAction')).toBeTruthy()
    expect(/touch-action:\s*none/.test(source('src/index.css'))).toBeTruthy()
  })
})

describe('the board shows overlap rather than asserting it', () => {
  it('renders the shared region', () => {
    expect(source('src/components/OverlapLayer.tsx').includes('intersection')).toBeTruthy()
    // the geometry behind it lives in the hook, not the component
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
  })

  it('requires both congruence and coincidence', () => {
    // overlap alone would accept a small shape resting inside a large one
    const pairs = source('src/geometry/pairs.ts')
    expect(pairs.includes('sameCongruence')).toBeTruthy()
    expect(pairs.includes('fullyCovered')).toBeTruthy()
  })

  it('components do not decide congruence', () => {
    // enforced by conventions.spec too; this pins the intent
    const parts = source('src/components/BoardParts.tsx')
    expect(parts.includes('checkCongruence')).toBeFalsy()
    expect(parts.includes('measureOverlap(')).toBeFalsy()
  })
})

describe('the wording matches the teaching', () => {
  it('says 합동 rather than only praising', () => {
    expect(source('src/modes/CongruenceStage.tsx').includes(expected.stack.congruentMsg)).toBeTruthy()
  })

  it('teaches that direction does not matter', () => {
    const stage = source('src/modes/CongruenceStage.tsx')
    expect(stage.includes(expected.stack.directionMsg)).toBeTruthy()
  })
})

const { report } = await import('../harness/spec.mjs')
report()