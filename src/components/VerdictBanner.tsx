/**
 * What the system says, once the shape has stopped moving.
 *
 * Pure presentation. It is handed what to say and how loudly, and it decides
 * nothing: the hook works out the verdict and this file only draws it. That
 * split matters because the wrong banner is the most expensive mistake in this
 * unit — claiming two shapes are congruent when the child has merely picked one
 * up teaches the opposite of the lesson.
 *
 * NO NUMBERS
 * ----------
 * The counter is the only figure on screen, and it is the goal rather than a
 * measurement. A percentage reading how much two shapes overlap was removed, and
 * agreement was removed with it: agreement is a real quantity, but printing it
 * invited a comparison the child has no way to make. Two arrows stacked dead
 * centre and plainly on top of each other agree 58%, and a child told their
 * perfect stack was barely half right learns something false.
 */

export type BannerTone = 'success' | 'hint' | 'neutral'

export interface VerdictBannerProps {
  tone: BannerTone
  /** a short symbol, so the strip reads without colour */
  icon: string
  /** the sentence, split so the emphasis can be bolded */
  parts: Array<{ text: string; strong?: boolean }>
}

export function VerdictBanner({ tone, icon, parts }: VerdictBannerProps) {
  return (
    <div className={`banner banner--${tone}`} role="status">
      <span className="banner__icon">{icon}</span>
      <span className="banner__text">
        {parts.map((part, i) =>
          part.strong ? <strong key={i}>{part.text}</strong> : <span key={i}>{part.text}</span>,
        )}
      </span>
    </div>
  )
}

/** The burst of stars shown once a new pair is registered. */
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
