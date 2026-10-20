/**
 * Background grid: orientation only, not a snapping target.
 *
 * Its job is to let a child judge that a shape has not moved while they were
 * looking elsewhere, so it is deliberately faint and deliberately behind
 * everything. It is its own file because it is the one piece of a board that has
 * nothing to do with the shapes on it.
 *
 * The line colour is the one the night-sky theme hands it: barely lighter than
 * the board it sits on. A grid bright enough to read on its own would compete
 * with the shapes, which are the thing being read.
 */
export function Grid({ width, height }: { width: number; height: number }) {
  /*
   * Past the viewBox on every side: the panel fills the screen now, so on any
   * screen shaped differently from the board the drawing letterboxes and the
   * margin around it would be bare paper. Lines drawn out here land in that
   * margin in the drawing's own coordinates, so the whole panel reads as one
   * grid that always lines up. Far past any real margin, and clipped harmlessly
   * where the box already matches.
   */
  const PAD = 2000
  const lines = []
  for (let x = -PAD; x <= width + PAD; x += 50) {
    lines.push(
      <line key={`v${x}`} x1={x} y1={-PAD} x2={x} y2={height + PAD} stroke="var(--grid-line)" strokeWidth={1} />,
    )
  }
  for (let y = -PAD; y <= height + PAD; y += 50) {
    lines.push(
      <line key={`h${y}`} x1={-PAD} y1={y} x2={width + PAD} y2={y} stroke="var(--grid-line)" strokeWidth={1} />,
    )
  }
  return <g>{lines}</g>
}