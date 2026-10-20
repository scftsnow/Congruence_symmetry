/**
 * The night-sky theme.
 *
 * The theme is the look and nothing else. No board judges differently because of
 * it, no answer moves, and nothing the child places turns into a star. These
 * checks exist because both halves of that are easy to break quietly: a colour
 * swapped back to green, or a starlight mark left unreadable over a pale shape.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
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

  it('the milky way runs under the dots and never repeats', () => {
    /*
     * One wide soft band with a narrower heart, fixed diagonals that cover the
     * frame once. Listed after the dot tiles so the dots stay on top, and
     * unmoving — the blinking layers above are where the motion lives.
     */
    const base = source('src/styles/base.css')
    expect((base.match(/linear-gradient\(\s*112deg/g) || []).length >= 2).toBeTruthy()
    expect((base.match(/no-repeat/g) || []).length >= 2).toBeTruthy()
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

  it('the cover constellation is dots, not star glyphs either', () => {
    // The one place a starry shape belongs still draws plain dots: up here
    // nothing has been proved yet, so even the cover earns no ★.
    const cover = source('src/components/Constellation.tsx')
    expect(cover).not.toContain('★')
    expect(cover).toContain('<circle')
  })

  it('the cover holds famous constellations beside its turning rings', () => {
    /*
     * Cassiopeia's W, the Dipper's ladle and Orion's belt in their real shapes
     * — a sky with names in it, even if the names are never printed. The famous
     * three only twinkle and never turn (a Dipper hanging upside down would read
     * as broken); the two abstract rings keep the slow turning. The bright ones
     * wear halos and a harder shine, so a few stars read as near and the rest
     * as far.
     */
    const cover = source('src/components/Constellation.tsx')
    for (const name of ['cassiopeia', 'dipper', 'orion', 'great-ring', 'high-ring']) {
      expect(cover).toContain(`name="${name}"`)
    }
    expect(cover).toContain('constellation__halo')
    expect(cover).toContain('constellation__star--bright')
    const home = source('src/styles/home.css')
    expect(home).toContain('constellation__spin--back')
    expect(home).toContain('animation-direction: reverse')
  })
})

describe('the whole screen speaks in 별자리', () => {
  it('both subset weights ship with the app, and the licence with them', () => {
    // OFL lets the font travel inside the app as long as the licence travels
    // too and the file itself is never sold — which is exactly this shape:
    // two small subsets plus the licence text, no full originals.
    expect(existsSync(join(process.cwd(), 'src/assets/fonts/hakgyoansim-byeoljari-l.woff2'))).toBeTruthy()
    expect(existsSync(join(process.cwd(), 'src/assets/fonts/hakgyoansim-byeoljari-b.woff2'))).toBeTruthy()
    expect(existsSync(join(process.cwd(), 'public/fonts/OFL.txt'))).toBeTruthy()
  })

  it('the family is declared for swap and read first', () => {
    /*
     * Swap, because a child on a slow connection reads the fallback first and
     * the font when it arrives — never a blank title. First in the stack,
     * because "the whole screen" means the whole screen; a missing glyph falls
     * through to Pretendard rather than breaking.
     */
    const base = source('src/styles/base.css')
    expect((base.match(/@font-face/g) || []).length >= 2).toBeTruthy()
    expect(base).toContain("font-family: 'Hakgyoansim Byeoljari'")
    expect(base).toContain('font-display: swap')
    expect(/font-family:\s*'Hakgyoansim Byeoljari', 'Pretendard'/.test(base)).toBeTruthy()
  })
})

describe('the night breathes', () => {
  it('two star layers blink out of step with each other', () => {
    // One layer blinking is a flicker; two on different periods is weather. The
    // two share one rule, so the check reads the shared block rather than one
    // name — and that block lets the finger through, so the sky can never eat
    // a tap meant for a shape.
    const base = source('src/styles/base.css')
    expect(base).toContain('body::before')
    expect(base).toContain('body::after')
    expect(base).toContain('star-breathe')
    const shared = /body::before,\s*body::after\s*\{([^}]*)\}/.exec(base)?.[1] ?? ''
    expect(shared).toContain('position: fixed')
    expect(shared).toContain('pointer-events: none')
  })

  it('the cover ring turns once every two minutes, and rests when asked', () => {
    // Slow enough to be weather rather than motion — and stillness on request,
    // for a child sensitive to movement.
    const home = source('src/styles/home.css')
    expect(/constellation-turn\s+120s/.test(home)).toBeTruthy()
    expect(home).toContain('prefers-reduced-motion')
    expect(source('src/styles/base.css')).toContain('prefers-reduced-motion')
  })

  it('motes rise behind every screen, and never on the work', () => {
    /*
     * One sky everywhere: the layer is collected in the shell rather than in
     * each screen, so no screen can forget it. Strictly background — a negative
     * z-index under everything drawn, the finger passing through, gone entirely
     * on request — because a mote sitting on a shape would be a mark meaning
     * nothing. Fixed numbers, not random: the same sky on every visit.
     */
    const sky = source('src/components/SkyParticles.tsx')
    const count = Number(sky.match(/const COUNT = (\d+)/)?.[1] ?? 0)
    expect(count >= 80).toBeTruthy()
    expect(sky).toContain('aria-hidden')
    expect(sky).toContain('--sway')
    expect(sky).toContain('animationDelay')
    expect(source('src/App.tsx').includes('<SkyParticles />')).toBeTruthy()
    const home = source('src/styles/home.css')
    expect(/\.sky-particles\s*\{[^}]*z-index:\s*-1/.test(home)).toBeTruthy()
    expect(/\.sky-particles\s*\{[^}]*pointer-events:\s*none/.test(home)).toBeTruthy()
    expect(home).toContain('particle-rise')
  })
})

// ── the app does not scold ────────────────────────────────
describe('a miss is not a telling-off', () => {
  it('no sentence says the child is wrong', () => {
    /*
     * The app used to answer a wrong answer with "아직이네요" — not yet — and
     * that is being told off for trying. A child who presses a corner and hears
     * that has been scolded, and the board's own voice is better than that: it
     * says what to look for instead, and says nothing about being wrong.
     *
     * The check is on the code, with the comments stripped: a file is allowed
     * to explain the wording it used to have.
     */
    const files = [
      'src/components/corrText.ts',
      'src/components/symmPartsText.ts',
      'src/components/symmText.ts',
      'src/components/pointSymmPartsText.ts',
      'src/components/pointSymmText.ts',
    ]
    for (const file of files) {
      const body = source(file)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
      expect(body.includes('아직이네요') ? 'still scolding' : 'ok').toBe('ok')
    }
  })

  it('the hints still say what to look for', () => {
    // Removing the scolding must not leave the child with nothing: each hint
    // names the thing to compare.
    expect(source('src/components/corrText.ts')).toContain('빛나는 점과 모양이 꼭 닮은 점')
    expect(source('src/components/symmPartsText.ts')).toContain('축을 사이에 두고 마주 보는 점')
    expect(source('src/components/pointSymmPartsText.ts')).toContain('중심을 사이에 두고 마주 보는 점')
    expect(source('src/components/symmText.ts')).toContain('접었을 때 완전히 겹치는 선')
    expect(source('src/components/pointSymmText.ts')).toContain('돌렸을 때 완전히 겹치는 중심')
  })
})

const { report } = await import('../harness/spec.mjs')
report()