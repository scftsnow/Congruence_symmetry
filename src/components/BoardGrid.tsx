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
  const lines = []
  for (let x = 0; x <= width; x += 50) {
    lines.push(
      <line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke="var(--grid-line)" strokeWidth={1} />,
    )
  }
  for (let y = 0; y <= height; y += 50) {
    lines.push(
      <line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke="var(--grid-line)" strokeWidth={1} />,
    )
  }
  return <g>{lines}</g>
}