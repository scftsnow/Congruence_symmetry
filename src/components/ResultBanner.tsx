/**
 * 판정 결과 배너
 *
 * ⚠️ 톤 설계 원칙:
 * - 정답일 때: 칭찬 + 별
 * - 틀렸을 때: 정답을 알려주지 않는다. 대신 무엇을 더 살펴볼지 안내한다.
 * - "모양은 같은데 크기가 달라"는 이 앱의 핵심 발견이므로 특별히 강조한다.
 */

import type { CongruenceResult } from '../geometry/types'

interface ResultBannerProps {
  result: CongruenceResult
  justSolved: boolean
}

export function ResultBanner({ result, justSolved }: ResultBannerProps) {
  const { verdict } = result

  if (verdict === 'congruent') {
    return (
      <div
        className="banner banner--success"
        role="status"
        aria-live="polite"
      >
        <span className="banner__icon" aria-hidden="true">
          ⭐
        </span>
        <span className="banner__text">
          {justSolved ? '같은 모양이야! 대단해!' : '같은 모양이야!'}
        </span>
      </div>
    )
  }

  if (verdict === 'shape-only') {
    return (
      <div className="banner banner--hint" role="status" aria-live="polite">
        <span className="banner__icon" aria-hidden="true">
          🔍
        </span>
        <span className="banner__text">
          모양은 똑같아! 그런데 <strong>크기가 조금 달라</strong>
        </span>
      </div>
    )
  }

  // 전혀 다름 — 정답을 알려주지 않고 다음 행동을 안내
  return (
    <div className="banner banner--neutral" role="status" aria-live="polite">
      <span className="banner__icon" aria-hidden="true">
        👆
      </span>
      <span className="banner__text">
        왼쪽 도형에 <strong>겹쳐 보게</strong> 해 보자
      </span>
    </div>
  )
}