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
  flight,
  wedge = 60,
}: {
  corr: Correspondence
  points: number[]
  sides: number[]
  angles: number[]
  /** the ones just found, so a right answer is unmistakable */
  fresh?: { points?: number[]; sides?: number[]; angles?: number[] }
  /**
   * The demonstration flight, whose travelling pair stands down while it moves.
   *
   * A travelling part is drawn over the board already carrying its own line,
   * so leaving its static marks up would draw it twice — a new set appearing
   * beside the original. With them down the traveller IS the mark lifting off,
   * and landing puts it where the other stood. The pair on its way is the fly
   * step counted against the two asked lists in order — sides first, then
   * angles, the same boundary the traveller itself is drawn from. Points never
   * travel, so they never stand down.
   */
  flight?: { flying: boolean; flyStep: number; flySides: number[]; flyAngles: number[] }
  /** radius of a drawn angle wedge */
  wedge?: number
}) {
  const down =
    !flight?.flying
      ? { sides: [] as number[], angles: [] as number[] }
      : flight.flyStep < flight.flySides.length
        ? { sides: [flight.flySides[flight.flyStep]], angles: [] as number[] }
        : {
            sides: [] as number[],
            angles: [flight.flyAngles[flight.flyStep - flight.flySides.length]],
          }
  const showSides = sides.filter((i) => !down.sides.includes(i))
  const showAngles = angles.filter((i) => !down.angles.includes(i))
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
      {showSides.map((i) => {
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
      {showAngles.map((i) => {
        const g = corr.angles[i]
        return (
          <g key={`g${i}`}>
            <path className="corr-wedge" d={angleWedge(g.a, wedge)} />
            <path className="corr-wedge" d={angleWedge(g.b, wedge)} />
            {fresh?.angles?.includes(i) && (
              <path className="corr-fresh" d={angleWedge(g.a, wedge)} />
            )}
            {fresh?.angles?.includes(i) && (
              <path className="corr-fresh" d={angleWedge(g.b, wedge)} />
            )}
          </g>
        )
      })}
    </>
  )
}