/**
 * The night-sky theme.
 *
 * The theme is the look and nothing else. No board judges differently because of
 * it, no answer moves, and nothing the child places turns into a star. These
 * checks exist because both halves of that are easy to break quietly: a colour
 * swapped back to green, or a starlight mark left unreadable over a pale shape.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from '../harness/api'

const source = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')
const styleFiles = () => readdirSync(join(process.cwd(), 'src/styles'))

/** the channels of a #rrggbb token, so a colour can be asked a question */
function channels(token: string): number[] {
  const match = source('src/styles/base.css').match(new RegExp(`${token}:\\s*#([0-9a-f]{6})`, 'i'))
  const hex = match ? parseInt(match[1], 16) : 0
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]
}

describe('the app is drawn on a night sky', () => {
  it('the background is night, not day', () => {
    // Everything else in the theme is read against this one: the starlight is
    // only the brightest thing on screen while the board stays dark.
    const [r, g, b] = channels('--color-bg')
    expect(Math.max(r, g, b) < 80).toBe(true)
  })

  it('the sky behind the work carries a very faint star field', () => {
    // Four dots repeated by one tile rather than a hundred positions: a sky to
    // look past, not something to look at, and nothing bright enough to pull the
    // eye off a shape.
    const base = source('src/styles/base.css')
    expect((base.match(/radial-gradient/g) || []).length >= 3).toBeTruthy()
    expect(base).toContain('background-size')
    expect(base).toContain('background-repeat')
  })

  it('the grid is a faint line on the paper, not a dark line on white', () => {
    const base = source('src/styles/base.css')
    expect(/--grid-line:\s*rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0?\.\d+\s*\)/.test(base)).toBeTruthy()
    expect(source('src/components/BoardGrid.tsx')).toContain('var(--grid-line)')
  })
})

describe('the board a child works on is white paper', () => {
  it('the night sky never covers it', () => {
    /*
     * The one surface the theme keeps light. Shapes belong on paper with the
     * grid faint behind them, so the board is the one card that is not glass —
     * and every board in the app is wrapped in that one class, which is what
     * makes "the board" a single thing to get right.
     */
    expect(source('src/styles/base.css')).toContain('--paper')
    expect(/\.canvas-wrap\s*\{[^}]*var\(--paper\)/.test(source('src/styles/ui.css'))).toBeTruthy()
    for (const stage of readdirSync(join(process.cwd(), 'src/modes'))) {
      if (!stage.endsWith('.tsx')) continue
      if (source(`src/modes/${stage}`).includes('<svg')) {
        expect(source(`src/modes/${stage}`).includes('canvas-wrap')).toBeTruthy()
      }
    }
  })

  it('the popup that sits on the board is paper too', () => {
    // It is a card over the paper, so it lifts off it by shadow rather than by
    // being a different night.
    const ui = source('src/styles/ui.css')
    expect(/\.toast\s*\{[^}]*var\(--paper\)/.test(ui)).toBeTruthy()
    expect(/\.done__card\s*\{[^}]*var\(--paper\)/.test(ui)).toBeTruthy()
  })

  it('a proved mark is gold on paper, because starlight on white is nothing', () => {
    // The same claim as the home screen's stars, at the strength paper can
    // read: pale yellow on white has no contrast, and a glow has nothing darker
    // to shine against.
    const base = source('src/styles/base.css')
    expect(base).toContain('--board-success')
    expect(/\.sym-join\s*\{[^}]*var\(--board-success\)/.test(source('src/styles/symmetry.css'))).toBeTruthy()
    expect(/\.corr-wedge\s*\{[^}]*var\(--board-success\)/.test(source('src/styles/correspondence.css'))).toBeTruthy()
    // and the popup emphasis says the same thing in the same strength
    expect(/\.done__title strong\s*\{[^}]*var\(--board-success\)/.test(source('src/styles/ui.css'))).toBeTruthy()
  })
})

describe('what has been proved is starlight', () => {
  it('the success colour is a pale yellow, and the old green is gone', () => {
    const [r, g, b] = channels('--color-success')
    expect(r > 240).toBe(true)
    expect(g > 200).toBe(true)
    expect(b < 180).toBe(true)
    for (const file of styleFiles()) {
      expect(source(`src/styles/${file}`)).not.toContain('#2a9d8f')
    }
  })

  it('the starlight is drawn on a dark rim so it reads over a pale shape', () => {
    /*
     * A proved mark sits across a pastel shape far more often than it sits on
     * the dark board, and pale yellow on pale yellow is nothing at all. The rim
     * gives the line its own edge on any fill; the glow spreads from there.
     */
    const glow = source('src/styles/base.css').match(/--glow-svg:\s*([^;]+);/s)?.[1] ?? ''
    expect(glow).toContain('drop-shadow')
    expect(/rgba?\(\s*4,\s*11,\s*21/.test(glow)).toBeTruthy()
    expect(/255,\s*224,\s*138/.test(glow)).toBeTruthy()
  })

  it('a shape keeps dark ink on its own fill, because the fill is the silhouette', () => {
    // On a night sky the pale fill already says where the shape is; a light
    // outline would only fight the fill it is supposed to hold together.
    expect(source('src/styles/base.css')).toContain('--ink-on-shape')
    expect(/\.sym-shape\s*\{[^}]*var\(--ink-on-shape\)/.test(source('src/styles/symmetry.css'))).toBeTruthy()
    expect(/\.corr-shape\s*\{[^}]*var\(--ink-on-shape\)/.test(source('src/styles/correspondence.css'))).toBeTruthy()
  })
})

describe('a point is still a point', () => {
  it('no board draws a star where the child places or finds something', () => {
    /*
     * The theme is the look around the work. Inside a board every mark means
     * something just proved, and a star there would be a shape pretending to be
     * a point — so the star lives on the home screen and nowhere else.
     */
    const boards = [
      'BoardGrid.tsx',
      'CenterScene.tsx',
      'CorrMarks.tsx',
      'PointDrawScene.tsx',
      'PointFactsScene.tsx',
      'SymmetryDrawScene.tsx',
      'SymmetryFactsScene.tsx',
      'SymmetryScene.tsx',
    ]
    for (const file of boards) {
      expect(source(`src/components/${file}`)).not.toContain('★')
    }
  })
})

const { report } = await import('../harness/spec.mjs')
report()