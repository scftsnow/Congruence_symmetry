/**
 * One shape, folded over its axis — the parts board.
 *
 * The same marks and travelling part as the correspondence board, on one
 * outline with the axis down the middle. Nothing about what a pair is is
 * decided here: the mirror image comes from the same correspondence() the other
 * unit uses, and this file only decides where the picture sits and what the
 * child can touch.
 */

import { useMemo } from 'react'
import { angleWedge } from '../geometry/correspondence'
import { foldTransform } from '../geometry/symmetry'
import { lineCorrespondence, type MirrorPairs } from '../geometry/symmetryParts'
import type { Line } from '../geometry/symmetryParts'
import type { Point } from '../geometry/types'
import { pointsToPath } from './svgPath'
import { Celebration } from './Celebration'
import { CorrMarks } from './CorrMarks'
import { CorrFly, type Flyable } from './CorrFly'
import type { Phase } from './corrText'

const W = 1100
const H = 600
const MID = { x: 550, y: 300 }
/** radius of every drawn angle wedge on this board, marks and targets alike */
const WEDGE = 45

export function SymmetryPartsScene({
  vertices, axis, pairs, phase, step, asked, flySides, flyAngles, flyStep,
  landed, justFound, onAnswer,
}: {
  vertices: Point[]
  axis: Line
  pairs: MirrorPairs
  phase: Phase
  step: number
  asked: number[]
  flySides: number[]
  flyAngles: number[]
  flyStep: number
  landed: boolean
  justFound: boolean
  onAnswer: (index: number) => void
}) {
  const corr = useMemo(() => lineCorrespondence(vertices, axis), [vertices, axis])
  const flying = phase === 'compare' && flyStep < flySides.length + flyAngles.length
  const target = phase === 'points' || phase === 'sides' || phase === 'angles' ? asked[step] : -1

  /* Both ends of every pair found so far. The apex marks itself alone: it is
   * the one corner that is its own pair. Sides mirroring to themselves are
   * never marked, because they were never asked. */
  const pairOf = (kind: 'points' | 'sides', k: number): number[] => {
    const pair = pairs[kind].find(([a, b]) => a === k || b === k)
    if (!pair) return [k]
    return [...new Set(pair)]
  }
  const answered = asked.slice(0, step)
  const pointPairs = pairs.points.flat()
  const sidePairs = pairs.sides.flat()
  const markPoints =
    phase === 'points' ? answered.flatMap((k) => pairOf('points', k)) : pointPairs
  const markSides =
    phase === 'points' ? [] : phase === 'sides' ? answered.flatMap((k) => pairOf('sides', k)) : sidePairs
  const markAngles = phase === 'angles' ? answered.flatMap((k) => pairOf('points', k)) : phase === 'compare' ? pointPairs : []
  const freshPair =
    step > 0 && (phase === 'points' || phase === 'sides' || phase === 'angles')
      ? pairOf(phase === 'sides' ? 'sides' : 'points', asked[step - 1])
      : []
  const fresh = {
    points: phase === 'sides' ? [] : freshPair,
    sides: phase === 'sides' ? freshPair : [],
    angles: phase === 'angles' ? freshPair : [],
  }

  const fly: Flyable | null = !flying
    ? null
    : flyStep < flySides.length
      ? { kind: 'side', a: corr.sides[flySides[flyStep]].a, b: corr.sides[flySides[flyStep]].b }
      : {
          kind: 'angle',
          a: corr.angles[flyAngles[flyStep - flySides.length]].a,
          b: corr.angles[flyAngles[flyStep - flySides.length]].b,
        }

  return (
    <svg className="canvas" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="대칭축을 사이에 둔 도형">
      <path className="corr-shape corr-shape--a" d={pointsToPath(vertices)} fill="#bde0fe" />
      <line className="sym-axis" x1={axis.a.x} y1={axis.a.y} x2={axis.b.x} y2={axis.b.y} />
      <CorrMarks corr={corr} points={markPoints} sides={markSides} angles={markAngles} fresh={fresh} flight={{ flying, flyStep, flySides, flyAngles }} wedge={WEDGE} />

      {target >= 0 && phase === 'points' && (
        <circle className="corr-target" cx={corr.vertices[target].a.x} cy={corr.vertices[target].a.y} r={30} />
      )}
      {target >= 0 && phase === 'sides' && (
        <line
          className="corr-target corr-target--side"
          x1={corr.sides[target].a[0].x} y1={corr.sides[target].a[0].y}
          x2={corr.sides[target].a[1].x} y2={corr.sides[target].a[1].y}
        />
      )}
      {target >= 0 && phase === 'angles' && (
        <path className="corr-target" d={angleWedge(corr.angles[target].a, WEDGE)} />
      )}

      {/* keyed by flyStep so a finished part never travels back to where it left */}
      <CorrFly
        key={flyStep}
        part={fly}
        landed={landed}
        move={{ from: foldTransform({ a: axis.a, b: axis.b }, 1), to: foldTransform({ a: axis.a, b: axis.b }, -1) }}
        wedge={WEDGE}
        swap
      />

      {/* the taps, and only the ones belonging to the pass in progress */}
      {phase === 'points' &&
        corr.vertices.map((v, i) => (
          <circle key={`h${i}`} className="corr-tap" cx={v.b.x} cy={v.b.y} r={44} onClick={() => onAnswer(i)} />
        ))}
      {phase === 'sides' &&
        corr.sides.map((s, i) => (
          <line key={`h${i}`} className="corr-tap" x1={s.b[0].x} y1={s.b[0].y} x2={s.b[1].x} y2={s.b[1].y} onClick={() => onAnswer(i)} />
        ))}
      {phase === 'angles' &&
        corr.angles.map((g, i) => (
          <path key={`h${i}`} className="corr-tap" d={angleWedge(g.b, WEDGE)} onClick={() => onAnswer(i)} />
        ))}
      {justFound && <Celebration x={MID.x} y={MID.y} />}
    </svg>
  )
}