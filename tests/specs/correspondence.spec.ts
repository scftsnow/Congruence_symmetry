/**
 * Correspondence spec.
 *
 * Three things have to hold, and none of them is "the shapes look the same".
 *
 * The shapes must be legible: if two sides are the same length, or two angles
 * the same size, the child cannot tell which is the partner and would be right
 * to be unsure. A square has four interchangeable corners and would teach
 * nothing.
 *
 * The pairing must be real: side i of the first shape has to be the same length
 * as side i of the second, and the same for every angle. This is the claim the
 * whole unit makes, so it is checked rather than assumed.
 *
 * And the flight must land. The demonstration shows a side travelling onto its
 * partner; if the transform string were malformed the side would sail off to
 * somewhere else and every other check would still pass.
 */

import { describe, it, expect } from '../harness/api'
import {
  angleTransform,
  angleWedge,
  correspondence,
  sideTransform,
} from '../../src/geometry/correspondence'
import { CORRESPONDENCE_PAIRS } from '../../src/geometry/correspondenceShapes'
import { isSimplePolygon, polygonArea } from '../../src/geometry/overlap'
import { applyTransform, identity } from '../../src/geometry/transforms'
import type { Point } from '../../src/geometry/types'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── the unit's own rulers ─────────────────────────────────
//
// Deliberately not exported from the app. The stage prints no measurements, so
// the app has no reason to compute any; these exist so the claims can be checked
// against something other than the code that makes them.

function length(side: [Point, Point]): number {
  return Math.hypot(side[1].x - side[0].x, side[1].y - side[0].y)
}

function sizeOf(angle: { vertex: Point; prev: Point; next: Point }): number {
  const a1 = Math.atan2(angle.prev.y - angle.vertex.y, angle.prev.x - angle.vertex.x)
  const a2 = Math.atan2(angle.next.y - angle.vertex.y, angle.next.x - angle.vertex.x)
  let d = a2 - a1
  while (d <= -Math.PI) d += 2 * Math.PI
  while (d > Math.PI) d -= 2 * Math.PI
  return Math.abs(d) * (180 / Math.PI)
}

/**
 * Apply one of the stage's CSS transform strings to a point.
 *
 * This re-reads the string rather than reusing the maths that produced it, which
 * is the point: the string is what reaches the browser, and a malformed one moves
 * the side off screen while every geometric property stays perfectly true.
 *
 * Returns null rather than throwing, so an unreadable string fails as a named
 * expectation instead of a stack trace.
 */
function applyCss(point: Point, css: string): Point | null {
  const moves = [...css.matchAll(/translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px\s*\)/g)].map(
    (m) => ({ x: Number(m[1]), y: Number(m[2]) }),
  )
  const turn = /rotate\((-?[\d.]+)deg\)/.exec(css)
  if (!turn || moves.length !== 2) return null

  const rad = (Number(turn[1]) * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  // The string is written outermost-first, so it is applied back to front.
  const undo = (p: Point) => ({ x: p.x - moves[0].x, y: p.y - moves[0].y })
  const spin = (p: Point) => ({ x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos })
  const redo = (p: Point) => ({ x: p.x + moves[1].x, y: p.y + moves[1].y })

  return redo(spin(undo(point)))
}

const near = (p: Point | null, q: Point) =>
  p !== null && Math.hypot(p.x - q.x, p.y - q.y) < 0.001

const placed = CORRESPONDENCE_PAIRS.map((pair) => {
  const a = applyTransform(pair.a.vertices, identity(280, 300))
  const b = applyTransform(pair.b.vertices, identity(820, 300))
  return { pair, corr: correspondence(a, b), a, b }
})

// ── the shapes are legible ────────────────────────────────

describe('every shape has parts the child can tell apart', () => {
  it('offers three pairs, from three corners to four with a mirror', () => {
    expect(CORRESPONDENCE_PAIRS.length).toBe(3)
    expect(placed.map((p) => p.a.length)).toEqual([3, 4, 4])
    // the mirror is last, because it is the case where the two shapes look most
    // alike and the pairing is hardest to see
    expect(CORRESPONDENCE_PAIRS[2].transformNote).toContain('뒤집')
  })

  it('has no outline that crosses itself', () => {
    // The congruence board shipped an arrow whose four vertices crossed. Nothing
    // threw and every test passed, because the tests only asked whether two
    // shapes coincided, and two equally broken shapes still do.
    const broken = CORRESPONDENCE_PAIRS.filter(
      (p) => !isSimplePolygon(p.a.vertices) || !isSimplePolygon(p.b.vertices),
    )
    expect(broken.map((p) => p.id).join(', ') || 'ok').toBe('ok')
  })

  it('has a real interior in every shape', () => {
    for (const p of CORRESPONDENCE_PAIRS) {
      expect(polygonArea(p.a.vertices)).toBeGreaterThan(2000)
      expect(polygonArea(p.b.vertices)).toBeGreaterThan(2000)
    }
  })

  it('gives no two sides the same length', () => {
    // If two sides matched, the child could not tell which is the partner, and
    // any answer they gave would be as good as any other.
    const clashes: string[] = []
    for (const p of CORRESPONDENCE_PAIRS) {
      const ls = p.a.vertices.map((v, i) =>
        length([v, p.a.vertices[(i + 1) % p.a.vertices.length]]),
      )
      for (let i = 0; i < ls.length; i++) {
        for (let j = i + 1; j < ls.length; j++) {
          if (Math.abs(ls[i] - ls[j]) < 12) clashes.push(`${p.id} ${i}/${j}`)
        }
      }
    }
    expect(clashes.join(', ') || 'ok').toBe('ok')
  })

  it('gives no two angles the same size', () => {
    const clashes: string[] = []
    for (const { corr } of placed) {
      const as = corr.angles.map((g) => sizeOf(g.a))
      for (let i = 0; i < as.length; i++) {
        for (let j = i + 1; j < as.length; j++) {
          if (Math.abs(as[i] - as[j]) < 10) clashes.push(`${i}/${j}`)
        }
      }
    }
    expect(clashes.join(', ') || 'ok').toBe('ok')
  })

  it('keeps both shapes well inside the canvas', () => {
    for (const { a, b } of placed) {
      for (const p of [...a, ...b]) {
        expect(p.x).toBeGreaterThan(20)
        expect(p.x).toBeLessThan(1080)
        expect(p.y).toBeGreaterThan(20)
        expect(p.y).toBeLessThan(500)
      }
    }
  })

  it('holds the two shapes far enough apart to read as separate', () => {
    for (const { a, b } of placed) {
      let closest = Infinity
      for (const p of a) {
        for (const q of b) closest = Math.min(closest, Math.hypot(p.x - q.x, p.y - q.y))
      }
      expect(closest).toBeGreaterThan(300)
    }
  })
})

// ── the pairing is real ───────────────────────────────────

describe('each pair pairs index for index', () => {
  it('matches the same number of points, sides and angles on both sides', () => {
    for (const { corr, a } of placed) {
      expect(corr.vertices.length).toBe(a.length)
      expect(corr.sides.length).toBe(a.length)
      expect(corr.angles.length).toBe(a.length)
    }
  })

  it('gives every corresponding side the same length', () => {
    // The unit's whole claim. If this failed, the travelling side would arrive
    // short or long and the child would see a fit that is not a fit.
    for (const { corr } of placed) {
      corr.sides.forEach((s, i) => {
        expect(Math.abs(length(s.a) - length(s.b))).toBeLessThan(0.001)
        void i
      })
    }
  })

  it('gives every corresponding angle the same size', () => {
    for (const { corr } of placed) {
      corr.angles.forEach((g) => {
        expect(Math.abs(sizeOf(g.a) - sizeOf(g.b))).toBeLessThan(0.001)
      })
    }
  })

  it('closes the outline: the last side closes back to the first corner', () => {
    for (const { corr, a } of placed) {
      expect(near(corr.sides[a.length - 1].a[1], corr.sides[0].a[0])).toBe(true)
      expect(near(corr.sides[a.length - 1].b[1], corr.sides[0].b[0])).toBe(true)
    }
  })

  it('refuses two shapes with a different number of corners', () => {
    // Silently pairing the first three corners would teach a correspondence that
    // does not exist.
    let threw = false
    try {
      correspondence(
        [{ x: 0, y: 0 }, { x: 1, y: 0 }],
        [{ x: 0, y: 0 }],
      )
    } catch {
      threw = true
    }
    expect(threw).toBe(true)
  })
})

// ── the flight lands ──────────────────────────────────────

describe('a part travels onto its partner exactly', () => {
  it('carries a side onto the corresponding side', () => {
    for (const { corr } of placed) {
      corr.sides.forEach((s) => {
        const css = sideTransform(s.a, s.b)
        expect(near(applyCss(s.a[0], css), s.b[0])).toBe(true)
        expect(near(applyCss(s.a[1], css), s.b[1])).toBe(true)
      })
    }
  })

  it('carries an angle onto the corresponding angle', () => {
    for (const { corr } of placed) {
      corr.angles.forEach((g) => {
        const css = angleTransform(g.a, g.b)
        expect(near(applyCss(g.a.vertex, css), g.b.vertex)).toBe(true)
        expect(near(applyCss(g.a.prev, css), g.b.prev)).toBe(true)
        expect(near(applyCss(g.a.next, css), g.b.next)).toBe(true)
      })
    }
  })

  it('keeps the travelling part the same size it started', () => {
    // A transform that also scaled would arrive looking smaller and the child
    // would read that as the sides being different lengths.
    for (const { corr } of placed) {
      corr.sides.forEach((s) => {
        const css = sideTransform(s.a, s.b)
        expect(css).not.toContain('scale')
      })
      corr.angles.forEach((g) => {
        expect(angleTransform(g.a, g.b)).not.toContain('scale')
      })
    }
  })

  it('turns the wedge by a whole number of degrees', () => {
    // A fractional turn to three decimals is a rounding artefact of the maths,
    // not something the geometry asked for, and it makes the string unreadable.
    const degrees: string[] = []
    for (const { corr } of placed) {
      for (const s of corr.sides) {
        const found = /rotate\((-?[\d.]+)deg\)/.exec(sideTransform(s.a, s.b))
        if (!found) return
        degrees.push(found[1])
      }
    }
    expect(degrees.length > 0).toBe(true)
    for (const d of degrees) expect(d).toMatch(/^-?\d+(\.\d{1,2})?$/)
  })
})

// ── the wedge is drawable ─────────────────────────────────

describe('the angle wedge is a drawable path', () => {
  it('starts and ends on the corner it belongs to', () => {
    for (const { corr } of placed) {
      corr.angles.forEach((g) => {
        const d = angleWedge(g.a, 60)
        expect(d.startsWith(`M ${g.a.vertex.x} ${g.a.vertex.y}`)).toBe(true)
        expect(d.endsWith('Z')).toBe(true)
        expect(d).toContain('A 60 60')
      })
    }
  })

  it('draws the same wedge for a pair, mirrored only in where it sits', () => {
    // The sweep flag follows the sign of the turn between the rays, so the same
    // corner drawn on both shapes comes out the same way round. A wrong flag
    // would fill the reflex and hide the very angle being asked about.
    const flags: string[] = []
    for (const { corr } of placed) {
      for (const g of corr.angles) {
        const fa = /A 60 60 0 \d \d/.exec(angleWedge(g.a, 60))
        const fb = /A 60 60 0 \d \d/.exec(angleWedge(g.b, 60))
        if (!fa || !fb) return
        flags.push(fa[0] === fb[0] ? 'same' : 'differs')
      }
    }
    expect(flags.length > 0).toBe(true)
    expect(flags.filter((f) => f === 'differs').join(', ') || 'ok').toBe('ok')
  })
})

// ── the screen asks rather than steers ────────────────────

describe('the child is never asked to turn anything', () => {
  function source(path: string): string {
    return readFileSync(join(process.cwd(), path), 'utf8')
  }

  it('has no rotate or flip control', () => {
    // The congruence stage makes the same promise. Direction was settled there;
    // bringing a turn control back would tell the child it still matters, which
    // is the opposite of what this unit teaches.
    const stage = source('src/modes/CorrespondenceStage.tsx')
    expect(stage.includes('onRotate')).toBeFalsy()
    expect(stage.includes('onFlip')).toBeFalsy()
    expect(stage.includes('rotateBy')).toBeFalsy()
  })

  it('shows no lengths and no angles in figures', () => {
    // A number the child cannot produce with their own hands is one they can
    // only be told. The overlap percentage was removed from the congruence stage
    // for the same reason, and degrees belong to a later unit anyway.
    const stage = source('src/modes/CorrespondenceStage.tsx')
    const geo = source('src/geometry/correspondence.ts')
    expect(stage.includes('sideLength')).toBeFalsy()
    expect(stage.includes('angleSize')).toBeFalsy()
    expect(geo.includes('sideLength')).toBeFalsy()
    expect(geo.includes('angleSize')).toBeFalsy()
  })

  it('reaches the unit from the home list', () => {
    const app = source('src/App.tsx')
    expect(app.includes('CorrespondenceStage')).toBe(true)
    expect(app.includes("'correspondence'")).toBe(true)
    // and not by unlocking a locked row: the unit is reachable
    expect(/unit-list__item--locked[\s\S]{0,400}correspondence/.test(app)).toBeFalsy()
  })

  it('keeps the wording out of the screen markup', () => {
    // Same rule as the congruence banner: a sentence that only exists inside JSX
    // cannot be read as a sentence, and here the teaching is mostly words.
    const stage = source('src/modes/CorrespondenceStage.tsx')
    expect(stage.includes('빛나는')).toBeFalsy()
    expect(stage.includes('찾아보세요')).toBeFalsy()
    expect(source('src/components/corrText.ts').includes('빛나는')).toBe(true)
  })

  it('holds the state in a hook and the drawing in a component', () => {
    // The screen is a description of what is on it; the sequence is the testable
    // part, and it has to be reachable without mounting React.
    expect(source('src/modes/useCorrespondence.ts')).toBeTruthy()
    expect(source('src/modes/CorrespondenceStage.tsx').includes('useState')).toBeFalsy()
    expect(source('src/components/CorrespondenceScene.tsx').includes('useState')).toBeFalsy()
    expect(source('src/components/CorrespondenceScene.tsx').includes('useEffect')).toBeFalsy()
  })

  it('does not draw more than one pair on the canvas at a time', () => {
    // Two pairs side by side would need the child to hold four figures in mind
    // and decide which two are the question, which is not what this unit is for.
    const scene = source('src/components/CorrespondenceScene.tsx')
    const shapes = (scene.match(/corr-shape/g) || []).length
    expect(shapes).toBe(2)
  })
})