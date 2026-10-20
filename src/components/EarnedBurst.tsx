/**
 * The big stars that rise when a new star comes home.
 *
 * A finished unit leaves its star on the doors, and the arrival is worth more
 * than a pop of the counter: big glowing stars climb out of the background
 * while the new star lands. Fixed positions and delays throughout — the same
 * sky on every paint, testable, like the particles behind it.
 *
 * Strictly background: it sits under the doors' own content and takes no
 * pointer, so it can never cover a row or steal a tap. It lives only while the
 * arrival is fresh; the doors settle it away with everything else.
 */

interface BurstStar {
  left: string
  size: number
  delay: string
  duration: string
}

const BURST: BurstStar[] = [
  { left: '6%', size: 56, delay: '0s', duration: '2s' },
  { left: '18%', size: 40, delay: '0.25s', duration: '2.1s' },
  { left: '30%', size: 64, delay: '0.1s', duration: '1.9s' },
  { left: '43%', size: 44, delay: '0.35s', duration: '2.2s' },
  { left: '57%', size: 60, delay: '0.05s', duration: '2s' },
  { left: '70%', size: 42, delay: '0.3s', duration: '2.1s' },
  { left: '82%', size: 58, delay: '0.15s', duration: '1.9s' },
  { left: '93%', size: 44, delay: '0.4s', duration: '2.2s' },
]

export function EarnedBurst() {
  return (
    <div className="earned-burst" aria-hidden="true">
      {BURST.map((s, i) => (
        <span
          key={i}
          className="earned-burst__star"
          style={{
            left: s.left,
            fontSize: s.size,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
        >
          ★
        </span>
      ))}
    </div>
  )
}
