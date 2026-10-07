/**
 * OverlapLayer — draws the region where two shapes actually coincide.
 *
 * WHY THIS EXISTS
 * ---------------
 * Stage 2 asks the child to prove congruence by stacking. The previous
 * implementation drew a fixed circle at the midpoint of the two centroids.
 * That circle appeared even when the shapes did not touch and never changed
 * size, so it told the child nothing about whether the shapes overlapped.
 *
 * What replaces it:
 *   - both shapes render semi-transparent, so the one behind stays visible
 *   - the clipped intersection renders on top in a solid colour
 *   - a dashed outline traces the intersection, so a partial overlap is
 *     visibly different from a full one
 */

import type { Point } from '../geometry/types'
import { polygonArea } from '../geometry/overlap'
import { pointsToPath } from './svgPath'

interface OverlapLayerProps {
  intersection: Point[] | null
  /** coverage of the reference shape, 0..1 */
  coverage: number
  /** true when the two shapes coincide */
  coincident: boolean
}

export function OverlapLayer({ intersection, coverage, coincident }: OverlapLayerProps) {
  if (!intersection || intersection.length < 3) return null

  const area = polygonArea(intersection)
  if (area <= 0) return null

  // Full overlap: a calm, confident fill.
  // Partial overlap: a hatched fill that reads as "not yet".
  const fill = coincident ? 'rgba(42, 157, 143, 0.85)' : 'rgba(233, 196, 106, 0.7)'

  return (
    <g className="overlap-layer" pointerEvents="none">
      <path d={pointsToPath(intersection)} fill={fill} />

      {/* the shared boundary, dashed so partial overlap looks unfinished */}
      <path
        d={pointsToPath(intersection)}
        fill="none"
        stroke={coincident ? '#1b6b4a' : '#8a6d00'}
        strokeWidth={coincident ? 3 : 2.5}
        strokeDasharray={coincident ? undefined : '10 7'}
        strokeLinejoin="round"
      />

      {/* coverage readout: a bar the child can watch grow */}
      <CoverageBar coverage={coverage} coincident={coincident} />
    </g>
  )
}

function CoverageBar({
  coverage,
  coincident,
}: {
  coverage: number
  coincident: boolean
}) {
  const pct = Math.round(coverage * 100)
  return (
    <g transform="translate(560 546)" pointerEvents="none">
      <rect x={0} y={0} width={380} height={40} rx={12} fill="#ffffff" opacity={0.92} />
      <rect
        x={0}
        y={0}
        width={380 * Math.min(1, Math.max(0, coverage))}
        height={40}
        rx={12}
        fill={coincident ? '#2a9d8f' : '#e9c46a'}
      />
      <text
        x={190}
        y={26}
        fontSize={19}
        fontWeight={700}
        fill={coincident ? '#1b6b4a' : '#5c4a00'}
        textAnchor="middle"
      >
        {coincident ? '완전히 겹쳤어! 100%' : `겹친 부분 ${pct}%`}
      </text>
    </g>
  )
}