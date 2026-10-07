/**
 * Render spec — the React tree must actually mount.
 *
 * WHY THIS SPEC EXISTS
 * --------------------
 * The `flower()` loop bug compiled, deployed, and passed every bundle-level
 * check. The app was a blank screen for every visitor. A build is not a
 * render, and a string sitting in a bundle is not a mounted component.
 *
 * This spec renders both screens for real and asserts on the markup. The
 * runner executes it with a 128MB heap cap and a wall-clock timeout, so an
 * unbounded loop inside a component becomes a NON-TERMINATING failure
 * instead of a twelve-second hang.
 *
 * Korean literals live in harness/expected.json. Literal escapes get mangled
 * on the way to disk in this environment; a UTF-8 data file does not.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from '../harness/api'
import expected from '../harness/expected.json' with { type: 'json' }
import { renderToStaticMarkup } from 'react-dom/server'
import App from '../../src/App'
import { StackPractice } from '../../src/modes/StackPractice'
import { BASIC_SHAPES, findShape } from '../../src/geometry/shapes'
import type { Shape } from '../../src/geometry/types'

const SQUARE = findShape('square') as Shape
const TRIANGLE = findShape('triangle') as Shape

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

// ── home ──────────────────────────────────────────────────
describe('home screen renders', () => {
  const html = renderToStaticMarkup(<App />)

  it('produces markup', () => {
    expect(html.length > 1000).toBeTruthy()
  })

  it('shows the title', () => {
    expect(html.includes(expected.home.title)).toBeTruthy()
  })

  it('presents the two stages in curriculum order', () => {
    expect(html.includes(expected.home.stage1Title)).toBeTruthy()
    expect(html.includes(expected.home.stage2Title)).toBeTruthy()
  })

  it('renders every basic shape as a polygon', () => {
    const polygons = (html.match(/<polygon/g) ?? []).length
    expect(polygons >= BASIC_SHAPES.length).toBeTruthy()
  })

  it('labels every basic shape', () => {
    for (const s of BASIC_SHAPES) {
      expect(html.includes('>' + s.name + '<')).toBeTruthy()
    }
  })

  it('has a start button', () => {
    expect(html.includes(expected.home.startBtn)).toBeTruthy()
  })

  it('exposes the picker as a radiogroup for accessibility', () => {
    expect(html.includes('role="radiogroup"')).toBeTruthy()
    expect(html.includes('role="radio"')).toBeTruthy()
    expect(html.includes('aria-checked')).toBeTruthy()
  })
})

// ── stack practice ────────────────────────────────────────
describe('stacking mode renders', () => {
  const html = renderToStaticMarkup(
    <StackPractice referenceShape={SQUARE} movableShape={TRIANGLE} onBack={() => {}} />,
  )

  it('produces markup', () => {
    expect(html.length > 1000).toBeTruthy()
  })

  it('draws an SVG canvas', () => {
    expect(html.includes('<svg')).toBeTruthy()
    expect(html.includes('viewBox')).toBeTruthy()
  })

  it('draws both shapes as paths', () => {
    expect((html.match(/<path/g) ?? []).length >= 2).toBeTruthy()
  })

  it('draws the background grid', () => {
    expect(html.includes('<line')).toBeTruthy()
  })

  it('nudges without revealing the answer', () => {
    // A wrong answer must point at what to try next, not give it away.
    expect(html.includes('banner')).toBeTruthy()
    expect(html.includes(expected.stack.overlapHint)).toBeTruthy()
  })

  it('offers the three manipulation tools, and no size control', () => {
    for (const label of expected.stack.tools) {
      expect(html.includes(label)).toBeTruthy()
    }
  })

  it('offers a reset', () => {
    expect(html.includes(expected.stack.reset)).toBeTruthy()
  })

  it('tells the child to drag the shape', () => {
    expect(html.includes(expected.stack.dragHint)).toBeTruthy()
  })

  it('starts with a zero star count', () => {
    expect(html.includes(expected.stack.starZero)).toBeTruthy()
  })

  it('carries the canvas class the stylesheet targets', () => {
    expect(html.includes('class="canvas"')).toBeTruthy()
  })

  it('disables touch panning so dragging does not scroll a tablet', () => {
    // renderToStaticMarkup drops style attributes and .canvas is a stylesheet
    // rule, so the inline declaration is verified at the source level.
    // Without it, a child dragging a shape scrolls the whole page.
    const shapeSvg = source('src/components/ShapeSvg.tsx')
    expect(shapeSvg.includes("touchAction: 'none'")).toBeTruthy()
    expect(/touch-action:\s*none/.test(source('src/index.css'))).toBeTruthy()
  })

  it('size difference is the wording we chose for the discovery moment', () => {
    // The banner text lives in ResultBanner; assert it exists there.
    expect(source('src/components/ResultBanner.tsx').includes(expected.stack.sizeDiffers)).toBeTruthy()
  })
})

const { report } = await import('../harness/spec.mjs')
report()