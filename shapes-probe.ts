import { polygonArea } from './src/geometry/overlap'
import { checkCongruence, EPSILON_STACK } from './src/geometry/compare'
import type { Point } from './src/geometry/types'

const P = (x: number, y: number): Point => ({ x, y })

function rot(p: Point[], deg: number): Point[] {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return p.map((q) => ({ x: q.x * c - q.y * s, y: q.x * s + q.y * c }))
}
function flipX(p: Point[]): Point[] {
  return p.map((q) => ({ x: -q.x, y: q.y }))
}
function same(a: Point[], b: Point[]): boolean {
  return checkCongruence(a, b, EPSILON_STACK, 1000, false).isCongruent
}

const cands: Record<string, Point[]> = {
  rect_wide: [P(-82, -45), P(82, -45), P(82, 45), P(-82, 45)],
  rect_tall: [P(-45, -82), P(45, -82), P(45, 82), P(-45, 82)],
  tri_right: [P(-50, -50), P(50, -50), P(-50, 50)],
  tri_right_rot: [P(-50, -50), P(50, -50), P(50, 50)],
  tri_scalene: [P(0, -70), P(85, 60), P(-45, 45)],
  para: [P(-80, -40), P(20, -40), P(80, 40), P(-20, 40)],
  arrow_right: [P(-45, 25), P(5, 25), P(5, -25), P(45, 0)],
  arrow_up: [P(-25, 45), P(-25, -5), P(25, -5), P(0, -45)],
  fish: [P(-55, 0), P(0, -32), P(40, 0), P(0, 32)],
  trap: [P(-45, -50), P(45, -50), P(75, 50), P(-75, 50)],
  house: [P(-45, 40), P(45, 40), P(45, -20), P(0, -55), P(-45, -20)],
  cone: [P(0, -55), P(45, 45), P(-45, 45)],
  flag: [P(-50, 50), P(0, 50), P(0, -50)],
}

const rows: string[] = []
rows.push('name            area     45    90   180   270  flip')
for (const name of Object.keys(cands)) {
  const pts = cands[name]
  rows.push([
    name.padEnd(14),
    polygonArea(pts).toFixed(0).padStart(6),
    (same(pts, rot(pts, 45)) ? 'Y' : 'n').padStart(5),
    (same(pts, rot(pts, 90)) ? 'Y' : 'n').padStart(6),
    (same(pts, rot(pts, 180)) ? 'Y' : 'n').padStart(6),
    (same(pts, rot(pts, 270)) ? 'Y' : 'n').padStart(6),
    (same(pts, flipX(pts)) ? 'Y' : 'n').padStart(6),
  ].join(' '))
}

rows.push('')
rows.push('=== pairs reachable with 90-degree steps plus flip ===')
const names = Object.keys(cands)
for (let i = 0; i < names.length; i++) {
  for (let j = i + 1; j < names.length; j++) {
    const a = cands[names[i]]
    const b = cands[names[j]]
    if (Math.abs(polygonArea(a) - polygonArea(b)) > 1) continue
    const need: string[] = []
    for (const d of [0, 90, 180, 270]) {
      if (same(a, rot(b, d))) need.push('rot' + d)
      if (same(a, rot(flipX(b), d))) need.push('rot' + d + '+flip')
    }
    if (need.length) rows.push(names[i] + ' + ' + names[j] + '  ->  ' + need.join(', '))
  }
}

const fs = await import('node:fs')
fs.writeFileSync('probe-out.txt', rows.join('\n'))