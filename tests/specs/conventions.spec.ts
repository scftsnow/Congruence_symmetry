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

const { report } = await import('../harness/spec.mjs')
report()