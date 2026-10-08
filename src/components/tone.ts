/**
 * How loudly the system is speaking.
 *
 * This used to live with the strip that carried it, and both went when the strip
 * did. The tone outlived the component: there are still three ways to say
 * something — a success, a hint, and nothing yet — and the popup and the two text
 * modules between them need to agree on the names.
 *
 * 'neutral' is the one that produces no popup at all. It is the standing
 * instruction, which lives at the bottom of the screen and is read once rather
 * than answered.
 */

export type BannerTone = 'success' | 'hint' | 'neutral'