/**
 * What the system is saying, and how loudly.
 *
 * These lived with the strip that carried them, and both went when the strip did.
 * The tone outlived the component: there are still three ways to say something — a
 * success, a miss, and nothing yet — and everything that decides where those words
 * appear needs to agree on the names.
 *
 * ONE SHAPE FOR BOTH UNITS
 * ------------------------
 * The congruence unit speaks in split parts so a phrase can be bolded; the
 * correspondence unit speaks in plain text. They are the same thing said about
 * two different screens, and having two interfaces for them meant the popup's
 * rules had to be written twice — once per unit, and then kept in step by hand.
 * Both are now one `Message`, and the text is derived from whichever field is
 * filled in.
 *
 * 'neutral' is the one tone that produces no popup at all. It is the standing
 * instruction, which lives at the bottom of the screen, is read once and then
 * left alone.
 */

export type BannerTone = 'success' | 'hint' | 'neutral'

export interface Message {
  tone: BannerTone
  icon: string
  /** plain text, used when `parts` is absent */
  text?: string
  /** the sentence split, when part of it is worth bolding */
  parts?: Array<{ text: string; strong?: boolean }>
}

/** The two tones that are worth interrupting the board for. */
export type PopupTone = Exclude<BannerTone, 'neutral'>

/** A message that is worth showing, if it is worth showing at all. */
export type Popup = (Message & { tone: PopupTone }) | null

/** Whether a message interrupts the board or waits at the bottom of the screen. */
export function isPopup(message: Message): message is Message & { tone: PopupTone } {
  return message.tone !== 'neutral'
}

/** The words on their own, whichever way the message is written. */
export function said(message: Message): string {
  return message.parts ? message.parts.map((p) => p.text).join('') : (message.text ?? '')
}