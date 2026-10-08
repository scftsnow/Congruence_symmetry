/**
 * Convention enforcement spec.
 *
 * Every rule in tests/harness/conventions.mjs is checked here.
 * Each check exists because of a real failure, not for style.
 *
 * Run: npm run test:conventions
 */

import { describe, it, expect } from '../harness/api'
import {
  GEOMETRY_PURITY,
  LAYER_DIRECTION,
  COMPONENT_PURITY,
  MODE_RESPONSIBILITY,
  HOOK_CONVENTION,
  FILE_NAMING,
  SOURCE_HYGIENE,
  TEST_PLACEMENT,
  IMPORT_SAFETY,
} from '../harness/conventions.mjs'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc
  for (const entry of readdirSync(dir)) {
    if (['node_modules', 'dist', '.git', '.build'].includes(entry)) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, acc)
    else if (/\.(ts|tsx|mjs)$/.test(entry)) acc.push(full)
  }
  return acc
}

const sourceFiles = walk(join(root, 'src'))
const specFiles = walk(join(root, 'tests', 'specs'))
const harnessFiles = walk(join(root, 'tests', 'harness'))

function rel(p) {
  return relative(root, p).replace(/\\/g, '/')
}

function read(file) {
  return readFileSync(file, 'utf8')
}

function productionSource() {
  return sourceFiles.filter((f) => {
    const n = rel(f)
    return !n.endsWith('.spec.ts') && !n.endsWith('.spec.tsx') && !n.endsWith('.test.ts')
  })
}

/** Extracts the module specifier from an import line, or null. */
function importTarget(line) {
  const m = line.match(/from\s+['"]([^'"]+)['"]/)
  return m ? m[1] : null
}

// ── 1. geometry purity ───────────────────────────────────
describe('geometry is pure math', () => {
  const files = sourceFiles.filter((f) => rel(f).startsWith('src/geometry/'))

  it('geometry layer is non-empty', () => {
    expect(files.length > 0).toBeTruthy()
  })

  for (const file of files) {
    const body = read(file)
    for (const rule of GEOMETRY_PURITY.forbids) {
      it(`${rel(file)} avoids ${rule.token}`, () => {
        const bad = body.includes(rule.token)
        expect(bad ? rule.reason : 'ok').toBe('ok')
      })
    }
  }
})

// ── 2. dependency direction ───────────────────────────────
describe('dependency arrows point downward only', () => {
  for (const rule of LAYER_DIRECTION.forbidden) {
    it(`${rule.from} must not import ${rule.mustNotImport.join(' or ')}`, () => {
      const offenders = []
      for (const file of sourceFiles) {
        if (!rel(file).startsWith(rule.from)) continue
        for (const line of read(file).split('\n')) {
          if (!/^\s*import\b/.test(line)) continue
          const target = importTarget(line)
          if (!target) continue
          for (const banned of rule.mustNotImport) {
            const asRelative = '../' + banned.replace('src/', '')
            if (target === asRelative || target === banned || target.includes(asRelative + '/')) {
              offenders.push(`${rel(file)} -> ${target}`)
            }
          }
        }
      }
      expect(offenders.length === 0 ? 'ok' : offenders.join(', ')).toBe('ok')
    })
  }

  it('modes may compose components', () => {
    const rule = LAYER_DIRECTION.allowed.find((r) => r.from === 'src/modes/')
    expect(rule?.mayImport.includes('src/components/')).toBeTruthy()
  })
})

// ── 3. component purity ───────────────────────────────────
describe('components render, they do not compute', () => {
  const files = sourceFiles.filter((f) => rel(f).startsWith('src/components/'))

  it('component layer is non-empty', () => {
    expect(files.length > 0).toBeTruthy()
  })

  for (const file of files) {
    const body = read(file)

    for (const rule of COMPONENT_PURITY.forbids) {
      it(`${rel(file)} avoids ${rule.token}`, () => {
        const bad = body.includes(rule.token)
        expect(bad ? rule.reason : 'ok').toBe('ok')
      })
    }

    it(`${rel(file)} stays under ${COMPONENT_PURITY.maxLines} lines`, () => {
      const lines = body.split('\n').length
      expect(lines <= COMPONENT_PURITY.maxLines ? 'ok' : `${lines} lines`).toBe('ok')
    })
  }
})

// ── 4. mode responsibility ────────────────────────────────
describe('modes own state but delegate math', () => {
  const files = sourceFiles.filter((f) => rel(f).startsWith('src/modes/'))

  it('mode layer is non-empty', () => {
    expect(files.length > 0).toBeTruthy()
  })

  for (const file of files) {
    if (!rel(file).endsWith('.tsx')) continue
    it(`${rel(file)} stays under ${MODE_RESPONSIBILITY.maxLines} lines`, () => {
      const lines = read(file).split('\n').length
      expect(lines <= MODE_RESPONSIBILITY.maxLines ? 'ok' : `${lines} lines`).toBe('ok')
    })

    it(`${rel(file)} delegates its state to a hook`, () => {
      const body = read(file)
      const usesState = /useState/.test(body)
      if (!usesState) {
        expect('ok').toBe('ok')
      } else {
        const hasHookImport = /import\s+\{[^}]*use[A-Z]\w*[^}]*\}\s+from/.test(body)
        expect(hasHookImport ? 'ok' : 'useState in a screen must live in a use* hook').toBe('ok')
      }
    })
  }
})

// ── 5. hook convention ────────────────────────────────────
describe('hooks are the testable unit of state', () => {
  const hooks = sourceFiles.filter((f) => {
    const base = rel(f).split('/').pop().replace(/\.tsx?$/, '')
    return HOOK_CONVENTION.pattern.test(base)
  })

  it('at least one hook exists', () => {
    expect(hooks.length > 0).toBeTruthy()
  })

  for (const hook of hooks) {
    const body = read(hook)

    it(`${rel(hook)} matches useXxx`, () => {
      const base = rel(hook).split('/').pop().replace(/\.tsx?$/, '')
      expect(HOOK_CONVENTION.pattern.test(base) ? 'ok' : base).toBe('ok')
    })

    it(`${rel(hook)} stays under ${HOOK_CONVENTION.maxLines} lines`, () => {
      const lines = body.split('\n').length
      expect(lines <= HOOK_CONVENTION.maxLines ? 'ok' : `${lines} lines`).toBe('ok')
    })

    for (const rule of HOOK_CONVENTION.forbids) {
      it(`${rel(hook)} avoids ${rule.token}`, () => {
        const bad = body.includes(rule.token)
        expect(bad ? rule.reason : 'ok').toBe('ok')
      })
    }

    it(`${rel(hook)} sets state only inside an effect or an event handler`, () => {
      // A bare setState in the render body cascades:
      //   state changes -> rerender -> state changes -> rerender
      //
      // Legitimate call sites, and how each is recognised:
      //   useEffect(() => { ... })          effect body
      //   const f = useCallback(() => { })  event handler
      //   const f = () => { ... }           inline event handler
      //
      // This is a source-level heuristic, so it keys on structure
      // (arrow-function bodies and effect bodies), not on indentation.
      const source = read(hook)
      const lines = source.split('\n')

      // A line "opens a scope" when it declares an arrow body or a function
      // that React calls later. Track a stack so we know which lines are
      // inside such a scope.
      const scopeStack = []   // each entry: { depth, isHandler }
      let depth = 0

      const offenders = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmed = line.trim()

        // does this line open a handler/effect scope?
        const opensHandler =
          /=>\s*\{/.test(trimmed) ||
          /useEffect\s*\(\s*(async\s*)?\(/.test(trimmed) ||
          /useLayoutEffect\s*\(\s*(async\s*)?\(/.test(trimmed) ||
          /useCallback\s*\(\s*(async\s*)?\(/.test(trimmed)

        if (opensHandler) {
          scopeStack.push({ depth: depth + 1, isHandler: true })
        }

        const insideHandler = scopeStack.some((s) => s.isHandler)

        // the setState itself
        if (/\bset[A-Z]\w*\(/.test(line) && !/\bconst\b/.test(line)) {
          // skip the declaration line of a handler: "const f = useCallback("
          const isDeclaration = /=\s*use(Callback|Effect|LayoutEffect)\b/.test(trimmed)
          const opensArrowHere = /=>\s*\{/.test(trimmed)
          if (!isDeclaration && !opensArrowHere && !insideHandler) {
            offenders.push(`line ${i + 1}: ${trimmed}`)
          }
        }

        // update brace depth and pop finished scopes
        for (const ch of line) {
          if (ch === '{') depth++
          else if (ch === '}') {
            depth--
            while (scopeStack.length && scopeStack[scopeStack.length - 1].depth > depth) {
              scopeStack.pop()
            }
          }
        }
      }

      expect(offenders.length === 0 ? 'ok' : offenders.join(' | ')).toBe('ok')
    })
  }
})

// ── 6. file naming ────────────────────────────────────────
describe('file naming is predictable', () => {
  for (const rule of FILE_NAMING.rules) {
    const matching = sourceFiles.filter((f) => {
      const n = rel(f)
      return n.startsWith(rule.dir) && n.endsWith(rule.ext)
    })
    if (matching.length === 0) continue

    for (const file of matching) {
      const base = rel(file).split('/').pop().replace(/\.tsx?$/, '')
      it(`${rel(file)} matches ${rule.reason}`, () => {
        expect(rule.mustStart.test(base) ? 'ok' : `${base} must match ${rule.mustStart}`).toBe('ok')
      })
    }
  }
})

// ── 7. source hygiene ─────────────────────────────────────
describe('source hygiene keeps failures loud', () => {
  for (const file of productionSource()) {
    const name = rel(file)
    const allowed = SOURCE_HYGIENE.consoleAllowedIn.some((d) => name.startsWith(d))
    if (allowed) continue

    for (const rule of SOURCE_HYGIENE.rules) {
      it(`${name} has no ${rule.id}`, () => {
        const bad = read(file).includes(rule.token)
        expect(bad ? rule.reason : 'ok').toBe('ok')
      })
    }

    it(`${name} does not log to stdout`, () => {
      const bad = read(file).includes('console.log(')
      expect(bad ? 'stray console.log hides real output' : 'ok').toBe('ok')
    })
  }
})

// ── 8. import safety ──────────────────────────────────────
describe('no non-terminating loops', () => {
  const files = productionSource().filter((f) => rel(f).startsWith(IMPORT_SAFETY.checkForLoopsIn))

  it('checked files are non-empty', () => {
    expect(files.length > 0).toBeTruthy()
  })

  for (const file of files) {
    it(`${rel(file)} advances every loop counter`, () => {
      const offenders = []
      for (const line of read(file).split('\n')) {
        const m = line.match(/for\s*\(\s*let\s+(\w+)\s*=\s*[^;]+;[^;]*;([^)]*)\)/)
        if (!m) continue
        const [, counter, increment] = m
        const advances = /(\+=|-=|\*=|\/=|\+\+|--)/.test(increment)
        if (!advances) {
          offenders.push(`${counter} never advances: ${line.trim()}`)
        }
      }
      expect(offenders.length === 0 ? 'ok' : offenders.join('; ')).toBe('ok')
    })

  }
})

// ── 9. test placement ─────────────────────────────────────
describe('tests live where they are run', () => {
  for (const spec of specFiles) {
    it(`${rel(spec)} imports the harness`, () => {
      const body = read(spec)
      const ok = body.includes('../harness/api')
      expect(ok ? 'ok' : 'specs must import describe/it/expect from the harness').toBe('ok')
    })

    it(`${rel(spec)} has no raw throw`, () => {
      const body = read(spec)
      // report() is legitimately called; bare throw for assertions is not
      const bare = /throw new Error\(/.test(body)
      expect(bare ? 'use expect() so the failure gets a name' : 'ok').toBe('ok')
    })

    /*
     * A spec must end by calling report().
     *
     * An edit dropped this call from the correspondence spec. The file ran, every
     * assertion passed, nothing was printed and the process exited 0 — so the
     * runner saw a clean exit and reported the spec green. Thirty-odd checks,
     * including the ones that would have caught a shape whose sides were two
     * pixels apart, all quietly gone.
     *
     * The runner now fails a silent spec as well, but the mistake is far easier
     * to catch here, at the point of the edit, than there after the fact.
     */
    it(`${rel(spec)} ends by reporting`, () => {
      const body = read(spec)
      const calls = /await import\('\.\.\/harness\/spec\.mjs'\)\s*\n\s*report\(\)/.test(body)
      expect(calls ? 'ok' : 'a spec with no report() call cannot fail').toBe('ok')
    })
  }

  for (const rule of TEST_PLACEMENT.deprecated) {
    it(`${rule.pattern} is removed`, () => {
      const exists = existsSync(join(root, rule.pattern))
      expect(exists ? rule.reason : 'ok').toBe('ok')
    })
  }
})

// ── 10. the rules themselves are non-trivial ──────────────
describe('convention rules carry their rationale', () => {
  const allRules = {
    [GEOMETRY_PURITY.id]: GEOMETRY_PURITY,
    [LAYER_DIRECTION.id]: LAYER_DIRECTION,
    [COMPONENT_PURITY.id]: COMPONENT_PURITY,
    [MODE_RESPONSIBILITY.id]: MODE_RESPONSIBILITY,
    [HOOK_CONVENTION.id]: HOOK_CONVENTION,
    [FILE_NAMING.id]: FILE_NAMING,
    [SOURCE_HYGIENE.id]: SOURCE_HYGIENE,
    [TEST_PLACEMENT.id]: TEST_PLACEMENT,
  }

  for (const [id, rule] of Object.entries(allRules)) {
    it(`${id} documents why it exists`, () => {
      expect(typeof rule.why === 'string' && rule.why.length > 40).toBeTruthy()
    })
  }

  it('import safety is checked against real code', () => {
    expect(IMPORT_SAFETY.guidance.length > 0).toBeTruthy()
  })

  it('spec files exist to enforce anything', () => {
    expect(specFiles.length > 0).toBeTruthy()
  })

  it('harness is separate from specs', () => {
    expect(harnessFiles.length > 0).toBeTruthy()
  })
})

// ── 11. one thing per file ────────────────────────────────
//
// Added after the correspondence unit, when src/components/BoardParts.tsx turned
// out to hold four unrelated components behind a name that described none of them,
// Celebration turned out to be living inside VerdictBanner because only one screen
// needed it, and src/index.css turned out to be 847 lines because there used to
// be one screen. None of that broke anything; all of it cost time. A file named
// after nothing in particular is a file nobody can find anything in.

describe('a file holds one thing', () => {
  const styles = () =>
    readdirSync(join(root, 'src', 'styles'))
      .filter((f) => f.endsWith('.css'))
      .map((f) => readFileSync(join(root, 'src', 'styles', f), 'utf8'))
      .join('\n')

  it('the board pieces are named after what they draw', () => {
    expect(existsSync(join(root, 'src/components/BoardParts.tsx'))).toBeFalsy()
    const expected = [
      'BoardShapeView.tsx',
      'BoardGrid.tsx',
      'PairMark.tsx',
      'StackedOverlay.tsx',
      'Celebration.tsx',
    ]
    const missing = expected.filter((f) => !existsSync(join(root, 'src/components', f)))
    expect(missing.join(', ') || 'ok').toBe('ok')
  })

  it('a component file exports one component', () => {
    // VerdictBanner.tsx exported a banner and a burst of stars, which is a reward
    // for a right answer living in the file that decides what a wrong one says.
    //
    // Only .tsx, deliberately: a text module exporting two wording functions is
    // one thing, and svgPath.ts exporting two path builders is one thing too.
    // It is a grab bag when the file holds pieces that would be wanted
    // independently of each other.
    const offenders: string[] = []
    for (const file of sourceFiles) {
      if (!rel(file).startsWith('src/components/')) continue
      if (!rel(file).endsWith('.tsx')) continue
      const exported = (read(file).match(/^export function \w+/gm) || []).length
      if (exported > 1) offenders.push(rel(file) + ' exports ' + exported)
    }
    expect(offenders.join(', ') || 'ok').toBe('ok')
  })

  it('the stylesheet is split, and the entry point only says the order', () => {
    // base.css must load first: the custom properties every other rule is written
    // in terms of live there, and a rule landing before them resolves to nothing.
    const entry = read('src/index.css')
    const withoutComments = entry.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(/[{}]/.test(withoutComments) ? 'index.css still holds rules' : 'ok').toBe('ok')

    const order = [...entry.matchAll(/styles\/(\w+)\.css/g)].map((m) => m[1])
    expect(order[0] === 'base' ? 'ok' : 'base.css must come first, got ' + order[0]).toBe('ok')
    expect(order.length >= 5 ? 'ok' : order.length + ' stylesheets').toBe('ok')
  })

  it('no stylesheet styles a screen that was removed', () => {
    // The shape picker and the rotate/flip tool buttons are both gone. Their rules
    // outlived them because nothing told the stylesheet they had become unused.
    const css = styles()
    for (const dead of ['.shape-chip', '.shape-picker', '.tool-btn']) {
      expect(css.includes(dead) ? dead + ' styles a removed screen' : 'ok').toBe('ok')
    }
  })

  it('every component is used by something', () => {
    /*
     * ResultBanner.tsx survived the removal of the screen it belonged to. It was
     * still here when the banner styles were taken out with the strip, and it
     * rendered unstyled for as long as nobody noticed — because a file that is
     * never imported breaks nothing and reports nothing.
     */
    const source = sourceFiles
      .filter((f) => /\.(tsx|ts)$/.test(f))
      .map((f) => [rel(f), readFileSync(f, 'utf8')] as const)

    const orphans: string[] = []
    for (const [path] of source) {
      if (!path.startsWith('src/components/')) continue
      if (!path.endsWith('.tsx')) continue
      const stem = path.split('/').pop()!.replace(/\.tsx$/, '')
      const used = source.some(([other, body]) => other !== path && body.includes(stem))
      if (!used) orphans.push(path)
    }
    expect(orphans.join(', ') || 'ok').toBe('ok')
  })

  it('no rule styles a class nothing uses', () => {
    /*
     * The general version of the check above, because the two narrow ones kept
     * having to be written by hand. Removed screens take their rules with them
     * only if something notices, and the only thing that can notice is a test.
     *
     * Also catches the strip along the top of a unit: when the banner component
     * went, six rules for it stayed behind and nothing was broken by them.
     */
    const source = sourceFiles
      .filter((f) => /\.(tsx|ts)$/.test(f))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n')

    const declared = new Set<string>()
    for (const file of readdirSync(join(root, 'src', 'styles'))) {
      const css = readFileSync(join(root, 'src', 'styles', file), 'utf8')
      for (const [, name] of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) declared.add(name)
    }

    const orphans = [...declared].filter((name) => !source.includes(name)).sort()
    expect(orphans.join(', ') || 'ok').toBe('ok')
  })

  it('a unit has no strip along the top of its board', () => {
    /*
     * The instruction, the counter and the hint were all in one strip above the
     * shapes. In the congruence board it repeated the toolbar and the header; in
     * the correspondence unit it sat over the board the child was looking at. Both
     * units now say everything over the board instead, and the standing line lives
     * at the bottom next to the controls.
     */
    for (const stage of [
      'src/modes/CongruenceStage.tsx',
      'src/modes/CorrespondenceStage.tsx',
    ]) {
      const code = read(stage)
      expect(code.includes('banner')).toBeFalsy()
      expect(code.includes('<Toast')).toBeTruthy()
    }
    expect(existsSync(join(root, 'src/components/VerdictBanner.tsx'))).toBeFalsy()
    expect(styles().includes('.banner')).toBeFalsy()
  })

  it('a repeated miss is answered every time, not only the first', () => {
    // Two misses in a row produce the same words, so a popup keyed on the text
    // alone would find nothing changed and stay silent — and the child is still
    // stuck. Both screens therefore pass a counter that moves on every attempt.
    expect(/misses/.test(read('src/modes/useCorrespondence.ts'))).toBeTruthy()
    expect(/attempts/.test(read('src/modes/CongruenceStage.tsx'))).toBeTruthy()
    expect(/nonce/.test(read('src/modes/useToast.ts'))).toBeTruthy()
  })

  it('the star burst scales about its own centre', () => {
    // A CSS transform on an SVG element is taken about the SVG viewport origin —
    // the top-left of the viewBox — unless told otherwise. The stars were being
    // scaled away from that corner instead of swelling where they sat, so the one
    // in the bottom right of the board was flung off the canvas.
    const board = readFileSync(join(root, 'src/styles/board.css'), 'utf8')
    expect(/transform-box:\s*fill-box/.test(board)).toBeTruthy()
    expect(/transform-origin:\s*center/.test(board)).toBeTruthy()
  })

  it('the ending popup cannot be scrolled past', () => {
    // It was a panel under a 1100x760 canvas, which on a tablet held upright puts
    // it below the fold — so a child who had scrolled while dragging watched the
    // stars burst off screen and then nothing at all.
    const ui = readFileSync(join(root, 'src/styles/ui.css'), 'utf8')
    const fixed = /\.done\s*\{[^}]*position:\s*fixed/.test(ui)
    expect(fixed).toBeTruthy()
    expect(read('src/components/DonePanel.tsx').includes('role="dialog"')).toBeTruthy()
  })
})

const { report } = await import('../harness/spec.mjs')
report()