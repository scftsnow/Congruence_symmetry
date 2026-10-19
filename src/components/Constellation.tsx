/**
 * The constellations on the cover.
 *
 * Three rings turning out of step — the great ring in the middle, a small one
 * climbing away to the upper left, a low arc to the lower right — with bright
 * haloed stars standing guard between them and two small satellites blinking at
 * the edges. It is the cover of the app, not a question: nothing here is
 * placed, found or counted, which is why every star is a plain dot and never
 * the star glyph that marks a finished unit — inside a board every mark means
 * something just proved, and up here nothing has been proved yet.
 *
 * Everything is fixed coordinates, so the first paint and every paint after it
 * are the same sky: no random, no layout effect, nothing a test cannot hold
 * still. The rings take minutes a turn — slow enough to be weather rather than
 * motion — and each star breathes on its own delay, so no two blink together.
 */

interface Star {
  x: number
  y: number
  r: number
  fill: string
  twinkle: number
  bright?: boolean
}

/** seven stars round the middle, the ring the cover turns on */
const GREAT_RING: Star[] = [
  { x: 120, y: 0, r: 5.5, fill: '#ffe08a', twinkle: 0, bright: true },
  { x: 75, y: 94, r: 4, fill: '#ffffff', twinkle: 0.9 },
  { x: -27, y: 117, r: 4.5, fill: '#a8c8ff', twinkle: 1.7 },
  { x: -108, y: 52, r: 4, fill: '#ffffff', twinkle: 2.4 },
  { x: -108, y: -52, r: 5, fill: '#ffe9b8', twinkle: 3.1, bright: true },
  { x: -27, y: -117, r: 4, fill: '#ffffff', twinkle: 1.2 },
  { x: 75, y: -94, r: 3.5, fill: '#a8c8ff', twinkle: 2 },
]

/** five small stars climbing away to the upper left, turning the other way */
const HIGH_RING: Star[] = [
  { x: 70, y: 0, r: 3.5, fill: '#ffffff', twinkle: 0.4 },
  { x: 22, y: 67, r: 3, fill: '#ffe9b8', twinkle: 1.5 },
  { x: -57, y: 41, r: 3.5, fill: '#a8c8ff', twinkle: 2.2 },
  { x: -57, y: -41, r: 3, fill: '#ffffff', twinkle: 0.8 },
  { x: 22, y: -67, r: 3.5, fill: '#ffffff', twinkle: 2.9 },
]

/** four stars in a low arc to the lower right, barely turning at all */
const LOW_ARC: Star[] = [
  { x: 90, y: 20, r: 4, fill: '#ffe9b8', twinkle: 1.1, bright: true },
  { x: 40, y: -20, r: 3, fill: '#ffffff', twinkle: 2.6 },
  { x: -20, y: -30, r: 3.5, fill: '#a8c8ff', twinkle: 0.2 },
  { x: -80, y: 0, r: 3, fill: '#ffffff', twinkle: 1.9 },
]

const SATELLITES: Star[] = [
  { x: 596, y: 336, r: 3, fill: '#ffffff', twinkle: 0.5 },
  { x: 44, y: 352, r: 3, fill: '#ffe9b8', twinkle: 2.8 },
  { x: 560, y: 60, r: 2.5, fill: '#a8c8ff', twinkle: 1.4 },
]

function ringLinks(n: number): Array<[number, number]> {
  return Array.from({ length: n }, (_, i) => [i, (i + 1) % n] as [number, number])
}

function Ring({
  stars,
  links,
  spin,
}: {
  stars: Star[]
  links: Array<[number, number]>
  spin: string
}) {
  return (
    <g className={`constellation__spin ${spin}`}>
      {links.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          className="constellation__link"
          x1={stars[a].x}
          y1={stars[a].y}
          x2={stars[b].x}
          y2={stars[b].y}
        />
      ))}
      {stars.map((s, i) => (
        <g key={i}>
          {s.bright && (
            <circle className="constellation__halo" cx={s.x} cy={s.y} r={s.r * 2.8} fill={s.fill} />
          )}
          <circle
            className={
              s.bright ? 'constellation__star constellation__star--bright' : 'constellation__star'
            }
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={s.fill}
            style={{ animationDelay: `${s.twinkle}s` }}
          />
        </g>
      ))}
    </g>
  )
}

export function Constellation() {
  return (
    <svg className="constellation" viewBox="0 0 640 420" role="img" aria-label="별자리">
      <g transform="translate(150, 90) scale(0.62)">
        <Ring stars={HIGH_RING} links={ringLinks(HIGH_RING.length)} spin="constellation__spin--back" />
      </g>
      <g transform="translate(320, 210)">
        <Ring stars={GREAT_RING} links={ringLinks(GREAT_RING.length)} spin="" />
      </g>
      <g transform="translate(500, 300) scale(0.8)">
        <Ring
          stars={LOW_ARC}
          links={[
            [0, 1],
            [1, 2],
            [2, 3],
          ]}
          spin="constellation__spin--slow"
        />
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