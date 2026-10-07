import { buildBoard, shapePoints } from './src/modes/useBoard'
import { measureOverlap, polygonCentroid } from './src/geometry/overlap'
import { applyTransform } from './src/geometry/transforms'

const board = buildBoard()
const rows: string[] = []

function pivot(p: any[]) { return polygonCentroid(p) }
function rotSelf(p: any[], deg: number) {
  if (!deg) return p
  const c = pivot(p), r = deg*Math.PI/180, co = Math.cos(r), si = Math.sin(r)
  return p.map(q=>{const dx=q.x-c.x,dy=q.y-c.y;return {x:c.x+dx*co-dy*si,y:c.y+dx*si+dy*co}})
}
function mirrorSelf(p: any[]) { const c = pivot(p); return p.map(q => ({ x: 2*c.x - q.x, y: q.y })) }

const pairs: Array<[string,string]> = [['rect-wide','rect-tall'],['trap-lying','trap-side'],['tri-iso','tri-iso-2'],['arrow-right','arrow-up'],['fish-right','fish-left'],['rect-wide','rect-small']]
for (const [aid, bid] of pairs) {
  const a = board.find(i=>i.shape.id===aid)!
  const b = board.find(i=>i.shape.id===bid)!
  const ref = shapePoints(a)
  const held = applyTransform(b.shape.vertices, { cx: a.x, cy: a.y, rotation: b.rotation, flipped: b.flipped, scale: 1 })
  rows.push(`=== ${aid} + ${bid} ===`)
  rows.push(`  pivot(hold) = (${pivot(held).x.toFixed(1)}, ${pivot(held).y.toFixed(1)})   pivot(ref) = (${pivot(ref).x.toFixed(1)}, ${pivot(ref).y.toFixed(1)})`)
  for (const d of [0,90,180,270]) {
    const i1 = measureOverlap(ref, rotSelf(held, d))
    const i2 = measureOverlap(ref, rotSelf(mirrorSelf(held), d))
    rows.push(`  rot${String(d).padStart(3)}: ${i1.contained?'Y':'n'} cov=${i1.coverage.toFixed(3)} rev=${i1.reverseCoverage.toFixed(3)}  | flip: ${i2.contained?'Y':'n'} cov=${i2.coverage.toFixed(3)}`)
  }
}
const fs = await import('node:fs')
fs.writeFileSync('out.txt', rows.join('\n'))