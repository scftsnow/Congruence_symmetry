/**
 * One shape, turning about its middle — the parts board.
 *
 * The same marks and the same travelling part as the correspondence board, on a
 * single outline with its middle marked in it. Nothing about what a pair is is
 * decided here: the outline's half-turn image is computed by the same
 * correspondence() the other unit uses, and this file only decides where the
 * picture sits and what the child can touch.
 *
 * WHY THE TURN IS THE MOVE
 * ------------------------
 * A half-turn image is a rotation, so turning the bisector onto the other
 * bisector puts the whole region exactly on top. The demonstration therefore
 * turns — the same turn the center board already turns with — and the part
 * lands on its partner because that is what turning halfway means, not because
 * a transform was found to do it.
 */

import { useMemo } from 'react'
import { angleWedge } from '../geometry/correspondence'
import { reflectionCorrespondence } from '../geometry/symmetryParts'
import { turnOf } from '../geometry/pointSymmetry'
import type { MirrorPairs } from '../geometry/symmetryParts'
import type { Point } from '../geometry/types'
import { pointsToPath } from './svgPath'
import { Celebration } from './Celebration'
import { CorrMarks } from './CorrMarks'
import { CorrFly, type Flyable } from './CorrFly'
import type { Phase } from './corrText'

const W = 1100
const H = 600
/** where this unit's shapes sit, the same crossing every board shares */
const MID = { x: 550, y: 300 }
/** radius of a drawn angle wedge, and the scale of the tap target around it */
const WEDGE = 90

export function PointPartsScene({
  vertices, center, pairs, phase, step, asked, flySides, flyAngles, flyStep,
  landed, justFound, onAnswer,
}: {
  vertices: Point[]
  center: Point
  /** the pairs this board asks about */
  pairs: MirrorPairs
  phase: Phase
  /** which entry of the ask list is being asked about */
  step: number
  /** the ask list for the pass in progress */
  asked: number[]
  /** the sides the demonstration turns, in the order it turns them */
  flySides: number[]
  /** the angles the demonstration turns, in the order it turns them */
  flyAngles: number[]
  /** which turn of the demonstration is on its way */
  flyStep: number
  landed: boolean
  /** true just after a correct find */
  justFound: boolean
  onAnswer: (index: number) => void
}) {
  const corr = useMemo(
    () => reflectionCorrespondence(vertices, (p) => turnOf(p, center)),
    [vertices, center],
  )
  const flying = phase === 'compare' && flyStep < flySides.length + flyAngles.length
  const target = phase === 'points' || phase === 'sides' || phase === 'angles' ? asked[step] : -1

  /* Both ends of every pair found so far. A pair is one question, so answering
   * it marks the asked end and the facing end together. */
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
    <svg className="canvas" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="대칭의 중심을 사이에 둔 도형">
      <path className="corr-shape corr-shape--a" d={pointsToPath(vertices)} fill="#bde0fe" />

      <circle className="sym-hub sym-hub--given" cx={center.x} cy={center.y} r={10} />

      <CorrMarks corr={corr} points={markPoints} sides={markSides} angles={markAngles} fresh={fresh} wedge={WEDGE} />

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
      <CorrFly key={flyStep} part={fly} landed={landed} wedge={WEDGE} swap />

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
