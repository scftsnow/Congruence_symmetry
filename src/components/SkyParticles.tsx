/**
 * The light drifting behind every screen.
 *
 * Twenty-six motes rising slowly through the sky on every screen — the cover,
 * the doors and the boards alike — because the sky is one sky everywhere. Each
 * one is fixed numbers, not random: the same sky on every visit, and nothing a
 * test cannot count.
 *
 * They live strictly behind the work (a negative z-index under everything the
 * screen draws), they ignore the finger, and they vanish entirely for a child
 * sensitive to movement. A mote over a board would be a mark that means
 * nothing, so there are none: the paper covers them the way it covers the
 * night.
 */

const COUNT = 26

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
  return {
    // spread across the width with no two sharing a lane
    left: (i * 37 + 11) % 100,
    // two to four pixels: dust, not snow
    size: 2 + ((i * 7) % 3),
    // nine to eighteen seconds a rise: slower than any child waits
    duration: 9 + ((i * 13) % 10),
    // already aloft on arrival, so the sky is full on the first paint
    delay: -((i * 29) % 20),
    // a sidestep on the way up, so no mote climbs a plumb line
    sway: ((i * 17) % 40) - 20,
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
