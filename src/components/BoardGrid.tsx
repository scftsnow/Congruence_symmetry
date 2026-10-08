/**
 * Background grid: orientation only, not a snapping target.
 *
 * Its job is to let a child judge that a shape has not moved while they were
 * looking elsewhere, so it is deliberately faint and deliberately behind
 * everything. It is its own file because it is the one piece of a board that has
 * nothing to do with the shapes on it.
 */
export function Grid({ width, height }: { width: number; height: number }) {
  const lines = []
  for (let x = 0; x <= width; x += 50) {
    lines.push(
      <line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke="#e2e9f0" strokeWidth={1} />,
    )
  }
  for (let y = 0; y <= height; y += 50) {
    lines.push(
      <line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke="#e2e9f0" strokeWidth={1} />,
    )
  }
  return <g>{lines}</g>
}