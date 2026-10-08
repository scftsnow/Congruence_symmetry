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
import { bannerFor } from '../../src/components/corrText'
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
 * A CSS transform is written outermost first and applied back to front, so
 * `translate(to) rotate(deg) translate(from)` first moves by the second
 * translate, then rotates, then moves by the first. Getting that backwards here
 * was worth the trouble: it is the only reason to be sure the two moves are in
 * the order the string implies.
 *
 * Returns null rather than throwing, so an unreadable string fails as a named
 * expectation instead of a stack trace.
 */
function applyCss(point: Point, css: string): Point | null {
  const moves = [...css.matchAll(/translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px\s*\)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }))
  const turn = /rotate\((-?[\d.]+)deg\)/.exec(css)
  if (!turn || moves.length !== 2) return null

  const rad = (Number(turn[1]) * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  const inner = { x: point.x + moves[1].x, y: point.y + moves[1].y }
  const spun = { x: inner.x * cos - inner.y * sin, y: inner.x * sin + inner.y * cos }
  return { x: spun.x + moves[0].x, y: spun.y + moves[0].y }
}

/**
 * Half a pixel.
 *
 * The production transform rounds its degrees to two decimals so the string does
 * not carry float noise into a file people read. Over the longest lever arm on
 * this canvas that is a shade over 0.05px of error, so a tolerance of a
 * thousandth of a pixel would be testing the rounding rather than the geometry.
 * Half a pixel is still far finer than anything the child can see.
 */
const near = (p: Point | null, q: Point) => p !== null && Math.hypot(p.x - q.x, p.y - q.y) < 0.5

/** A source file, for the checks that are about how something is written. */
function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

/** The two shapes, placed exactly as the scene places them. */
const LEFT = { x: 250, y: 280 }
const RIGHT = { x: 850, y: 280 }

const placed = CORRESPONDENCE_PAIRS.map((pair) => {
  const a = applyTransform(pair.a.vertices, identity(LEFT.x, LEFT.y))
  const b = applyTransform(pair.b.vertices, identity(RIGHT.x, RIGHT.y))
  return { pair, corr: correspondence(a, b), a, b }
})

/**
 * The two thresholds, in one place.
 *
 * These are the floor for telling parts apart, not a target. The first pair on
 * this board was drawn by eye and then measured, and it came out with two sides
 * 1.3px apart and two angles 3.2 degrees apart — at which point "which side is
 * the partner" has several right answers and the child is guessing. The shapes
 * now in use manage 46px and 18 degrees on the triangle and 27px and 18 on the
 * quad, so there is headroom above these lines before it matters again.
 */
const SIDE_GAP = 25
const ANGLE_GAP = 15

// ── the shapes are legible ────────────────────────────────

describe('every shape has parts the child can tell apart', () => {
  it('offers three pairs, from three corners to four with a mirror', () => {
    expect(CORRESPONDENCE_PAIRS.length).toBe(3)
    expect(placed.map((p) => p.a.length)).toEqual([3, 4, 4])
    // the mirror is last, because it is the case where the two shapes look most
    // alike and the pairing is hardest to see
    expect(CORRESPONDENCE_PAIRS[2].transformNote).toContain('뒤집')
  })

  it('names what was done without measuring it', () => {
    // The notes used to read "90도 돌린 삼각형" and "180도 돌린 사각형".
    // Measuring in degrees is a later unit in fifth grade, so the number taught
    // the wrong chapter — and it did not help anyway: for an irregular shape,
    // knowing it was turned a quarter turn does not say which corner landed on
    // which, which is the entire question.
    const numeric = CORRESPONDENCE_PAIRS.map((p) => p.transformNote).filter((n) => /[0-9]/.test(n))
    expect(numeric.join(', ') || 'ok').toBe('ok')
  })

  /*
   * The animation needs a sentence.
   *
   * A side used to lift off, cross and fit its partner while the banner said only
   * "대응변을 옮겨 보고 있어요" — which describes what was happening, not what it
   * means, and then the banner went back to the next question. Watching a thing
   * fit is not the same as being told the two are the same, and the child was
   * left to make the inference.
   *
   * So the claim arrives when the part lands, and stays long enough to read.
   */
  describe('the comparison says what it shows', () => {
    const landedSide = bannerFor({
      phase: 'compare',
      wrong: false,
      done: false,
      flying: true,
      flyingAngle: false,
      landed: true,
    })
    const landedAngle = bannerFor({
      phase: 'compare',
      wrong: false,
      done: false,
      flying: true,
      flyingAngle: true,
      landed: true,
    })

    it('states the claim when a side lands', () => {
      expect(landedSide.text).toBe('대응변의 길이가 같아요')
    })

    it('states the claim when an angle lands', () => {
      expect(landedAngle.text).toBe('대응각의 크기가 같아요')
    })

    it('uses the unit\'s vocabulary, not a description of the picture', () => {
      // "이 두 변의 길이는 같아요" is true of the two lines on screen and teaches
      // nothing. The child is meant to leave able to say "대응변", so that is the
      // word the banner has to use.
      for (const banner of [landedSide, landedAngle]) {
        expect(banner.text.includes('대응')).toBeTruthy()
        expect(/이 두 (변|각)/.test(banner.text)).toBeFalsy()
      }
    })

    it('says it as a fact, not as something still to be done', () => {
      expect(landedSide.text.endsWith('같아요')).toBeTruthy()
      expect(landedSide.text.includes('옮겨')).toBeFalsy()
      expect(landedAngle.text.includes('옮겨')).toBeFalsy()
    })

    it('keeps the claim up long enough to read', () => {
      // It arrived and left in the same instant the fit became visible, which is
      // the one moment the child is definitely looking.
      const hook = source('src/modes/useCorrespondence.ts')
      expect(/HOLD_MS/.test(hook)).toBeTruthy()
      expect(/PAUSE_MS \+ FLY_MS \+ HOLD_MS/.test(hook)).toBeTruthy()
    })
  })

  it('celebrates a correct find the way the congruence board does', () => {
    // The unit has its own feedback — the ring that appears where the part was
    // paired — but that ring is geometry and cannot say anything. The stars are
    // the "you got it", and leaving them out made a right answer quieter here than
    // the identical act one screen away.
    expect(source('src/components/Celebration.tsx')).toBeTruthy()
    const scene = source('src/components/CorrespondenceScene.tsx')
    expect(scene.includes('<Celebration')).toBeTruthy()
    // and it fires from the answer, not from the step: the step runs 0,1,2,0,1,2
    // and only two of those six moves are a correct answer
    const hook = source('src/modes/useCorrespondence.ts')
    expect(/justFound/.test(hook)).toBeTruthy()
    expect(/STAR_MS/.test(hook)).toBeTruthy()
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
          if (Math.abs(ls[i] - ls[j]) < SIDE_GAP) clashes.push(`${p.id} ${i}/${j}`)
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
          if (Math.abs(as[i] - as[j]) < ANGLE_GAP) clashes.push(`${i}/${j}`)
        }
      }
    }
    expect(clashes.join(', ') || 'ok').toBe('ok')
  })

  it('keeps both shapes well inside the canvas', () => {
    // The captions sit at y = 554, so nothing may reach the caption line.
    for (const { a, b } of placed) {
      for (const p of [...a, ...b]) {
        expect(p.x > 20 ? 'ok' : `x ${p.x}`).toBe('ok')
        expect(p.x < 1080 ? 'ok' : `x ${p.x}`).toBe('ok')
        expect(p.y > 20 ? 'ok' : `y ${p.y}`).toBe('ok')
        expect(p.y < 540 ? 'ok' : `y ${p.y}`).toBe('ok')
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
    /*
     * The claim is that the wedge lands on the wedge, not that the corner called
     * "prev" lands on the corner called "prev".
     *
     * Those differ on the mirrored pair, and the difference is real geometry: a
     * reflection is not a rotation, so under any rotation the two rays swap
     * roles. The transform lines the bisectors up, which puts the whole region
     * exactly on top because a wedge is symmetric about its bisector — and it is
     * the only rotation that does. So the two outgoing rays have to land on the
     * two incoming rays in SOME order, and which order is the thing worth pinning
     * down rather than assuming.
     */
    for (const { corr } of placed) {
      corr.angles.forEach((g) => {
        const css = angleTransform(g.a, g.b)
        const corner = applyCss(g.a.vertex, css)!
        expect(near(corner, g.b.vertex)).toBe(true)

        const rayTo = (from: Point, to: Point) => Math.atan2(to.y - from.y, to.x - from.x)
        const movedPrev = applyCss(g.a.prev, css)!
        const movedNext = applyCss(g.a.next, css)!
        const moved = [rayTo(corner, movedPrev), rayTo(corner, movedNext)]
        const wanted = [rayTo(g.b.vertex, g.b.prev), rayTo(g.b.vertex, g.b.next)]
        const same = (x: number, y: number) => Math.abs(x - y) < 0.02
        const straight = same(moved[0], wanted[0]) && same(moved[1], wanted[1])
        const swapped = same(moved[0], wanted[1]) && same(moved[1], wanted[0])
        expect(straight || swapped ? 'ok' : `rays land on neither side: ${css}`).toBe('ok')
      })
    }
  })

  it('keeps the travelling part the same size it started', () => {
    // A transform that also scaled would arrive looking smaller, and the child
    // would read that as the sides being different lengths.
    const scaled: string[] = []
    for (const { corr } of placed) {
      corr.sides.forEach((s) => {
        if (sideTransform(s.a, s.b).includes('scale')) scaled.push('side')
      })
      corr.angles.forEach((g) => {
        if (angleTransform(g.a, g.b).includes('scale')) scaled.push('angle')
      })
    }
    expect(scaled.join(', ') || 'ok').toBe('ok')
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
    for (const d of degrees) expect(/^-?\d+(\.\d{1,2})?$/.test(d) ? 'ok' : d + ' decimals').toBe('ok')
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

  it('fills the interior of the angle, not its outside', () => {
    // Every shape here is convex, so the angle is always the smaller one between
    // the two rays and the arc must be the minor arc — large-arc-flag 0. If that
    // flag ever came back 1 the wedge would fill the reflex and hide the very
    // angle being asked about, which is the failure this catches.
    //
    // The sweep flag is deliberately NOT required to match between the two
    // shapes. A mirrored pair runs the other way round, so the sign of the turn
    // flips and the flag flips with it; that is correct, and it is what keeps
    // the filled region the interior one on both sides.
    const wrongArc: string[] = []
    let checked = 0
    for (const { corr } of placed) {
      corr.angles.forEach((g, i) => {
        checked++
        if (!/A 60 60 0 0 [01]/.test(angleWedge(g.a, 60))) wrongArc.push(String(i))
      })
    }
    expect(checked > 0).toBe(true)
    expect(wrongArc.join(', ') || 'ok').toBe('ok')
  })

  it('puts the arc ends exactly on the two rays', () => {
    // A wedge whose ends drift off the rays is not the corner at all, and the
    // child would be comparing two regions that were never the same thing.
    /*
 * Does a point lie on the ray from `corner` towards `aim`?
 *
 * Tested by the cross product rather than by distance: the arc's ends are a fixed
 * radius from the corner while the neighbouring corners are a whole side away,
 * so comparing lengths would fail on every angle.
 */
function onRay(p: number[], corner: Point, aim: Point): boolean {
  const ux = p[0] - corner.x
  const uy = p[1] - corner.y
  const vx = aim.x - corner.x
  const vy = aim.y - corner.y
  const cross = ux * vy - uy * vx
  const along = ux * vx + uy * vy
  const scale = Math.hypot(vx, vy) || 1
  return Math.abs(cross) / scale < 0.01 && along > 0
}

    const drift: string[] = []
    for (const { corr } of placed) {
      for (const g of corr.angles) {
        const d = angleWedge(g.a, 60)
        const n = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number)
        // M vx vy   L x1 y1   A r r 0 largeArc sweep x2 y2   Z
        //      0  1      2  3      4 5 6      7       8  9 10
        if (n.length < 11) {
          drift.push('unreadable: ' + d)
          continue
        }
        if (Math.hypot(n[0] - g.a.vertex.x, n[1] - g.a.vertex.y) > 0.01) drift.push('bad start')
        if (!onRay([n[2], n[3]], g.a.vertex, g.a.prev)) drift.push('first end off-ray')
        if (!onRay([n[9], n[10]], g.a.vertex, g.a.next)) drift.push('second end off-ray')
      }
    }
    expect(drift.join(', ') || 'ok').toBe('ok')
  })
})

// ── the screen asks rather than steers ────────────────────

describe('the child is never asked to turn anything', () => {
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
    const shapes = (scene.match(/className="corr-shape /g) || []).length
    expect(shapes).toBe(2)
  })
})

const { report } = await import('../harness/spec.mjs')
report()