/**
 * Geometry engine spec — the mathematical core.
 *
 * Every case traces to a rule a 5th grader has to learn:
 *   - congruence requires the same shape AND the same size
 *   - direction does not matter (rotate or flip it, still congruent)
 *   - size alone makes it NOT congruent, but the shape still matches
 *
 * The last point is the design centrepiece. It is why this app has a scale
 * tool at all: the child must discover "same shape, different size" by
 * dragging, not by being told.
 */

import { describe, it, expect } from '../harness/api'
import { ALL_SHAPES, BASIC_SHAPES, LIFE_SHAPES, findShape, cloneShape } from '../../src/geometry/shapes'
import { applyTransform, identity, rotate180, reflectAcrossLine, midpoint, distance, centroid, bboxCenter, normalizeToOrigin, rotatePoint } from '../../src/geometry/transforms'
import { checkCongruence, compareShape, compareSize, EPSILON_STACK, EPSILON_REDRAW, perimeter, area, bboxExtent } from '../../src/geometry/compare'
import type { Shape } from '../../src/geometry/types'

const CANVAS = 1000
const at = (s: Shape, t: Parameters<typeof applyTransform>[1]) => applyTransform(s.vertices, t)
const SQUARE = findShape('square') as Shape
const TRIANGLE = findShape('triangle') as Shape

// ── shape catalogue ───────────────────────────────────────
describe('shape catalogue', () => {
  it('ships 7 basic and 4 everyday shapes', () => {
    expect(BASIC_SHAPES.length).toBe(7)
    expect(LIFE_SHAPES.length).toBe(4)
    expect(ALL_SHAPES.length).toBe(11)
  })

  it('gives every shape a usable polygon', () => {
    for (const s of ALL_SHAPES) {
      expect(s.vertices.length >= 3).toBeTruthy()
      expect(s.vertices.every((v) => Number.isFinite(v.x) && Number.isFinite(v.y))).toBeTruthy()
      expect(s.color.startsWith('#')).toBeTruthy()
    }
  })

  it('regression: flower() terminates with 12 vertices', () => {
    // `for (let i = 0; i < petals; 2)` made this loop forever at import time,
    // which hung the browser for every visitor. The assertion below can only
    // be reached if the loop terminates.
    const flower = findShape('flower')
    expect(flower).toBeTruthy()
    // 6 petals = 6 outer tips + 6 notches between them
    expect(flower?.vertices.length).toBe(12)
  })

  it('flower spans both axes so it reads as a flower', () => {
    const xs = findShape('flower')!.vertices.map((v) => v.x)
    expect(Math.max(...xs) > 0).toBeTruthy()
    expect(Math.min(...xs) < 0).toBeTruthy()
  })

  it('looks shapes up by id', () => {
    expect(findShape('triangle')?.id).toBe('triangle')
    expect(findShape('__missing__')).toBe(undefined)
  })

  it('clones deeply so editing a copy cannot corrupt the original', () => {
    const copy = cloneShape(SQUARE, 'copy')
    copy.vertices[0].x = 9999
    expect(SQUARE.vertices[0].x).toBe(-50)
  })
})

// ── transforms ────────────────────────────────────────────
describe('transforms', () => {
  it('applies translation', () => {
    const p = at(SQUARE, identity(300, 300))
    expect(p.every((q) => q.x > 200 && q.x < 400)).toBeTruthy()
  })

  it('scales extent proportionally', () => {
    const a = at(SQUARE, identity(300, 300))
    const b = at(SQUARE, { ...identity(300, 300), scale: 2 })
    expect(bboxExtent(b) / bboxExtent(a)).toBeCloseTo(2, 3)
  })

  it('mirrors around the center without moving the center', () => {
    const a = at(SQUARE, identity(300, 300))
    const b = at(SQUARE, { ...identity(300, 300), flipped: true })
    expect(bboxCenter(a).x).toBeCloseTo(bboxCenter(b).x, 6)
  })

  it('rotates 0 degrees as identity', () => {
    expect(rotatePoint({ x: 3, y: 4 }, 0).x).toBe(3)
  })

  it('computes midpoint and distance', () => {
    expect(midpoint({ x: 0, y: 0 }, { x: 10, y: 20 }).x).toBe(5)
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })

  it('computes centroid', () => {
    expect(centroid([{ x: 0, y: 0 }, { x: 10, y: 10 }]).x).toBe(5)
  })

  it('normalizes a shape onto the origin', () => {
    const n = normalizeToOrigin([{ x: 10, y: 10 }, { x: 20, y: 10 }, { x: 20, y: 20 }])
    expect(Math.abs(bboxCenter(n).x)).toBeLessThan(1e-9)
  })
})

// ── symmetry primitives (later units depend on these) ──────
describe('symmetry primitives', () => {
  it('rotates 180 degrees about a point', () => {
    const p = rotate180({ x: 10, y: 20 }, { x: 0, y: 0 })
    expect(p.x).toBe(-10)
    expect(p.y).toBe(-20)
  })

  it('leaves the center of a half-turn fixed', () => {
    const p = rotate180({ x: 5, y: 5 }, { x: 5, y: 5 })
    expect(p.x).toBe(5)
    expect(p.y).toBe(5)
  })

  it('reflects across a vertical axis', () => {
    const p = reflectAcrossLine({ x: 10, y: 4 }, { x: 0, y: -50 }, { x: 0, y: 50 })
    expect(p.x).toBe(-10)
    expect(p.y).toBe(4)
  })

  it('leaves a point on the axis unchanged', () => {
    const p = reflectAcrossLine({ x: 0, y: 9 }, { x: 0, y: -50 }, { x: 0, y: 50 })
    expect(p.x).toBe(0)
  })

  it('survives a degenerate axis instead of dividing by zero', () => {
    const p = reflectAcrossLine({ x: 3, y: 4 }, { x: 1, y: 1 }, { x: 1, y: 1 })
    expect(p.x).toBe(3)
  })

  it('every shipped shape is congruent to its own half-turn', () => {
    for (const s of ALL_SHAPES) {
      const orig = at(s, identity(300, 300))
      const turned = orig.map((p) => rotate180(p, { x: 300, y: 300 }))
      const r = checkCongruence(orig, turned, EPSILON_STACK, CANVAS, false)
      expect(r.isCongruent).toBeTruthy()
    }
  })

  it('every basic shape is congruent to its own mirror', () => {
    for (const s of BASIC_SHAPES) {
      const orig = at(s, identity(300, 300))
      const mirrored = orig.map((p) => reflectAcrossLine(p, { x: 300, y: -100 }, { x: 300, y: 700 }))
      expect(checkCongruence(orig, mirrored, EPSILON_STACK, CANVAS, false).isCongruent).toBeTruthy()
    }
  })
})

// ── congruence: the core rule ─────────────────────────────
describe('a shape is congruent to itself', () => {
  for (const s of BASIC_SHAPES) {
    it(s.id, () => {
      const a = at(s, identity(300, 300))
      const r = checkCongruence(a, a, EPSILON_STACK, CANVAS, true)
      expect(r.verdict).toBe('congruent')
      expect(r.shapeMatches).toBeTruthy()
      expect(r.sizeMatches).toBeTruthy()
      expect(r.isCongruent).toBeTruthy()
    })
  }
})

describe('direction does not affect congruence', () => {
  for (const s of BASIC_SHAPES) {
    it(`${s.id} survives 45/90/180/270 degrees`, () => {
      const a = at(s, identity(300, 300))
      for (const deg of [45, 90, 180, 270]) {
        const b = at(s, { ...identity(300, 300), rotation: deg })
        expect(checkCongruence(a, b, EPSILON_STACK, CANVAS, true).isCongruent).toBeTruthy()
      }
    })

    it(`${s.id} survives a flip`, () => {
      const a = at(s, identity(300, 300))
      const b = at(s, { ...identity(300, 300), flipped: true })
      expect(checkCongruence(a, b, EPSILON_STACK, CANVAS, true).isCongruent).toBeTruthy()
    })
  }
})

describe('size is judged separately from shape', () => {
  for (const s of BASIC_SHAPES) {
    it(`${s.id} scaled is shape-only, never plain different`, () => {
      const a = at(s, identity(300, 300))
      const b = at(s, { ...identity(300, 300), scale: 1.4 })
      const r = checkCongruence(a, b, EPSILON_STACK, CANVAS, true)

      // The child must be able to discover "same shape, different size".
      expect(r.shapeMatches).toBeTruthy()
      expect(r.sizeMatches).toBeFalsy()
      expect(r.verdict).toBe('shape-only')
      expect(r.isCongruent).toBeFalsy()
    })
  }

  it('compareShape ignores size on its own', () => {
    const a = at(SQUARE, identity(300, 300))
    const b = at(SQUARE, { ...identity(300, 300), scale: 3 })
    expect(compareShape(a, b, 0.015 * CANVAS, perimeter(a)).matches).toBeTruthy()
  })

  it('compareSize catches the scale factor', () => {
    const a = at(SQUARE, identity(300, 300))
    const b = at(SQUARE, { ...identity(300, 300), scale: 2 })
    expect(compareSize(a, b, EPSILON_STACK).matches).toBeFalsy()
  })
})

describe('different shapes are not congruent', () => {
  it('square vs triangle', () => {
    const r = checkCongruence(at(SQUARE, identity(300, 300)), at(TRIANGLE, identity(300, 300)), EPSILON_STACK, CANVAS, true)
    expect(r.verdict).toBe('different')
    expect(r.shapeMatches).toBeFalsy()
  })

  it('square vs rectangle are different shapes, not different sizes', () => {
    const r = checkCongruence(at(SQUARE, identity(300, 300)), at(findShape('rectangle') as Shape, identity(300, 300)), EPSILON_STACK, CANVAS, true)
    expect(r.shapeMatches).toBeFalsy()
    expect(r.verdict).toBe('different')
  })

  it('ignores position when position checking is off', () => {
    const a = at(TRIANGLE, identity(100, 100))
    const b = at(TRIANGLE, identity(800, 700))
    expect(checkCongruence(a, b, EPSILON_STACK, CANVAS, false).shapeMatches).toBeTruthy()
  })

  it('rejects a far-apart pair when position checking is on', () => {
    const a = at(TRIANGLE, identity(100, 100))
    const b = at(TRIANGLE, identity(800, 700))
    expect(checkCongruence(a, b, EPSILON_STACK, CANVAS, true).isCongruent).toBeFalsy()
  })
})

describe('tolerance forgives imprecise dragging', () => {
  it('accepts a 2px drift', () => {
    const a = at(SQUARE, identity(300, 300))
    expect(checkCongruence(a, at(SQUARE, identity(302, 300)), EPSILON_STACK, CANVAS, true).isCongruent).toBeTruthy()
  })

  it('accepts a 10px drift', () => {
    const a = at(SQUARE, identity(300, 300))
    expect(checkCongruence(a, at(SQUARE, identity(310, 300)), EPSILON_STACK, CANVAS, true).isCongruent).toBeTruthy()
  })

  it('rejects a 60px drift', () => {
    const a = at(SQUARE, identity(300, 300))
    expect(checkCongruence(a, at(SQUARE, identity(360, 300)), EPSILON_STACK, CANVAS, true).isCongruent).toBeFalsy()
  })

  it('the redraw mode tolerates more than the stacking mode', () => {
    const a = at(SQUARE, identity(300, 300))
    const b = at(SQUARE, identity(318, 300))
    expect(checkCongruence(a, b, EPSILON_REDRAW, CANVAS, true).isCongruent).toBeTruthy()
    expect(EPSILON_REDRAW > EPSILON_STACK).toBeTruthy()
  })
})

// ── measurement helpers ───────────────────────────────────
describe('measurement helpers', () => {
  it('measures perimeter and area of a square', () => {
    const square100 = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ]
    expect(perimeter(square100)).toBeCloseTo(400, 6)
    expect(area(square100)).toBeCloseTo(10000, 6)
  })

  it('measures bbox extent', () => {
    const pts = [{ x: 0, y: 0 }, { x: 30, y: 80 }]
    expect(bboxExtent(pts)).toBe(80)
  })
})

// ── degenerate input must not throw ───────────────────────
describe('degenerate input is safe', () => {
  it('two empty shapes match', () => {
    expect(checkCongruence([], [], EPSILON_STACK, CANVAS, true).verdict).toBe('congruent')
  })

  it('mismatched vertex counts are different', () => {
    const r = checkCongruence([{ x: 0, y: 0 }, { x: 1, y: 1 }], [{ x: 0, y: 0 }], EPSILON_STACK, CANVAS, true)
    expect(r.verdict).toBe('different')
  })

  it('helpers return zero rather than NaN', () => {
    expect(perimeter([])).toBe(0)
    expect(area([])).toBe(0)
    expect(bboxExtent([])).toBe(0)
  })
})

const { report } = await import('../harness/spec.mjs')
report()