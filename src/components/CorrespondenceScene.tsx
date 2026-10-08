/**
 * The picture of a correspondence pair.
 *
 * Two congruent shapes side by side, with everything the child has already found
 * still on screen, the part currently being asked about lit up, and one layer of
 * invisible tap targets for whichever pass is in progress.
 *
 * Pure presentation. It is handed which pass is running and where in it the child
 * is, and it decides nothing — the pairing itself is fixed by geometry, so there
 * is no judgement here to get wrong.
 *
 * THE TWO SHAPES ARE THE SAME FIGURE
 * ---------------------------------
 * Both are drawn in one colour at different opacities rather than two different
 * colours. Tinting them apart would make "these are the same shape" something the
 * colours say instead of something the outlines show, which is the opposite of
 * the point.
 */

import { useMemo } from 'react'
import { angleTransform, angleWedge, correspondence, sideTransform } from '../geometry/correspondence'
import type { CorrespondencePair } from '../geometry/correspondenceShapes'
import { applyTransform, identity } from '../geometry/transforms'
import type { Point } from '../geometry/types'
import { pointsToPath } from './svgPath'
import type { Phase } from './corrText'
import { FIRST_SHAPE, SECOND_SHAPE } from './corrText'

const W = 1100
const H = 600
/** far enough apart that neither shape reads as touching the other */
const LEFT = { x: 280, y: 300 }
const RIGHT = { x: 820, y: 300 }
/** radius of a drawn angle wedge, and the scale of the tap target around it */
const WEDGE = 78

/** An angle, as geometry hands it over: the corner and the two either side. */
type Angle3 = { vertex: Point; prev: Point; next: Point }

/** A side or an angle, either side of the pair. */
type Flyable =
  | { kind: 'side'; a: [Point, Point]; b: [Point, Point] }
  | { kind: 'angle'; a: Angle3; b: Angle3 }

export function CorrespondenceScene({
  pair,
  phase,
  step,
  flyStep,
  landed,
  onAnswer,
}: {
  pair: CorrespondencePair
  phase: Phase
  /** which part of the pass is being asked about */
  step: number
  /** which part is on its way, during the demonstration */
  flyStep: number
  landed: boolean
  onAnswer: (index: number) => void
}) {
  const a = useMemo(() => applyTransform(pair.a.vertices, identity(LEFT.x, LEFT.y)), [pair])
  const b = useMemo(() => applyTransform(pair.b.vertices, identity(RIGHT.x, RIGHT.y)), [pair])
  const corr = useMemo(() => correspondence(a, b), [a, b])
  const n = a.length
  const flying = phase === 'compare' && flyStep < n * 2
  const target = phase === 'points' || phase === 'sides' || phase === 'angles' ? step : -1

  const fly: Flyable | null = !flying
    ? null
    : flyStep < n
      ? { kind: 'side', a: corr.sides[flyStep].a, b: corr.sides[flyStep].b }
      : { kind: 'angle', a: corr.angles[flyStep - n].a, b: corr.angles[flyStep - n].b }

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

      {/* what the earlier passes found stays on screen through the later ones */}
      {phase !== 'points' &&
        corr.vertices.map((v, i) => (
          <g key={`p${i}`}>
            <circle className="corr-mark" cx={v.a.x} cy={v.a.y} r={11} />
            <circle className="corr-mark" cx={v.b.x} cy={v.b.y} r={11} />
          </g>
        ))}
      {(phase === 'angles' || phase === 'compare') &&
        corr.sides.map((s, i) => (
          <g key={`s${i}`} className="corr-pairside">
            <line x1={s.a[0].x} y1={s.a[0].y} x2={s.a[1].x} y2={s.a[1].y} />
            <line x1={s.b[0].x} y1={s.b[0].y} x2={s.b[1].x} y2={s.b[1].y} />
          </g>
        ))}
      {phase === 'compare' &&
        corr.angles.map((g, i) => (
          <g key={`g${i}`}>
            <path className="corr-wedge" d={angleWedge(g.a, WEDGE * 0.72)} />
            <path className="corr-wedge" d={angleWedge(g.b, WEDGE * 0.72)} />
          </g>
        ))}

      {/* the part being asked about, lit on the left shape */}
      {target >= 0 && phase === 'points' && (
        <circle className="corr-target" cx={corr.vertices[target].a.x} cy={corr.vertices[target].a.y} r={25} />
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
      <Fly key={flyStep} part={fly} landed={landed} />

      {/* the taps, and only the ones belonging to the pass in progress */}
      {phase === 'points' &&
        corr.vertices.map((v, i) => (
          <circle key={`h${i}`} className="corr-tap" cx={v.b.x} cy={v.b.y} r={36} onClick={() => onAnswer(i)} />
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
    </svg>
  )
}

/**
 * One side or angle, drawn on the left shape and moved onto the right one.
 *
 * The destination is shown pale behind it so the part has somewhere visible to
 * arrive; without that the travel is a mark sliding across empty space and the
 * landing has nothing to be judged against.
 *
 * The move is a CSS transform rather than a change of coordinates so the browser
 * interpolates it — the same reason the congruence stage's turns animate.
 */
function Fly({ part, landed }: { part: Flyable | null; landed: boolean }) {
  if (!part) return null
  const move = part.kind === 'side' ? sideTransform(part.a, part.b) : angleTransform(part.a, part.b)

  return (
    <g className="corr-fly" style={{ transform: landed ? move : undefined }}>
      {part.kind === 'side' ? (
        <line className="corr-ghost" x1={part.b[0].x} y1={part.b[0].y} x2={part.b[1].x} y2={part.b[1].y} />
      ) : (
        <path className="corr-ghost" d={angleWedge(part.b, WEDGE)} />
      )}
      {part.kind === 'side' ? (
        <line className="corr-flyline" x1={part.a[0].x} y1={part.a[0].y} x2={part.a[1].x} y2={part.a[1].y} />
      ) : (
        <path className="corr-wedge corr-wedge--fly" d={angleWedge(part.a, WEDGE)} />
      )}
    </g>
  )
}