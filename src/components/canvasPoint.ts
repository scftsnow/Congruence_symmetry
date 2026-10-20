/**
 * Where a finger on the screen is on the board.
 *
 * The board is an SVG with a viewBox, and the browser draws that viewBox inside
 * the element's own box. When the box is a different shape from the viewBox —
 * and it is, whenever the board is capped to the height of a short screen, as
 * it is on a tablet held sideways — the drawing is letterboxed, and the empty
 * margin beside it is not part of the board.
 *
 * Reading the element's rectangle and scaling it reads that margin as board. A
 * shape dropped onto its partner then lands somewhere else entirely, and the
 * child is told that the two do not match.
 *
 * So the finger is read through the matrix the browser itself uses to place the
 * drawing: the inverse of the screen transform. The board is where the drawing
 * is, not where the element's box is.
 */

import type { Point } from '../geometry/types'

/**
 * The point on the board under a finger, in the board's own coordinates.
 *
 * The matrix carries the letterboxing, so a board that is narrower than its
 * box is read correctly at both edges.
 */
export function clientToCanvas(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
  return { x: p.x, y: p.y }
}
