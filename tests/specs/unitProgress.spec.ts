/**
 * The stars on the home screen, and what they are allowed to mean.
 *
 * A finished unit has to survive the child leaving the page: the app shell
 * forgets the moment a board closes, and there is no account to keep it anywhere
 * else. Every rule here exists because of the two ways that can go wrong — a star
 * that appears without the work being done, or one that disappears because the
 * tab was shut.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from '../harness/api'

const source = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')

/** the ten doors on the home screen, one stage each */
const STAGES = [
  'CongruenceStage',
  'CorrespondenceStage',
  'SymmetryAxisStage',
  'SymmetryPartsStage',
  'SymmetryFactsStage',
  'SymmetryDrawStage',
  'SymmetryPointAxisStage',
  'SymmetryPointPartsStage',
  'SymmetryPointFactsStage',
  'SymmetryPointDrawStage',
]

describe('a finished unit leaves a star behind', () => {
  it('is written when the unit finishes, not when the child goes home', () => {
    /*
     * The button that closes the ending popup is the one thing a child may never
     * press — they can get up and walk off with it still up. So the record is
     * made at the moment the unit is finished, which for every one of them is
     * the moment its ending goes up, and all ten say so the same way.
     */
    const hook = source('src/modes/useUnitProgress.ts')
    expect(hook.includes('export function useMarkComplete')).toBeTruthy()
    for (const stage of STAGES) {
      expect(source(`src/modes/${stage}.tsx`).includes('useMarkComplete(')).toBeTruthy()
    }
  })

  it('is kept in the browser and read back defensively', () => {
    /*
     * No account here, so the browser's own store is the only place that
     * outlives a visit. A store that is blocked, absent or hand-edited into
     * nonsense must leave a child with an empty count and a working first
     * screen, never a broken one — which is why both ends are inside a catch.
     */
    const hook = source('src/modes/useUnitProgress.ts')
    expect(hook.includes('localStorage.setItem')).toBeTruthy()
    expect(hook.includes('localStorage.getItem')).toBeTruthy()
    expect((hook.match(/catch \{/g) || []).length >= 2).toBeTruthy()
    // and finishing the same unit twice is still one star
    expect(hook.includes('prev.includes(unit) ? prev')).toBeTruthy()
  })

  it('is counted at the top of the home screen as a star and a number', () => {
    const app = source('src/App.tsx')
    expect(app.includes('useUnitProgress')).toBeTruthy()
    expect(app.includes('home__stars')).toBeTruthy()
    expect(app.includes('★')).toBeTruthy()
    // and a finished row wears that star in place of its number
    expect(app.includes('unit-list__badge--star')).toBeTruthy()
  })
})

describe('the home screen says one thing', () => {
  it('has no app blurb, no panel heading and no unit blurb', () => {
    /*
     * Three pieces of text that said nothing a child cannot already see, on the
     * one screen that has to be read at a glance. The title, the stars and the
     * doors are what is left, and nothing else earns its place above the list.
     */
    const app = source('src/App.tsx')
    for (const gone of ['home__subtitle', 'panel__title', 'panel__hint']) {
      expect(app).not.toContain(gone)
    }
  })
})

const { report } = await import('../harness/spec.mjs')
report()