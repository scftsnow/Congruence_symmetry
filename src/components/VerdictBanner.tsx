/**
 * The banner strip above the board.
 *
 * Pure presentation. It is handed what to say and how loudly to say it, and it
 * decides nothing: the stage works out the verdict and this file only draws it.
 * That split matters because the wrong banner is the most expensive mistake in
 * this unit — claiming two shapes are congruent when the child has merely
 * picked one up teaches the opposite of the lesson.
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
