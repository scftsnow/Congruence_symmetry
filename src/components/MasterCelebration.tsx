/**
 * The master, named the moment all ten doors stand open.
 *
 * Ten stars is a different arrival from one: a row's star climbs behind the
 * doors and leaves, but the tenth closes the whole list, so it gets a card of
 * its own over a doubled sky. The card stays until it is closed — unlike the
 * popups on a board, an arrival this size is not read on a timer.
 *
 * Pure presentation. Whether the master is fresh, and what closing means for
 * the record, both live in useUnitProgress; this draws the card and the sky.
 */

import { EarnedBurst } from './EarnedBurst'

export function MasterCelebration({ onClose }: { onClose: () => void }) {
  return (
    <div className="master">
      <EarnedBurst grand />
      <section
        className="master__card"
        role="dialog"
        aria-modal="true"
        aria-label="합동과 대칭 마스터"
      >
        <p className="master__mark" aria-hidden="true">
          🏆
        </p>
        <h2 className="master__title">합동과 대칭 마스터!</h2>
        <p className="master__note">별 10개를 모두 모았어요</p>
        <button type="button" className="start-btn" onClick={onClose}>
          복습하기
        </button>
      </section>
    </div>
  )
}
