/**
 * Code conventions — the machine-checked rules.
 *
 * Enforced by tests/specs/conventions.spec.ts, not by discipline.
 * A convention nobody verifies is a suggestion, not a rule.
 *
 * ── LAYERING ──────────────────────────────────────────────
 *
 * Dependency arrows point downward only:
 *
 *   src/modes/        orchestration — owns state, composes components
 *        │
 *        ├──────────► src/components/   presentation only
 *        │                 │
 *        └──────────► src/geometry/  ◄──┘  pure math
 *                              ▲
 *                              │
 *                        src/storage/    persistence
 *
 * Legal:  modes → components, modes → geometry,
 *         components → geometry, storage → geometry
 * Illegal: geometry → components, geometry → modes,
 *         components → modes   (a leaf never reaches back up)
 *
 * ── WHY EACH RULE EXISTS ──────────────────────────────────
 *
 * Each rule traces to a real failure, not to style preference.
 */

// ── geometry: pure math, the foundation ──────────────────
export const GEOMETRY_PURITY = {
  id: 'geometry-purity',
  why: 'Geometry math must be unit-testable with no browser. A DOM or React import in geometry/ turns a math bug into an untestable rendering bug.',
  layer: 'src/geometry/',
  forbids: [
    { token: "from 'react'", reason: 'geometry/ must not import React' },
    { token: 'document', reason: 'geometry/ must not touch the DOM' },
    { token: 'window', reason: 'geometry/ must not touch window' },
    { token: 'localStorage', reason: 'geometry/ must not do I/O' },
    { token: 'fetch(', reason: 'geometry/ must not do I/O' },
  ],
}

// ── dependency direction: downward only ──────────────────
export const LAYER_DIRECTION = {
  id: 'layer-direction',
  why: 'A leaf layer must never import its parent. Upward imports create cycles and make modules impossible to reason about.',
  // `from` may import these freely
  allowed: [
    { from: 'src/modes/', mayImport: ['src/components/', 'src/geometry/', 'src/storage/'] },
    { from: 'src/components/', mayImport: ['src/geometry/'] },
    { from: 'src/geometry/', mayImport: [] },
    { from: 'src/storage/', mayImport: ['src/geometry/'] },
  ],
  // `from` must never import these
  forbidden: [
    { from: 'src/geometry/', mustNotImport: ['src/components/', 'src/modes/', 'src/storage/'] },
    { from: 'src/components/', mustNotImport: ['src/modes/'] },
    { from: 'src/storage/', mustNotImport: ['src/components/', 'src/modes/'] },
  ],
}

// ── components: presentation only ────────────────────────
export const COMPONENT_PURITY = {
  id: 'component-purity',
  why: 'Shape math belongs in geometry/. A component that computes congruence inline cannot be unit-tested and duplicates the logic in every mode that needs it.',
  layer: 'src/components/',
  maxLines: 220,
  // Components receive state and render it. They do not compute geometry.
  forbids: [
    { token: 'checkCongruence', reason: 'congruence decisions belong in geometry/compare.ts' },
    { token: 'signatureDeviation', reason: 'comparison internals belong in geometry/' },
    { token: 'shapeSignature', reason: 'comparison internals belong in geometry/' },
  ],
  // Note: calling applyTransform() in a component IS allowed.
  // A component must turn model coordinates into SVG coordinates to render at all.
  // What it must not do is decide whether two shapes are congruent.
  // Components may hold trivial local UI state (which tool is selected),
  // but may not own the domain state of a mode.
  allowLocalState: true,
}

// ── modes: orchestration owns state ───────────────────────
export const MODE_RESPONSIBILITY = {
  id: 'mode-responsibility',
  why: 'Modes own domain state and wire components together. Domain math in a mode cannot be unit-tested without React, which is why it belongs in geometry/.',
  layer: 'src/modes/',
  // Modes are allowed and expected to call the geometry layer.
  allowGeometryCalls: ['checkCongruence', 'applyTransform', 'toScreenPoints', 'EPSILON_STACK'],
  // A mode may not exceed this size; beyond it, extract a hook.
  maxLines: 260,
  // State must live in a hook, not inline in the component body, so that
  // the logic is testable without mounting React.
  requireHookForState: true,
}

// ── hooks: the testable unit of state ─────────────────────
export const HOOK_CONVENTION = {
  id: 'hook-convention',
  why: 'Domain state belongs in a `use*` hook so the logic can be exercised without rendering. It also keeps the component a readable description of the screen.',
  pattern: /^use[A-Z]\w*$/,
  maxLines: 220,
  forbids: [
    { token: 'document.', reason: 'hooks stay DOM-free; put that in a component effect' },
  ],
  // Render-phase setState is a cascading-render bug. It must appear in an
  // effect or an event handler, never in the render body.
  requireEffectForDerivedState: true,
}

// ── file naming ───────────────────────────────────────────
export const FILE_NAMING = {
  id: 'file-naming',
  why: 'A reader should locate code by convention instead of by searching.',
  rules: [
    { dir: 'src/components/', ext: '.tsx', mustStart: /^[A-Z]/, reason: 'components are PascalCase' },
    { dir: 'src/geometry/', ext: '.ts', mustStart: /^[a-z]/, reason: 'geometry modules are camelCase' },
    { dir: 'src/modes/', ext: '.ts', mustStart: /^use[A-Z]/, reason: 'mode state lives in useXxx hooks' },
    { dir: 'src/modes/', ext: '.tsx', mustStart: /^[A-Z]/, reason: 'mode screens are PascalCase' },
  ],
}

// ── source hygiene ────────────────────────────────────────
export const SOURCE_HYGIENE = {
  id: 'source-hygiene',
  why: 'Silent corruption ships as a blank screen; a red build should be the loudest signal in the pipeline.',
  // Applies to production source only. Tests and the harness may log.
  rules: [
    { id: 'no-debugger', token: 'debugger', reason: 'debugger statement left in source' },
    { id: 'no-ts-ignore', token: '@ts-ignore', reason: 'prefer a correct type over suppression' },
    { id: 'no-focused-spec', token: '.only(', reason: 'a focused test silently disables the rest of the suite' },
    { id: 'no-skipped-spec', token: '.skip(', reason: 'a skipped test never runs' },
  ],
  // Files allowed to write to stdout (the harness itself).
  consoleAllowedIn: ['tests/harness/', 'scripts/'],
}

// ── import safety: the rule that would have caught the bug ──
export const IMPORT_SAFETY = {
  id: 'import-safety',
  why: 'A module that never terminates is indistinguishable from a slow device, and impossible to diagnose from a blank screen. `for (let i = 0; i < petals; 2)` compiled cleanly, deployed cleanly, and hung every visitor.',
  guidance: [
    'Every loop condition must be able to become false.',
    'A counter must advance with a compound operator (+=, -=, ++); a bare assignment pins it.',
    'Module-level initialisation runs before first paint, so an unbounded loop there kills the whole app.',
  ],
  // NOTE ON RECURSION: an earlier draft of this file tried to detect unbounded
  // recursion with a regex. It produced false positives on compare.ts and
  // StackPractice.tsx, which contain no recursion at all. A check that cries wolf
  // gets ignored, so the heuristic was removed rather than tuned.
  // Recursion is instead covered by the process timeout: a non-terminating spec
  // is reported as NON-TERMINATING by tests/harness/run.mjs.
  // Detected by tests/specs/conventions.spec.ts -> "import safety"
  checkForLoopsIn: 'src/',
}

// ── test placement ────────────────────────────────────────
export const TEST_PLACEMENT = {
  id: 'test-placement',
  why: 'A test that sits next to what it verifies is found when that code changes. A separate suite is a test nobody runs.',
  // Co-located unit tests are allowed for pure modules.
  colocatedPattern: /\.test\.ts$/,
  colocatedAllowedIn: ['src/geometry/', 'src/storage/'],
  // Everything else is tested from tests/specs/
  integrationDir: 'tests/specs/',
  // Legacy: compare.test.ts predates the harness and cannot run here,
  // because tsx exhausts a 4GB heap. It must not linger.
  deprecated: [
    {
      pattern: 'src/geometry/compare.test.ts',
      reason: 'superseded by tests/specs/geometry.spec.ts; tsx OOMs in this environment',
    },
  ],
}