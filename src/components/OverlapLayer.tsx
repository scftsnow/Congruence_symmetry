/**
 * OverlapLayer — draws the region where two shapes actually coincide.
 *
 * WHY THIS EXISTS
 * ---------------
 * The child proves congruence by stacking, so the overlap has to be visible
 * rather than asserted. The previous implementation drew a fixed circle at the
 * midpoint of the two centroids. That circle appeared even when the shapes did
 * not touch and never changed size, so it said nothing about whether the shapes
 * overlapped.
 *
 * What replaces it:
 *   - both shapes render semi-transparent, so the one behind stays visible
 *   - the shared region renders on top in a solid colour
 *   - a dashed outline means partial, so unfinished looks unfinished
 *   - a bar reads out the agreement, so the child can watch it climb
 *
 * THE READOUT IS AGREEMENT
 * ------------------------
 * Not the coverage of the held shape. A small shape dropped inside a large one
 * covers all of itself, so its own coverage reads 100% and the screen would
 * congratulate the child for a stack that proves nothing. Agreement takes the
 * worse of the two directions, so one shape swallowing another scores low, and
 * it reads the same whichever shape is on top.
 *
 * The region arrives as a list of pieces rather than one outline, because two
 * arrows crossing at right angles share two separate lobes and no single
 * outline can describe them.
 */

import type { Point } from '../geometry/types'
import { intersectionArea } from '../geometry/overlap'
import { pointsToPath } from './svgPath'

interface OverlapLayerProps {
  intersection: Point[][] | null
  /** how much the two shapes agree, 0..1 */
  agreement: number
  /** true when the two shapes coincide */
  coincident: boolean
}

/** Where the readout sits, in canvas coordinates. */
const BAR = { x: 360, y: 690, width: 380, height: 44 }

export function OverlapLayer({ intersection, agreement, coincident }: OverlapLayerProps) {
  if (!intersection || intersection.length === 0) return null
  if (intersectionArea(intersection) <= 0) return null

  const d = intersection.map(pointsToPath).join(' ')

  // Full agreement: a calm, confident fill. Partial: a warmer one that reads
  // as "not yet", so the colour itself carries some of the answer.
  const fill = coincident ? 'rgba(42, 157, 143, 0.85)' : 'rgba(233, 196, 106, 0.7)'

  return (
    <g className="overlap-layer" pointerEvents="none">
      <path d={d} fill={fill} fillRule="nonzero" />

      {/* the shared boundary, dashed so partial overlap looks unfinished */}
      <path
        d={d}
        fill="none"
        stroke={coincident ? '#1b6b4a' : '#8a6d00'}
        strokeWidth={coincident ? 3 : 2.5}
        strokeDasharray={coincident ? undefined : '10 7'}
        strokeLinejoin="round"
      />

      <AgreementBar agreement={agreement} coincident={coincident} />
    </g>
  )
}

function AgreementBar({
  agreement,
  coincident,
}: {
  agreement: number
  coincident: boolean
}) {
  const pct = Math.round(Math.min(1, Math.max(0, agreement)) * 100)

  return (
    <g transform={`translate(${BAR.x} ${BAR.y})`} pointerEvents="none">
      <rect x={0} y={0} width={BAR.width} height={BAR.height} rx={14} fill="#ffffff" opacity={0.94} />
      <rect
        x={0}
        y={0}
        width={BAR.width * (pct / 100)}
        height={BAR.height}
        rx={14}
        fill={coincident ? '#2a9d8f' : '#e9c46a'}
      />
      <text
        x={BAR.width / 2}
        y={29}
        fontSize={20}
        fontWeight={700}
        fill={coincident ? '#12463a' : '#5c4a00'}
        textAnchor="middle"
      >
        {coincident ? '완전히 겹쳤어! 100%' : `겹친 부분 ${pct}%`}
      </text>
    </g>
  )
}
