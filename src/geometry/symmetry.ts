/**
 * Line symmetry — which straight line folds a shape exactly onto itself.
 *
 * WHY THIS EXISTS
 * ---------------
 * Congruence asked whether two shapes coincide. Correspondence asked which part
 * of one meets which part of the other. Symmetry asks a harder question about a
 * single shape: is there a line that folds it exactly onto itself, and if so,
 * where is that line.
 *
 * The child draws the line. That is the whole exercise, and it is theirs alone:
 * unlike the congruence board, where direction was the system's problem, here
 * the direction of the line IS the answer, so the system must not choose it.
 * What the system does instead is fold along whatever was drawn, so the child
 * watches the claim succeed or fail rather than being told about it.
 *
 * HOW AN AXIS IS JUDGED
 * ---------------------
 * A drawn axis counts when two things hold: its direction matches one of the
 * shape's true axes, and it passes close to the shape's middle. Either condition
 * alone is not enough — a parallel line a hand's width away folds nothing onto
 * anything, and a line through the middle at the wrong angle folds the shape
 * onto empty space.
 *
 * The true axes are found, not declared: every axis of a symmetric polygon runs
 * through its centroid and through a vertex or an edge midpoint, so those lines
 * are tried and the ones that reflect the shape onto itself are kept. Declaring
 * the answers by hand would mean the test trusted the same hand that drew the
 * shapes.
 *
 * NO FIGURES IN THE UI
 * --------------------
 * The tolerances below are in pixels and degrees because geometry has to be
 * measured in something. None of it reaches the screen: no angle size, no
 * length, no degree count is printed or spoken anywhere in this unit, for the
 * same reason the overlap percentage was removed from the congruence stage.
 */

import type { Point } from './types'
import { polygonCentroid } from './overlap'
import { reflectAcrossLine } from './transforms'
import { SYMM_CENTER } from './symmetryShapes'

/** A straight line, as two snapped points on it. */
export interface Axis {
  a: Point
  b: Point
}

/** The grid everything snaps to, in pixels. Same pitch as the board grid. */
export const SNAP_PITCH = 50
/** A press without a real drag is not a line. */
export const MIN_DRAG = 40
/** A snapped axis is never shorter than this, so it reads as a line. */
export const MIN_AXIS = 100
/** How far a drawn axis may sit from the shape's middle and still count. */
export const CENTER_TOLERANCE = 25
/** How far a drawn direction may sit from a true one and still count. */
export const ANGLE_TOLERANCE = 10

function snappedCoord(v: number): number {
  return Math.round(v / SNAP_PITCH) * SNAP_PITCH
}

/**
 * Straighten a finger-drawn line onto the grid.
 *
 * Both ends land on lattice crossings and the direction lands on one of the
 * eight compass ways round (horizontal, vertical, both diagonals). Rounding a
 * diagonal keeps it a diagonal: from a lattice point the two components stay
 * equal through the rounding, so 45 degrees stays 45 degrees.
 *
 * Returns null when the gesture was a tap rather than a drag. A tap is not an
 * attempt — judging it would answer a question the child never asked, the same
 * reason a bare tap on the congruence board judges nothing.
 */
export function snapAxisToGrid(p: Point, q: Point): Axis | null {
  if (Math.hypot(q.x - p.x, q.y - p.y) < MIN_DRAG) return null

  const a = { x: snappedCoord(p.x), y: snappedCoord(p.y) }
  const raw = Math.atan2(q.y - p.y, q.x - p.x)
  const direction = Math.round(raw / (Math.PI / 4)) * (Math.PI / 4)
  const length = Math.max(MIN_AXIS, Math.round(Math.hypot(q.x - p.x, q.y - p.y) / SNAP_PITCH) * SNAP_PITCH)

  let b = {
    x: snappedCoord(a.x + length * Math.cos(direction)),
    y: snappedCoord(a.y + length * Math.sin(direction)),
  }
  if (b.x === a.x && b.y === a.y) {
    b = { x: a.x + SNAP_PITCH * Math.cos(direction), y: a.y + SNAP_PITCH * Math.sin(direction) }
  }
  return { a, b }
}

/** The direction of an axis, folded into [0, 180). */
export function axisAngle(axis: Axis): number {
  let deg = (Math.atan2(axis.b.y - axis.a.y, axis.b.x - axis.a.x) * 180) / Math.PI
  while (deg < 0) deg += 180
  while (deg >= 180) deg -= 180
  return deg
}

/** How far a point sits from an infinite line. */
export function distanceToLine(p: Point, axis: Axis): number {
  const dx = axis.b.x - axis.a.x
  const dy = axis.b.y - axis.a.y
  const len = Math.hypot(dx, dy)
  if (len === 0) return Infinity
  return Math.abs(dx * (axis.a.y - p.y) - dy * (axis.a.x - p.x)) / len
}

/**
 * Does an infinite line cross a rectangle.
 *
 * A symmetry axis of a bounded shape always meets the shape, so a line that
 * misses it entirely is a different kind of miss from a wrong angle — and gets
 * a different hint.
 */
export function lineHitsRect(
  axis: Axis,
  rect: { minX: number; minY: number; maxX: number; maxY: number },
): boolean {
  const dx = axis.b.x - axis.a.x
  const dy = axis.b.y - axis.a.y
  let tmin = -Infinity
  let tmax = Infinity

  const slab = (p: number, d: number, lo: number, hi: number): boolean => {
    if (Math.abs(d) < 1e-12) return p >= lo && p <= hi
    let t1 = (lo - p) / d
    let t2 = (hi - p) / d
    if (t1 > t2) [t1, t2] = [t2, t1]
    tmin = Math.max(tmin, t1)
    tmax = Math.min(tmax, t2)
    return tmin <= tmax
  }

  return (
    slab(axis.a.x, dx, rect.minX, rect.maxX) && slab(axis.a.y, dy, rect.minY, rect.maxY)
  )
}

/** The bounding box of a shape, grown by a margin. */
export function paddedBox(points: Point[], pad: number): { minX: number; minY: number; maxX: number; maxY: number } {
  return {
    minX: Math.min(...points.map((p) => p.x)) - pad,
    minY: Math.min(...points.map((p) => p.y)) - pad,
    maxX: Math.max(...points.map((p) => p.x)) + pad,
    maxY: Math.max(...points.map((p) => p.y)) + pad,
  }
}

/**
 * All the lines that fold a shape exactly onto itself.
 *
 * Every axis runs through the centroid, so the lines through the centroid and
 * each vertex or edge midpoint are tried, and the ones that reflect the shape
 * onto itself are kept. Near-duplicates are merged: adjacent candidates 5
 * degrees apart are the same axis found twice, not two axes.
 */
export function findAxes(points: Point[]): Axis[] {
  const center = polygonCentroid(points)
  const seeds: Point[] = []
  for (let i = 0; i < points.length; i++) {
    seeds.push(points[i])
    const next = points[(i + 1) % points.length]
    seeds.push({ x: (points[i].x + next.x) / 2, y: (points[i].y + next.y) / 2 })
  }

  const found: Axis[] = []
  for (const seed of seeds) {
    if (Math.hypot(seed.x - center.x, seed.y - center.y) < 1e-9) continue
    const axis: Axis = {
      a: { x: center.x - (seed.x - center.x), y: center.y - (seed.y - center.y) },
      b: { x: seed.x, y: seed.y },
    }
    if (!isAxisSymmetric(points, axis)) continue
    const angle = axisAngle(axis)
    if (found.some((f) => Math.abs(axisAngle(f) - angle) < 5)) continue
    found.push(axis)
  }
  return found
}

/** Does reflecting across this line put the shape back onto itself. */
export function isAxisSymmetric(points: Point[], axis: Axis): boolean {
  // By vertex permutation, not by overlap area — and the reason is measured,
  // not guessed. Reflecting the isosceles triangle across the line through its
  // centroid and one base corner shares that corner, so the image overlaps the
  // original at 0.98 coverage both ways: above the 0.97 that means "coincide"
  // everywhere else in this codebase, for a line that is plainly not an axis.
  // Area sampling cannot tell a true symmetry from a near miss through a
  // shared vertex. Permuting the vertices can: a reflection is an isometry, so
  // if every mirrored corner lands on some original corner, the outline is the
  // same outline. True mirrors land within a rounding error; the near miss
  // above lands its corners nearly five pixels away.
  const EPS = 1
  return points.every((p) => {
    const m = reflectAcrossLine(p, axis.a, axis.b)
    return points.some((q) => Math.hypot(q.x - m.x, q.y - m.y) <= EPS)
  })
}

/** Is there any line that folds this shape onto itself. */
export function isLineSymmetric(points: Point[]): boolean {
  return findAxes(points).length > 0
}

/**
 * Judge a drawn screen axis against local vertices.
 *
 * The conversion happens exactly once, here, and that onceness is the point.
 * An earlier version subtracted the centre from vertices that were already
 * local, shifting the shape a whole screen away — every drawn line then missed
 * a shape that was nowhere near it, and every correct answer was met with "draw
 * it on the shape". Screen layout enters the judgement in this one subtraction
 * and nowhere else.
 */
export function judgeAxis(vertices: Point[], axis: Axis): 'off' | 'miss' | 'hit' {
  const sub = (p: Point): Point => ({ x: p.x - SYMM_CENTER.x, y: p.y - SYMM_CENTER.y })
  const line: Axis = { a: sub(axis.a), b: sub(axis.b) }
  if (!lineHitsRect(line, paddedBox(vertices, 10))) return 'off'
  // A shape with no axis has nothing to match: any line drawn on it is a miss,
  // never a find. Letting it through would settle the board — any scribble
  // would pass, and the "there is none" answer would stand for nothing.
  if (axisMatches(line, vertices)) return 'hit'
  return 'miss'
}

/**
 * Which true axis a drawn screen axis counts as, or -1.
 *
 * Same conversion as judgeAxis, then the index. The hook asks this only after
 * a hit, so the -1 here means "a right answer on a shape with no axes" — the
 * asymmetric shape, whose every fold is the conclusion rather than a find.
 */
export function matchScreenAxis(vertices: Point[], axis: Axis): number {
  if (!isLineSymmetric(vertices)) return -1
  const sub = (p: Point): Point => ({ x: p.x - SYMM_CENTER.x, y: p.y - SYMM_CENTER.y })
  return matchAxisIndex({ a: sub(axis.a), b: sub(axis.b) }, vertices)
}

/**
 * Which true axis a drawn line counts as, or -1.
 *
 * A shape with several axes needs every one of them found, so "right" is not
 * enough — the hook has to know WHICH right answer just arrived, and whether
 * it is new. The index is into findAxes, whose seed order is fixed, so the
 * same shape always numbers its axes the same way.
 */
export function matchAxisIndex(drawn: Axis, points: Point[]): number {
  const center = polygonCentroid(points)
  if (distanceToLine(center, drawn) > CENTER_TOLERANCE) return -1
  const angle = axisAngle(drawn)
  const axes = findAxes(points)
  for (let i = 0; i < axes.length; i++) {
    let diff = Math.abs(axisAngle(axes[i]) - angle)
    if (diff > 90) diff = 180 - diff
    if (diff <= ANGLE_TOLERANCE) return i
  }
  return -1
}

/**
 * Does a drawn axis count as one of the true ones.
 *
 * Direction within tolerance of a true axis, and the shape's middle within
 * tolerance of the drawn line. Both are needed; either alone folds nothing.
 */
export function axisMatches(drawn: Axis, points: Point[]): boolean {
  return matchAxisIndex(drawn, points) >= 0
}

/**
 * Split a shape into the two halves on either side of a line.
 *
 * Sutherland–Hodgman against a half-plane, which is exact for any simple
 * subject because the clip region itself is convex. The concavity of the
 * heart changes nothing here — unlike the overlap clipper, which needed
 * triangle-against-triangle for two concave outlines meeting.
 *
 * One half stays, the other folds. Which one moves is fixed: the side the
 * directed axis points away from. Either half would do visually, but it has
 * to be deterministic, or the same drawn line would fold left one time and
 * right the next.
 *
 * When the line misses the shape entirely there is nothing to split, so the
 * whole outline is handed over as the moving half. Folding nothing for the
 * length of the animation would read as the app freezing; folding the whole
 * thing still shows the motion, and the verdict afterwards says the line
 * never met the shape.
 */
export function splitByAxis(
  points: Point[],
  axis: Axis,
): { stay: Point[]; fold: Point[] } {
  const dx = axis.b.x - axis.a.x
  const dy = axis.b.y - axis.a.y
  const sideOf = (p: Point): number => dx * (p.y - axis.a.y) - dy * (p.x - axis.a.x)
  const cross = (p: Point, q: Point): Point => {
    const sp = sideOf(p)
    const sq = sideOf(q)
    const t = sp / (sp - sq)
    return { x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y) }
  }
  const clip = (keepPositive: boolean): Point[] => {
    const out: Point[] = []
    const n = points.length
    if (n === 0) return out
    const inside = (p: Point): boolean =>
      keepPositive ? sideOf(p) >= 0 : sideOf(p) <= 0
    for (let i = 0; i < n; i++) {
      const current = points[i]
      const previous = points[(i - 1 + n) % n]
      const currentInside = inside(current)
      const previousInside = inside(previous)
      if (currentInside) {
        if (!previousInside) out.push(cross(previous, current))
        out.push(current)
      } else if (previousInside) {
        out.push(cross(previous, current))
      }
    }
    return out
  }

  const stay = clip(true)
  const fold = clip(false)
  if (stay.length < 3 || fold.length < 3) return { stay: [], fold: points }
  return { stay, fold }
}

/**
 * Where a point lands partway through the fold.
 *
 * At s = 1 the point is where it started; at s = -1 it is mirrored. Between
 * them it travels through the axis itself, which is what makes the motion read
 * as paper folding rather than as one picture fading into another.
 */
export function foldPoint(p: Point, axis: Axis, s: number): Point {
  const theta = Math.atan2(axis.b.y - axis.a.y, axis.b.x - axis.a.x)
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  const dx = p.x - axis.a.x
  const dy = p.y - axis.a.y
  // into the axis frame, squash across it, back out. The along-axis component
  // never moves — an earlier draft scaled it instead, which sent the halfway
  // point off the axis and the landing off the mirror.
  const along = dx * cos + dy * sin
  const across = (-dx * sin + dy * cos) * s
  return {
    x: axis.a.x + along * cos - across * sin,
    y: axis.a.y + along * sin + across * cos,
  }
}

/**
 * The fold as a CSS transform, so the browser interpolates it.
 *
 * Same reason the congruence stage's turns animate: recomputed coordinates
 * would jump between frames with nothing to transition, while a transform in
 * CSS swings the shape round. Written outermost-first, applied back to front.
 */
export function foldTransform(axis: Axis, s: number): string {
  const deg = (Math.atan2(axis.b.y - axis.a.y, axis.b.x - axis.a.x) * 180) / Math.PI
  const rounded = Math.round(s * 1000) / 1000
  return (
    `translate(${axis.a.x}px, ${axis.a.y}px) ` +
    `rotate(${deg}deg) scale(1, ${rounded}) rotate(${-deg}deg) ` +
    `translate(${-axis.a.x}px, ${-axis.a.y}px)`
  )
}

/**
 * Stretch an axis across the whole canvas for display.
 *
 * The child draws a segment; the axis is a line. Showing the segment would make
 * "the axis" look like something with ends, and its ends are wherever the finger
 * stopped, which is nothing to do with the answer.
 */
export function extendAxisToRect(axis: Axis, w: number, h: number): Axis {
  const dx = axis.b.x - axis.a.x
  const dy = axis.b.y - axis.a.y
  let tmin = -Infinity
  let tmax = Infinity

  const slab = (p: number, d: number, lo: number, hi: number): boolean => {
    if (Math.abs(d) < 1e-12) return p >= lo && p <= hi
    let t1 = (lo - p) / d
    let t2 = (hi - p) / d
    if (t1 > t2) [t1, t2] = [t2, t1]
    tmin = Math.max(tmin, t1)
    tmax = Math.min(tmax, t2)
    return tmin <= tmax
  }

  if (!slab(axis.a.x, dx, 0, w) || !slab(axis.a.y, dy, 0, h)) return axis
  return {
    a: { x: axis.a.x + dx * tmin, y: axis.a.y + dy * tmin },
    b: { x: axis.a.x + dx * tmax, y: axis.a.y + dy * tmax },
  }
}
