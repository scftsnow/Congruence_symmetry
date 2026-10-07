# Engineering Standards

Rules here are enforced by `npm test`, not by discipline.
A convention nobody verifies is a suggestion.

## Why this document exists

The app shipped once with a blank screen.

```js
for (let i = 0; i < petals; 2) {   // `i = 2`, not `i += 2`
```

`flower()` looped forever at import time. It:

- passed `tsc`
- passed `vite build`
- passed every bundle-level string check
- deployed to GitHub Pages successfully
- then hung every visitor's browser

A build compiles; it never executes. Nothing in the pipeline ran the code, so
nothing noticed. The symptom surfaced only as a 4GB OOM roughly twelve seconds
later, in a browser, with no error message.

## Layering

Dependency arrows point downward only:

```
src/modes/         orchestration: owns state, composes components
     |
     +---> src/components/   presentation only
     |          |
     +---> src/geometry/ <---+
                              |
                        src/storage/   persistence
```

| Legal | Illegal |
| --- | --- |
| `modes -> components` | `geometry -> components` |
| `modes -> geometry` | `geometry -> modes` |
| `components -> geometry` | `components -> modes` |
| `storage -> geometry` | `storage -> modes` |

A leaf layer never imports its parent.

## Layer responsibilities

**`src/geometry/` — pure math.** No React, no DOM, no `window`, no
`localStorage`, no `fetch`. Must be testable with no browser, because a math
bug in here decides what a child is told is correct.

**`src/components/` — render.** Receives state and draws it. May call
`applyTransform` because turning model coordinates into SVG coordinates is
rendering, not deciding. Must not call `checkCongruence` or reach into
comparison internals. Cap: 220 lines.

**`src/modes/` — orchestrate.** Owns domain state, composes components,
delegates all math to `geometry/`. Domain state lives in a `use*` hook so the
logic is testable without mounting React. Cap: 260 lines.

**`src/storage/` — persist.** Reads and writes `localStorage`. Imports only
`geometry/` types.

## State lives in hooks

Domain state goes in a `use*` hook, never inline in a screen. A component that
owns domain state cannot be unit-tested.

Derived state is set in an effect or an event handler, never in the render
body:

```ts
// WRONG: cascades state -> rerender -> state -> rerender
if (result.verdict === 'congruent') setSolvedCount((c) => c + 1)

// RIGHT
useEffect(() => { /* ... */ }, [result.verdict])
```

## Naming

| Path | Form | Example |
| --- | --- | --- |
| `src/components/*.tsx` | PascalCase | `ShapeSvg.tsx` |
| `src/geometry/*.ts` | camelCase | `compare.ts` |
| `src/modes/use*.ts` | `useXxx` | `useStackPractice.ts` |
| `src/modes/*.tsx` | PascalCase | `StackPractice.tsx` |
| `tests/specs/*.spec.ts` | camelCase | `geometry.spec.ts` |

## Import safety

Module-level initialisation runs before first paint, so an unbounded loop
there kills the whole app.

- Every loop condition must be able to become false.
- A counter must advance with `+=`, `-=`, `++`. A bare assignment pins it.
- Recursion needs a depth guard or a memoized visited set.

Recursion is *not* pattern-matched. An earlier attempt produced false positives
on `compare.ts` and `StackPractice.tsx`, which contain no recursion at all. A
check that cries wolf gets ignored. Non-termination is caught by the runner's
timeout instead.

## Testing

### The harness is a harness, not a helper

`npm test` runs every spec in an isolated child process:

```
node --max-old-space-size=128 <bundle>
```

Outcomes are classified, not merely observed:

| Outcome | Reported as |
| --- | --- |
| exit 0 | PASS |
| exit 1 | FAIL (named assertions) |
| SIGKILL / timeout | FAIL **NON-TERMINATING** |
| out of memory | FAIL **NON-TERMINATING (OOM)** |
| other crash | FAIL **CRASHED** |

That classification is the product. A hang becomes a one-second red build
instead of a mystery.

### Why not Vitest or Jest

Dependency installation times out in this environment and `tsx` exhausts a
4GB heap. The hand-rolled harness is not a compromise; it is what runs. It
buys the fail-fast property above for free.

### Spec rules

- Import `describe` / `it` / `expect` from `../harness/api`.
- Assert through `expect` so every failure gets a name. Bare
  `throw new Error` is banned in specs.
- No `.only`, no `.skip`. A focused or skipped test is a test that never runs.
- Korean literals live in `tests/harness/expected.json`. Literal escapes get
  mangled on the way to disk in this environment.

## Pipeline

`npm run verify:all` is the single command that must be green.

| Gate | Command | Catches |
| --- | --- | --- |
| 1 | `npm run lint` | unused code, unsafe patterns |
| 2 | `npm test` | logic errors, infinite loops, convention breaks |
| 3 | `npm run build` | type errors |
| 4 | `npm run verify` | missing UI strings, wrong asset paths |

CI runs gates 1, 2 and 4, then deploys only on `main`.
Gate 2 is the one that would have caught the blank screen.

## Git

- `main` is always green.
- Work on a branch, open a PR, let CI verify.
- Commit prefixes: `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`.

## Local preview

`vite preview` binds IPv6-only by default on Windows, so a browser resolving
`localhost` to `127.0.0.1` gets a connection refusal and a blank page. The
`preview` script therefore passes `--host 127.0.0.1`.

With `base` set for GitHub Pages, the served path is:

```
http://localhost:4173/Congruence_symmetry/
```