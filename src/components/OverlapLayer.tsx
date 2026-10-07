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
 *
 * NO PERCENTAGE
 * -------------
 * There was a bar here reading "겹친 부분 58%". It is gone, and taking it out
 * is a correction rather than a simplification.
 *
 * A child stacking two shapes is asking whether they are the same, which is a
 * question with a yes or an answer. A percentage is the wrong shape of answer
 * for it, and a harmful one: for the arrow pair, stacked dead centre and
 * unmistakably on top of each other, the honest figure was 58%. The child would
 * have been told their perfect stack was barely half right. The number was true
 * and still worth removing, because it invited a comparison the child has no
 * way to make — 58% against what, exactly? Every other shape on the board is
 * also partly overlapping something.
 *
 * So the evidence is the region itself. It grows as the shapes come together,
 * it is solid when they coincide and dashed while they do not, and the verdict
 * above the board says whether they are the same. That is the whole answer, and
 * a shape drawn over another is something a five-year-old can read without being
 * told a number.
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
  /** true when the two shapes coincide */
  coincident: boolean
}

export function OverlapLayer({ intersection, coincident }: OverlapLayerProps) {
  if (!intersection || intersection.length === 0) return null
  if (intersectionArea(intersection) <= 0) return null

  const d = intersection.map(pointsToPath).join(' ')

  // Coincident: a calm, confident fill. Partial: a warmer one, so the colour
  // itself carries some of the answer without a number having to.
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
    </g>
  )
}
