/**
 * The constellations on the cover.
 *
 * Two rings turning out of step, and three famous shapes standing still —
 * Cassiopeia's W, the Dipper's ladle, Orion's belt — each in its real shape.
 * The famous three only twinkle and never turn: a Dipper hanging upside down
 * would read as broken, while a slow ring reads as weather. Bright haloed
 * stars stand guard between the groups, with small satellites at the edges.
 *
 * The cover, not a question: nothing here is placed, found or counted, so
 * every star is a plain dot and never the glyph marking a finished unit.
 * Fixed coordinates throughout — the same sky on every paint, testable.
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
/** five small stars climbing away, turning the other way */
const HIGH_RING: Star[] = [
  { x: 70, y: 0, r: 3.5, fill: '#ffffff', twinkle: 0.4 },
  { x: 22, y: 67, r: 3, fill: '#ffe9b8', twinkle: 1.5 },
  { x: -57, y: 41, r: 3.5, fill: '#a8c8ff', twinkle: 2.2 },
  { x: -57, y: -41, r: 3, fill: '#ffffff', twinkle: 0.8 },
  { x: 22, y: -67, r: 3.5, fill: '#ffffff', twinkle: 2.9 },
]
/** Cassiopeia's W, standing still */
const CASSIOPEIA: Star[] = [
  { x: 0, y: 10, r: 4, fill: '#ffffff', twinkle: 0.3 },
  { x: 35, y: 38, r: 4.5, fill: '#ffe9b8', twinkle: 1.1 },
  { x: 70, y: 10, r: 5, fill: '#ffffff', twinkle: 2, bright: true },
  { x: 105, y: 38, r: 4, fill: '#a8c8ff', twinkle: 2.7 },
  { x: 140, y: 10, r: 4.5, fill: '#ffffff', twinkle: 0.7 },
]
/** The Dipper: a shut bowl of four, a handle of three leaving its corner */
const DIPPER: Star[] = [
  { x: 0, y: 0, r: 4.5, fill: '#ffe9b8', twinkle: 0.6, bright: true },
  { x: 58, y: 6, r: 4, fill: '#ffffff', twinkle: 1.8 },
  { x: 64, y: 64, r: 3.5, fill: '#a8c8ff', twinkle: 2.5 },
  { x: 6, y: 60, r: 4, fill: '#ffffff', twinkle: 1.2 },
  { x: -48, y: -10, r: 3.5, fill: '#ffffff', twinkle: 0.9 },
  { x: -96, y: -14, r: 3.5, fill: '#ffe9b8', twinkle: 2.1 },
  { x: -144, y: -8, r: 3, fill: '#ffffff', twinkle: 3 },
]
/** Orion: shoulders, a three-step belt, one beneath it, two feet */
const ORION: Star[] = [
  { x: 0, y: 0, r: 5, fill: '#ffcf9e', twinkle: 0.5, bright: true },
  { x: 110, y: 10, r: 4, fill: '#ffffff', twinkle: 1.6 },
  { x: 35, y: 90, r: 4, fill: '#ffffff', twinkle: 2.3 },
  { x: 55, y: 97, r: 4, fill: '#ffffff', twinkle: 0.1 },
  { x: 75, y: 104, r: 4, fill: '#ffffff', twinkle: 1.3 },
  { x: 55, y: 135, r: 3, fill: '#a8c8ff', twinkle: 2.9 },
  { x: 15, y: 175, r: 4, fill: '#ffffff', twinkle: 0.8 },
  { x: 95, y: 182, r: 5, fill: '#cfe0ff', twinkle: 1.9, bright: true },
]
const SATELLITES: Star[] = [
  { x: 60, y: 300, r: 3, fill: '#ffffff', twinkle: 0.5 },
  { x: 880, y: 440, r: 3, fill: '#ffe9b8', twinkle: 2.8 },
  { x: 890, y: 170, r: 2.5, fill: '#a8c8ff', twinkle: 1.4 },
  { x: 430, y: 50, r: 2.5, fill: '#ffffff', twinkle: 2.2 },
]

function ringLinks(n: number): Array<[number, number]> {
  return Array.from({ length: n }, (_, i) => [i, (i + 1) % n] as [number, number])
}

function Group({
  name,
  stars,
  links,
  spin,
}: {
  /** what the group is, for tests to hold onto — never shown on screen */
  name: string
  stars: Star[]
  links: Array<[number, number]>
  /** extra turning on the base spin; absent means twinkle only, '' the base */
  spin?: string
}) {
  return (
    <g
      data-constellation={name}
      className={spin === undefined ? undefined : `constellation__spin${spin ? ` ${spin}` : ''}`}
    >
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
    <svg className="constellation" viewBox="0 0 920 560" role="img" aria-label="별자리">
      <g transform="translate(150, 110)">
        <Group
          name="cassiopeia"
          stars={CASSIOPEIA}
          links={[[0, 1], [1, 2], [2, 3], [3, 4]]}
        />
      </g>
      <g transform="translate(250, 430)">
        <Group
          name="dipper"
          stars={DIPPER}
          links={[[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [4, 5], [5, 6]]}
        />
      </g>
      <g transform="translate(460, 300)">
        <Group name="great-ring" stars={GREAT_RING} links={ringLinks(GREAT_RING.length)} spin="" />
      </g>
      <g transform="translate(770, 110) scale(0.55)">
        <Group
          name="high-ring"
          stars={HIGH_RING}
          links={ringLinks(HIGH_RING.length)}
          spin="constellation__spin--back"
        />
      </g>
      <g transform="translate(730, 250)">
        <Group
          name="orion"
          stars={ORION}
          links={[[0, 2], [1, 4], [2, 3], [3, 4], [2, 6], [4, 7], [3, 5]]}
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
