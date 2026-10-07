/**
 * Zero-dependency spec framework.
 *
 * WHY NOT VITEST / JEST
 * ---------------------
 * Dependency installation times out in this environment, and `tsx` exhausts
 * a 4GB heap. A hand-rolled harness is not a compromise here: it is the
 * only option that runs, and it buys us one critical property the standard
 * runners do not give us for free.
 *
 * THE CRITICAL PROPERTY: FAIL FAST ON NON-TERMINATION
 * ---------------------------------------------------
 * The `flower()` bug shipped to production because:
 *   - `npm run build` only compiles; it never executes
 *   - an infinite loop does not throw, it hangs
 *   - the hang surfaced only as a 4GB OOM after ~12 seconds
 *
 * A test that cannot fail is not a test. This framework runs every spec in
 * a child process with `--max-old-space-size=128` and a wall-clock timeout,
 * so a non-terminating loop becomes a deterministic FAIL in ~1 second:
 *
 *   runner.mjs  ->  node --max-old-space-size=128 spec-bundle.js
 *
 * HARNESS RULES (enforced by tests/specs/conventions.spec.mjs)
 *   1. A spec file must import `describe` / `it` from this harness.
 *   2. Assertions go through `expect`; bare `if (x) throw` is disallowed
 *      in spec bodies so failures still get a name.
 *   3. A spec file must have no top-level side effects beyond describe().
 */

let currentSuite = ''
const results = []
let pass = 0
let fail = 0
const failures = []

/** Declares a suite. Suites are for grouping only; they never assert. */
export function describe(name, fn) {
  const previous = currentSuite
  currentSuite = previous ? `${previous} > ${name}` : name
  fn()
  currentSuite = previous
}

/** Declares one test case. */
export function it(name, fn) {
  const fullName = currentSuite ? `${currentSuite} > ${name}` : name
  try {
    fn()
    pass++
    results.push(`  OK   ${fullName}`)
  } catch (error) {
    fail++
    const message = error instanceof Error ? error.message : String(error)
    failures.push(`${fullName}: ${message}`)
    results.push(`  FAIL ${fullName}`)
    results.push(`         ${message}`)
  }
}

/** Marks a spec file as intentionally skipped (e.g. needs a real browser). */
export function xit(name) {
  results.push(`  SKIP ${name}`)
}

/** Chains shape the assertions an assertion library would provide. */
export function expect(actual) {
  return {
    toBe(expected) {
      if (!Object.is(actual, expected)) {
        throw new Error(`expected ${format(expected)}, got ${format(actual)}`)
      }
    },
    toEqual(expected) {
      const a = JSON.stringify(actual)
      const b = JSON.stringify(expected)
      if (a !== b) throw new Error(`expected ${b}, got ${a}`)
    },
    toBeTruthy() {
      if (!actual) throw new Error(`expected truthy, got ${format(actual)}`)
    },
    toBeFalsy() {
      if (actual) throw new Error(`expected falsy, got ${format(actual)}`)
    },
    toBeCloseTo(expected, digits = 2) {
      const tolerance = Math.pow(10, -digits) / 2
      if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`expected ${expected} +/-${tolerance}, got ${actual}`)
      }
    },
    toBeGreaterThan(expected) {
      if (!(actual > expected)) {
        throw new Error(`expected > ${format(expected)}, got ${format(actual)}`)
      }
    },
    toBeGreaterThanOrEqual(expected) {
      if (!(actual >= expected)) {
        throw new Error(`expected >= ${format(expected)}, got ${format(actual)}`)
      }
    },
    toBeLessThanOrEqual(expected) {
      if (!(actual <= expected)) {
        throw new Error(`expected <= ${format(expected)}, got ${format(actual)}`)
      }
    },
    toBeLessThan(expected) {
      if (!(actual < expected)) {
        throw new Error(`expected < ${format(expected)}, got ${format(actual)}`)
      }
    },
    toContain(expected) {
      const has = Array.isArray(actual)
        ? actual.includes(expected)
        : typeof actual === 'string' && actual.includes(expected)
      if (!has) throw new Error(`expected to contain ${format(expected)}`)
    },
    toHaveLength(expected) {
      if (actual?.length !== expected) {
        throw new Error(`expected length ${expected}, got ${actual?.length}`)
      }
    },
    toThrow() {
      let threw = false
      try {
        actual()
      } catch {
        threw = true
      }
      if (!threw) throw new Error('expected function to throw')
    },
  }
}

function format(value) {
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'object' && value !== null) return JSON.stringify(value)
  return String(value)
}

/** Emits the report. Called by the runner via the exit code contract. */
export function report() {
  const lines = [...results, '', '-'.repeat(52), `PASS ${pass}   FAIL ${fail}`]
  if (fail > 0) {
    lines.push('')
    lines.push('failures:')
    for (const f of failures) lines.push(`  - ${f}`)
  }
  process.stdout.write(lines.join('\n') + '\n')
  if (fail > 0) process.exit(1)
}