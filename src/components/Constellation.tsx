/**
 * The constellation on the first screen.
 *
 * Seven stars joined into one slow-turning ring, with two small satellites that
 * only twinkle. It is the cover of the app, not a question: nothing here is
 * placed, found or counted, which is why the stars are plain dots and never the
 * star glyph that marks a finished unit — inside a board every mark means
 * something just proved, and up here nothing has been proved yet.
 *
 * Everything is fixed coordinates, so the first paint and every paint after it
 * are the same picture: no random, no layout effect, nothing a test cannot hold
 * still. The ring takes two minutes a turn — slow enough to be weather rather
 * than motion — and each star breathes on its own delay, so no two blink
 * together.
 */

interface Star {
  x: number
  y: number
  r: number
  fill: string
  twinkle: number
}

const RING: Star[] = [
  { x: 300, y: 52, r: 5, fill: '#ffe08a', twinkle: 0 },
  { x: 392, y: 108, r: 4, fill: '#ffffff', twinkle: 0.9 },
  { x: 362, y: 212, r: 5, fill: '#a8c8ff', twinkle: 1.7 },
  { x: 298, y: 292, r: 4.5, fill: '#ffffff', twinkle: 2.4 },
  { x: 214, y: 252, r: 4, fill: '#ffe9b8', twinkle: 3.1 },
  { x: 178, y: 148, r: 4.5, fill: '#ffffff', twinkle: 1.2 },
  { x: 248, y: 112, r: 3.5, fill: '#a8c8ff', twinkle: 2 },
]

const SATELLITES: Star[] = [
  { x: 478, y: 306, r: 3, fill: '#ffffff', twinkle: 0.5 },
  { x: 128, y: 322, r: 3, fill: '#ffe9b8', twinkle: 2.8 },
]

const LINKS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 0],
]

export function Constellation() {
  return (
    <svg
      className="constellation"
      viewBox="0 0 600 380"
      role="img"
      aria-label="별자리"
    >
      <g className="constellation__spin">
        {LINKS.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            className="constellation__link"
            x1={RING[a].x}
            y1={RING[a].y}
            x2={RING[b].x}
            y2={RING[b].y}
          />
        ))}
        {RING.map((s, i) => (
          <circle
            key={i}
            className="constellation__star"
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={s.fill}
            style={{ animationDelay: `${s.twinkle}s` }}
          />
        ))}
      </g>
      {SATELLITES.map((s, i) => (
        <circle
          key={`sat${i}`}
          className="constellation__star"
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill={s.fill}
          style={{ animationDelay: `${s.twinkle}s` }}
        />
      ))}
    </svg>
  )
}