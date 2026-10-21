/**
 * The picture of a correspondence pair.
 *
 * Two congruent shapes side by side, with everything the child has already found
 * still on screen, the part currently being asked about lit up, and one layer of
 * invisible tap targets for whichever pass is in progress.
 *
 * Pure presentation. It is handed which pass is running and where in it the child
 * is, and it decides nothing — the pairing itself is fixed by geometry, so there
 * is no judgement here to get wrong. The marks and the travelling part are shared
 * with the line-symmetry board, which asks the same questions of one shape.
 *
 * THE TWO SHAPES ARE THE SAME FIGURE
 * ---------------------------------
 * Both are drawn in one colour at different opacities rather than two different
 * colours. Tinting them apart would make "these are the same shape" something the
 * colours say instead of something the outlines show, which is the opposite of the
 * point.
 */

import { useMemo } from 'react'
import { angleWedge, correspondence } from '../geometry/correspondence'
import type { CorrespondencePair } from '../geometry/correspondenceShapes'
import { applyTransform, identity } from '../geometry/transforms'
import { pointsToPath } from './svgPath'
import { Celebration } from './Celebration'
import { CorrMarks } from './CorrMarks'
import { CorrFly, type Flyable } from './CorrFly'
import type { Phase } from './corrText'
import { FIRST_SHAPE, SECOND_SHAPE } from './corrText'

/** Every index below a count, the set form of what the count meant. */
function range(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i)
}

const W = 1100
const H = 600
/** far enough apart that neither shape reads as touching the other */
const LEFT = { x: 250, y: 280 }
const RIGHT = { x: 850, y: 280 }
/** radius of every drawn angle wedge on this board, marks and targets alike */
const WEDGE = 45

export function CorrespondenceScene({
  pair,
  phase,
  step,
  asked,
  flyStep,
  landed,
  justFound,
  onAnswer,
}: {
  pair: CorrespondencePair
  phase: Phase
  /** which part of the pass is being asked about */
  step: number
  /** the ask list for the pass in progress, in the order it is asked */
  asked: number[]
  /** which part is on its way, during the demonstration */
  flyStep: number
  landed: boolean
  /** true just after a correct find */
  justFound: boolean
  onAnswer: (index: number) => void
}) {
  const a = useMemo(() => applyTransform(pair.a.vertices, identity(LEFT.x, LEFT.y)), [pair])
  const b = useMemo(() => applyTransform(pair.b.vertices, identity(RIGHT.x, RIGHT.y)), [pair])
  const corr = useMemo(() => correspondence(a, b), [a, b])
  const n = a.length
  const flying = phase === 'compare' && flyStep < n * 2
  /*
   * The lit part and the judged answer come from the same list. The pass deals
   * its questions in a shuffled order, so lighting `step` itself while judging
   * `asked[step]` would mark the right tap wrong — which is exactly what
   * happened when the shuffle landed without this prop.
   */
  const target = phase === 'points' || phase === 'sides' || phase === 'angles' ? (asked[step] ?? -1) : -1

  const fly: Flyable | null = !flying
    ? null
    : flyStep < n
      ? { kind: 'side', a: corr.sides[flyStep].a, b: corr.sides[flyStep].b }
      : { kind: 'angle', a: corr.angles[flyStep - n].a, b: corr.angles[flyStep - n].b }

  /*
   * Found means found in the dealt order, not the outline order: the set on
   * screen is the asked prefix, so the marks agree with the judging even when
   * the questions came shuffled.
   */
  const points = phase === 'points' ? asked.slice(0, step) : range(n)
  const sides = phase === 'sides' ? asked.slice(0, step) : phase === 'points' ? [] : range(n)
  const angles = phase === 'angles' ? asked.slice(0, step) : phase === 'compare' ? range(n) : []
  const fresh = {
    points: points.length > 0 ? [points[points.length - 1]] : [],
    sides: sides.length > 0 ? [sides[sides.length - 1]] : [],
    angles: angles.length > 0 ? [angles[angles.length - 1]] : [],
  }

  return (
    <svg className="canvas" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="합동인 두 도형">
      <text className="corr-caption" x={LEFT.x} y={H - 46} textAnchor="middle">
        {FIRST_SHAPE}
      </text>
      <text className="corr-caption" x={RIGHT.x} y={H - 46} textAnchor="middle">
        {SECOND_SHAPE}
      </text>

      <path className="corr-shape corr-shape--a" d={pointsToPath(a)} fill={pair.a.color} />
      <path className="corr-shape corr-shape--b" d={pointsToPath(b)} fill={pair.a.color} />

      <CorrMarks corr={corr} points={points} sides={sides} angles={angles} fresh={fresh} flight={{ flying, flyStep, flySides: range(n), flyAngles: range(n) }} wedge={WEDGE} />

      {/* the part being asked about, lit on the left shape */}
      {target >= 0 && phase === 'points' && (
        <circle className="corr-target" cx={corr.vertices[target].a.x} cy={corr.vertices[target].a.y} r={30} />
      )}
      {target >= 0 && phase === 'sides' && (
        <line
          className="corr-target corr-target--side"
          x1={corr.sides[target].a[0].x}
          y1={corr.sides[target].a[0].y}
          x2={corr.sides[target].a[1].x}
          y2={corr.sides[target].a[1].y}
        />
      )}
      {target >= 0 && phase === 'angles' && (
        <path className="corr-target" d={angleWedge(corr.angles[target].a, WEDGE)} />
      )}

      {/* keyed by flyStep so a finished part never travels back to where it left */}
      <CorrFly key={flyStep} part={fly} landed={landed} wedge={WEDGE} swap />

      {/* the taps, and only the ones belonging to the pass in progress */}
      {phase === 'points' &&
        corr.vertices.map((v, i) => (
          <circle key={`h${i}`} className="corr-tap" cx={v.b.x} cy={v.b.y} r={44} onClick={() => onAnswer(i)} />
        ))}
      {phase === 'sides' &&
        corr.sides.map((s, i) => (
          <line
            key={`h${i}`}
            className="corr-tap"
            x1={s.b[0].x}
            y1={s.b[0].y}
            x2={s.b[1].x}
            y2={s.b[1].y}
            onClick={() => onAnswer(i)}
          />
        ))}
      {phase === 'angles' &&
        corr.angles.map((g, i) => (
          <path key={`h${i}`} className="corr-tap" d={angleWedge(g.b, WEDGE)} onClick={() => onAnswer(i)} />
        ))}
    {justFound && <Celebration x={W / 2} y={H / 2} />}
    </svg>
  )
}