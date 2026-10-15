/**
 * The marks a correspondence pass leaves behind.
 *
 * Shared by both places the unit appears. Two congruent shapes side by side and
 * one shape folded over an axis ask the same three questions and are answered in
 * the same marks — a ring on each of the pair, a stroke along each of the sides,
 * a wedge at each of the angles — so the marks are drawn once here rather than
 * twice with the risk of the two copies drifting apart.
 *
 * The marks are index sets, not counts. Side by side every corner is asked in
 * order, so the set is always a prefix; folded over an axis each pair is asked
 * once, so the set is the pairs found so far. One form serves both, and neither
 * screen decides what a pair is.
 */

import { angleWedge, type Correspondence } from '../geometry/correspondence'

/**
 * Which parts have been found, and which of them was just found.
 *
 * Found parts stay on screen, so a right answer is marked the instant it is
 * given. The first version only drew the marks once a pass had finished, which
 * meant that finding every point of the shape left the screen looking exactly as
 * it had at the start: there was nothing at all to tell the child they were
 * right except the highlight jumping somewhere else.
 */
export function CorrMarks({
  corr,
  points,
  sides,
  angles,
  fresh,
  wedge = 90,
}: {
  corr: Correspondence
  points: number[]
  sides: number[]
  angles: number[]
  /** the ones just found, so a right answer is unmistakable */
  fresh?: { points?: number[]; sides?: number[]; angles?: number[] }
  /** radius of a drawn angle wedge */
  wedge?: number
}) {
  return (
    <>
      {points.map((i) => {
        const v = corr.vertices[i]
        return (
          <g key={`p${i}`}>
            <circle className="corr-mark" cx={v.a.x} cy={v.a.y} r={13} />
            <circle className="corr-mark" cx={v.b.x} cy={v.b.y} r={13} />
            {fresh?.points?.includes(i) && <circle className="corr-fresh" cx={v.a.x} cy={v.a.y} r={26} />}
            {fresh?.points?.includes(i) && <circle className="corr-fresh" cx={v.b.x} cy={v.b.y} r={26} />}
          </g>
        )
      })}
      {sides.map((i) => {
        const s = corr.sides[i]
        return (
          <g key={`s${i}`} className="corr-pairside">
            <line x1={s.a[0].x} y1={s.a[0].y} x2={s.a[1].x} y2={s.a[1].y} />
            <line x1={s.b[0].x} y1={s.b[0].y} x2={s.b[1].x} y2={s.b[1].y} />
            {fresh?.sides?.includes(i) && (
              <path className="corr-fresh corr-fresh--side" d={`M ${s.a[0].x} ${s.a[0].y} L ${s.a[1].x} ${s.a[1].y}`} />
            )}
            {fresh?.sides?.includes(i) && (
              <path className="corr-fresh corr-fresh--side" d={`M ${s.b[0].x} ${s.b[0].y} L ${s.b[1].x} ${s.b[1].y}`} />
            )}
          </g>
        )
      })}
      {angles.map((i) => {
        const g = corr.angles[i]
        return (
          <g key={`g${i}`}>
            <path className="corr-wedge" d={angleWedge(g.a, wedge * 0.72)} />
            <path className="corr-wedge" d={angleWedge(g.b, wedge * 0.72)} />
            {fresh?.angles?.includes(i) && (
              <path className="corr-fresh" d={angleWedge(g.a, wedge * 0.9)} />
            )}
            {fresh?.angles?.includes(i) && (
              <path className="corr-fresh" d={angleWedge(g.b, wedge * 0.9)} />
            )}
          </g>
        )
      })}
    </>
  )
}