/**
 * The burst of stars.
 *
 * This used to live at the bottom of VerdictBanner.tsx, which is where it ended
 * up because the congruence stage was the only thing that needed it. It is a
 * celebration, not a banner, and putting a second unit's reward inside the file
 * that decides what a wrong answer says was asking for exactly this kind of
 * tangle. Both units use it now, so it is its own thing.
 *
 * The stars are positioned on a ring around a point and each is given a small
 * delay, so they arrive in turn rather than all at once. Which is a presentational
 * choice and nothing more: the scale itself is in CSS, and the origin of that
 * scale matters — see the note on `.celebrate__star` in the stylesheet, because
 * an SVG transform taken about the viewBox origin throws the stars off the board.
 */

export function Celebration({ x, y }: { x: number; y: number }) {
  return (
    <g className="celebrate" pointerEvents="none">
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * Math.PI) / 4
        return (
          <text
            key={i}
            x={x + Math.cos(angle) * 120}
            y={y + Math.sin(angle) * 120}
            fontSize="42"
            textAnchor="middle"
            className="celebrate__star"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            ⭐
          </text>
        )
      })}
    </g>
  )
}