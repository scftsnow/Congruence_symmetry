/**
 * The light drifting behind every screen.
 *
 * Ninety motes rising slowly through the sky on every screen — the cover, the
 * doors and the boards alike — because the sky is one sky everywhere. Most are
 * dust, every tenth is a brighter spark: a fuller sky reads as weather, and the
 * sparks are what the eye catches. Each one is fixed numbers, not random: the
 * same sky on every visit, and nothing a test cannot count.
 *
 * They live strictly behind the work (a negative z-index under everything the
 * screen draws), they ignore the finger, and they vanish entirely for a child
 * sensitive to movement. A mote over a board would be a mark that means
 * nothing, so there are none: the paper covers them the way it covers the
 * night.
 */

const COUNT = 90

interface Mote {
  left: number
  size: number
  duration: number
  delay: number
  sway: number
  tone: string
}

function mote(i: number): Mote {
  const tones = ['#ffffff', '#ffe9b8', '#a8c8ff']
  // every tenth mote is a spark: bigger, brighter, quicker
  const spark = i % 10 === 0
  return {
    // spread across the width with no two sharing a lane
    left: (i * 37 + 11) % 100,
    // dust at two to four pixels, sparks at five
    size: spark ? 5 : 2 + ((i * 7) % 3),
    // eight to twenty seconds a rise: slower than any child waits
    duration: (spark ? 7 : 9) + ((i * 13) % 12),
    // already aloft on arrival, so the sky is full on the first paint
    delay: -((i * 29) % 22),
    // a sidestep on the way up, so no mote climbs a plumb line
    sway: ((i * 17) % 56) - 28,
    tone: tones[i % tones.length],
  }
}

export function SkyParticles() {
  return (
    <div className="sky-particles" aria-hidden="true">
      {Array.from({ length: COUNT }, (_, i) => {
        const m = mote(i)
        return (
          <span
            key={i}
            className="sky-particle"
            style={
              {
                left: `${m.left}%`,
                width: `${m.size}px`,
                height: `${m.size}px`,
                background: m.tone,
                color: m.tone,
                '--sway': `${m.sway}px`,
                animationDuration: `${m.duration}s`,
                animationDelay: `${m.delay}s`,
              } as React.CSSProperties
            }
          />
        )
      })}
    </div>
  )
}
