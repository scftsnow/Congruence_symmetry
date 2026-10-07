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
 *   - the colour says whether they match: teal when they coincide, amber while
 *     they do not
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
 * the colour says whether they coincide, and the verdict above the board says
 * whether they are the same. That is the whole answer, and a shape drawn over
 * another is something a five-year-old can read without being told a number.
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
      {/* the region, and nothing else */}
      <path d={d} fill={fill} fillRule="nonzero" />
    </g>
  )
}

/**
 * THERE IS NO OUTLINE, AND THAT IS THE FIX
 * ----------------------------------------
 * This layer drew an outline round the shared region. It was dashed, to read as
 * unfinished while the shapes did not yet match, and the child saw rows of dots
 * lying across the middle of the shaded area.
 *
 * Two attempts were made to clean the outline up rather than remove it. Both
 * failed, and the failure is the reason this section exists.
 *
 * FIRST: the region arrives as pieces cut out of triangles, and neighbouring
 * pieces share the edge they were cut along, so outlining each piece drew every
 * seam as well. For the arrow pair that was sixteen pieces, sixty-six edges, and
 * only fifteen real boundary edges. Dropping the edges two pieces share got it
 * down to fifteen.
 *
 * SECOND: it was still wrong. An edge belonging to one piece is not therefore a
 * boundary edge. The clipper cuts each triangle against every triangle of the
 * other shape, so a piece can be bounded in part by a neighbour's cut that does
 * not happen to coincide with another piece's edge exactly. Those edges look
 * unique, so they survive the shared-edge filter, and they lie inside the
 * shaded region. Measured after the first fix, with each remaining edge checked
 * by stepping just inside it and asking whether it is inside both shapes:
 *
 *     pair      edges left   of those, inside the region
 *     가·타            8                 4
 *     나·자            7                 4
 *     다·차            4                 3
 *     아·자           15                 7
 *     사·라            8                 4
 *
 * Half of what remained was still interior. Fixing that means testing every edge
 * against both shapes, which is more geometry than an outline is worth.
 *
 * The outline was never carrying anything the fill did not. The region is the
 * evidence: it grows as the shapes come together, and the colour says whether
 * they match — a calm teal when they coincide, a warm amber while they do not.
 * Both shapes are already drawn with their own solid outlines underneath, so
 * where the shared region meets an edge of one of them, there is an edge on
 * screen already. What was missing was not a border. It was a second, wrong one.
 */
