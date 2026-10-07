/**
 * Test runner.
 *
 * WHY THIS EXISTS
 * ---------------
 * `npm run build` compiles; it never executes. A module that loops forever
 * at import time builds cleanly, deploys cleanly, and hangs every visitor
 * with a blank screen. `for (let i = 0; i < petals; 2)` did exactly that.
 *
 * A test that cannot fail is not a test. So every spec runs in an isolated
 * child process with a hard heap cap and a wall-clock timeout:
 *
 *     node --max-old-space-size=128 <bundle>
 *
 * Outcomes are classified, not merely observed:
 *
 *   exit 0                       PASS
 *   exit 1                       FAIL (named assertions on stdout)
 *   SIGKILL / timeout            FAIL  "NON-TERMINATING"
 *   out of memory in stderr      FAIL  "NON-TERMINATING (OOM)"
 *   any other crash              FAIL  "CRASHED"
 *
 * That classification is the product. A hang becomes a one-second,
 * named, red build instead of a mystery.
 *
 * Usage:
 *   npm test                 all specs
 *   npm test -- geometry     only specs whose filename contains "geometry"
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..', '..')
const specDir = join(root, 'tests', 'specs')
const outDir = join(root, 'tests', '.build')

/** Per-spec wall-clock budget in ms. */
const TIMEOUT_MS = 10_000
/** Heap cap for spec child processes. Low enough that a loop dies fast. */
const HEAP_MB = 128

const filter = process.argv[2] ?? ''
const specs = readdirSync(specDir)
  .filter((f) => f.endsWith('.spec.ts') || f.endsWith('.spec.tsx'))
  .filter((f) => !filter || f.includes(filter))
  .sort()

if (specs.length === 0) {
  console.error('no specs matched: ' + filter)
  process.exit(1)
}

console.log('running ' + specs.length + ' spec file(s)\n')

const failed = []
let totalPass = 0

for (const spec of specs) {
  const label = spec.replace(/\.spec\.tsx?$/, '')
  console.log('== ' + label)

  // 1. compile (never executes the code)
  try {
    // On Windows, npm.cmd cannot be spawned directly with args (EINVAL).
    // Route through the shell so the .cmd shim is invoked correctly.
    const args = [
      'exec', '--', 'vite', 'build', '--ssr',
      relative(root, join(specDir, spec)),
      '--outDir', relative(root, outDir),
      '--emptyOutDir',
      '--logLevel', 'error',
    ].join(' ')
    const cmdline = process.platform === 'win32'
      ? 'npm ' + args
      : 'npm ' + args
    execFileSync(cmdline, {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: true,
    })
  } catch (error) {
    console.log('  FAIL build')
    const detail = ((error.stderr ?? '') + (error.stdout ?? '')).trim().split('\n').slice(0, 6)
    for (const line of detail) console.log('         ' + line)
    failed.push(label + ' (build)')
    continue
  }

  // 2. locate the emitted entry (vite preserves the spec basename)
  const entryName = readdirSync(outDir).find((f) => f.startsWith(label) && f.endsWith('.js'))
  if (!entryName) {
    console.log('  FAIL build produced no entry for ' + label)
    failed.push(label + ' (no entry)')
    continue
  }

  // 3. run isolated, then classify
  const run = spawnSync(
    process.execPath,
    ['--max-old-space-size=' + HEAP_MB, join(outDir, entryName)],
    { cwd: root, encoding: 'utf8', timeout: TIMEOUT_MS, killSignal: 'SIGKILL' },
  )

  const stdout = run.stdout ?? ''
  const stderr = run.stderr ?? ''
  const killed = run.signal === 'SIGKILL'
  const oom = /out of memory|heap limit|Allocation failed/i.test(stderr)

  if (killed || oom) {
    console.log('  FAIL non-terminating: ' + (oom ? 'heap exhausted' : 'timeout ' + TIMEOUT_MS + 'ms'))
    console.log('         An unbounded loop in module init or a render path is the usual cause.')
    console.log('         This is the failure mode that shipped a blank screen to users.')
    failed.push(label + ' (non-terminating)')
    continue
  }

  if (run.status !== 0 && run.status !== 1) {
    console.log('  FAIL crashed with exit ' + run.status)
    for (const line of stderr.trim().split('\n').slice(0, 5)) console.log('         ' + line)
    failed.push(label + ' (crash)')
    continue
  }

  // pass through the spec's own report
  if (stdout) console.log(stdout.replace(/\n$/, ''))

  const summary = stdout.match(/PASS (\d+)\s+FAIL (\d+)/)
  if (summary) totalPass += Number(summary[1])

  if (run.status === 1) {
    failed.push(label)
  }
  console.log('')
}

rmSync(outDir, { recursive: true, force: true })

console.log('='.repeat(52))
console.log('SPEC FILES  ' + (specs.length - failed.length) + ' passed, ' + failed.length + ' failed')
console.log('ASSERTIONS  ' + totalPass + ' passed')

if (failed.length) {
  console.log('')
  for (const f of failed) console.log('  - ' + f)
  process.exit(1)
}
console.log('all specs passed')