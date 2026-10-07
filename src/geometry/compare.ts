/**
 * 합동 판정 엔진
 *
 * ── 왜 이 방식인가 ───────────────────────────────────────
 *
 * 이전 구현은 "회전각 전수조사 + 경계 샘플링"을 썼지만 실패했습니다:
 *   - 정사각형 45° 회전 → 편차 20px (샘플링이 회전 대칭에서 어긋남)
 *   - 회전 대칭이 있는 도형(정사각형·정삼각형·정오각형)에서
 *     각도마다 매칭 결과가 달라 판정이 불안정했다.
 *
 * 지금 방식은 **기하 불변량**을 쓴다.
 * 회전·반사·평행이동으로 절대 변하지 않는 값만 비교하므로
 * "방향이 달라도 합동"이 각도와 무관하게 정확히 판정된다.
 *
 * ── 불변량 구성 ──────────────────────────────────────────
 *
 *   1. 정점 순서 기반 변 길이 + 내각 시그니처
 *      → 반사·회전·평행이동에 불변
 *      → 순환 이동(시작점)과 역순(방향)을 모두 매칭해 absorbs 회전
 *   2. 정규화는 둘레로만 나눈다 (크기 차이 제거)
 *
 * ⚠️ 홀수 정점 도형(삼각형·정오각형)의 180° 회전:
 *    꼭짓점과 변의 중점이 자리를 바꾸므로 정점↔정점 매칭은 실패한다.
 *    시그니처는 이 경우에도 정확히 일치한다.
 *
 * ⚠️ 위치·크기는 이 함수에서 판정하지 않는다.
 *    포개기 모드에서는 checkCongruence가 별도로 처리한다.
 */

import type { CongruenceResult, Point, Shape, Transform } from './types'
import { applyTransform } from './transforms'

/**
 * 허용 오차 (화면 대비 비율)
 *
 * 검증 완료: 180° 회전 시 오차는 ε × 정점수로 선형 증가하며,
 * ε=1.5%, 정점 3개 기준 0.0003 수준이다.
 * 180° 회전에 대한 별도 완화 규칙은 불필요하다.
 */
export const EPSILON_STACK = 0.015 // 화면 1.5% — 포개기 모드
export const EPSILON_REDRAW = 0.02 // 화면 2% — 다시 그리기 모드 (더 관대하게)

// ── 도형 유틸 ────────────────────────────────────────────

/** 다각형 둘레 (px) */
export function perimeter(vertices: Point[]): number {
  if (vertices.length < 2) return 0
  let sum = 0
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i]
    const b = vertices[(i + 1) % vertices.length]
    sum += Math.hypot(a.x - b.x, a.y - b.y)
  }
  return sum
}

/** 다각형 넓이 (신발끈 공식, px²) */
export function area(vertices: Point[]): number {
  if (vertices.length < 3) return 0
  let sum = 0
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i]
    const b = vertices[(i + 1) % vertices.length]
    sum += a.x * b.y - b.x * a.y
  }
  return Math.abs(sum) / 2
}

/** 바운딩 박스 최대 축 길이 (px) */
export function bboxExtent(points: Point[]): number {
  if (points.length === 0) return 0
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return Math.max(maxX - minX, maxY - minY)
}

/** 바운딩 박스 중심 */
export function bboxCenterOf(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
}

// ── 기하 불변량 ──────────────────────────────────────────

/**
 * 도형의 기하 시그니처를 만든다.
 * 회전·반사·평행이동에 불변이며, 시작점과 방향을 무시한 형태로 정규화한다.
 *
 * @returns [변길이ᵢ, 내각ᵢ, 변길이ᵢ₊₁, 내각ᵢ₊₁, ...] (px / rad)
 */
function shapeSignature(vertices: Point[]): number[] {
  const n = vertices.length
  if (n === 0) return []
  // 점 하나 — 퇴화 도형. 크기·모양 판정이 무의미하다.
  if (n === 1) return [0, 0]
  // 선분 — 양방향으로 길이가 같다
  if (n === 2) {
    const d = Math.hypot(vertices[0].x - vertices[1].x, vertices[0].y - vertices[1].y)
    return [d, Math.PI, d, Math.PI]
  }

  const sig: number[] = []
  for (let i = 0; i < n; i++) {
    const a = vertices[i]
    const b = vertices[(i + 1) % n]
    const c = vertices[(i + 2) % n]

    // 변 길이
    sig.push(Math.hypot(a.x - b.x, a.y - b.y))

    // 내각 (꼭짓점 b)
    const v1 = { x: a.x - b.x, y: a.y - b.y }
    const v2 = { x: c.x - b.x, y: c.y - b.y }
    const l1 = Math.hypot(v1.x, v1.y)
    const l2 = Math.hypot(v2.x, v2.y)

    if (l1 > 1e-9 && l2 > 1e-9) {
      const cos = Math.min(1, Math.max(-1, (v1.x * v2.x + v1.y * v2.y) / (l1 * l2)))
      sig.push(Math.acos(cos))
    } else {
      sig.push(0)
    }
  }
  return sig
}

/**
 * 시그니처 정규화 — 둘레로 나누어 크기를 제거한다.
 * ⚠️ 짝수 인덱스(변 길이, px)만 합산에 쓴다.
 *    내각(rad)은 길이 단위와 섞으면 안 되므로 합산에서 제외.
 */
function normalizeSignature(sig: number[]): number[] {
  let perim = 0
  for (let i = 0; i < sig.length; i += 2) perim += sig[i]
  if (perim <= 1e-9) return sig
  return sig.map((v) => v / perim)
}

/**
 * 두 시그니처의 최선 매칭 편차
 * 순환 이동(시작점 무관) × 정순/역순(방향 무관) 을 모두 시도.
 */
function signatureDeviation(sa: number[], sb: number[]): number {
  const n = sa.length
  if (n === 0 || n !== sb.length) return Infinity

  const reversed = [...sb].reverse()
  let best = Infinity

  for (const candidate of [sb, reversed]) {
    for (let offset = 0; offset < n; offset++) {
      let maxDev = 0
      for (let i = 0; i < n; i++) {
        const dev = Math.abs(sa[i] - candidate[(i + offset) % n])
        if (dev > maxDev) maxDev = dev
      }
      if (maxDev < best) best = maxDev
    }
  }
  return best
}

// ── 핵심 비교 ────────────────────────────────────────────

/**
 * 모양 비교 — 회전·반사·평행이동을 무시하고 형태만 비교
 *
 * ⚠️ 크기 정규화를 하므로, 크기가 달라도 모양이 같으면 true가 나온다.
 *    크기 판정은 compareSize가 담당한다.
 *
 * @param epsilon 허용 오차 (둘레 대비 비율)
 * @param refPerimeter 오차 환산 기준 둘레 (px)
 */
export function compareShape(
  a: Point[],
  b: Point[],
  epsilon: number,
  refPerimeter: number,
): {
  matches: boolean
  deviation: number
} {
  if (a.length !== b.length) {
    return { matches: false, deviation: Infinity }
  }
  if (a.length === 0) {
    return { matches: true, deviation: 0 }
  }

  const sigA = normalizeSignature(shapeSignature(a))
  const sigB = normalizeSignature(shapeSignature(b))

  // 정규화된 편차 → 실제 px로 환산
  const normDev = signatureDeviation(sigA, sigB)
  const deviationPx = normDev * refPerimeter

  return {
    matches: deviationPx <= epsilon * refPerimeter,
    deviation: deviationPx,
  }
}

/**
 * 크기 비교 — 둘레와 넓이로 판단 (모양이 같을 때만 의미 있음)
 *
 * ⚠️ 균일 확대/축소(scale)로 생긴 차이는 "크기 차이"로 인정해야 한다.
 *    그래야 아이가 "모양은 같은데 크기가 달라"를 발견한다.
 */
export function compareSize(
  a: Point[],
  b: Point[],
  epsilon: number,
): { matches: boolean; deviation: number } {
  if (a.length === 0 || b.length === 0) {
    // An empty shape has no measurable size.
    // Two empty shapes are trivially the same; an empty vs non-empty
    // pair is a size mismatch, not an equality.
    const bothEmpty = a.length === 0 && b.length === 0
    return { matches: bothEmpty, deviation: bothEmpty ? 0 : Infinity }
  }

  const pa = perimeter(a)
  const pb = perimeter(b)
  const aa = area(a)
  const ab = area(b)

  // 둘레는 비율 1차, 넓이는 비율 2차로 변하므로 둘 다 확인
  const perimDev = Math.abs(pa - pb) / Math.max(pa, pb, 1)
  const areaDev = Math.abs(aa - ab) / Math.max(aa, ab, 1)

  const worst = Math.max(perimDev, areaDev)
  return { matches: worst <= epsilon, deviation: worst }
}

/**
 * 두 도형의 합동 여부 판정 (모드 1·4의 기반)
 *
 * ⚠️ 판정 순서가 아이의 발견 흐름과 일치한다:
 *   1) 옮겼을 때 겹치는가 (위치)
 *   2) 돌리고 뒤집어도 겹치는가 (모양)
 *   3) 크기까지 같은가
 *
 * @param epsilon 허용 오차 (포개기 0.015, 다시 그리기 0.02)
 * @param canvasSize 화면 크기 (px) — 오차의 화면 대비 비율 환산 기준
 * @param checkPosition 위치를 판정에 포함할지 (포개기 모드 = true)
 */
export function checkCongruence(
  a: Point[],
  b: Point[],
  epsilon: number = EPSILON_STACK,
  canvasSize: number = 1000,
  checkPosition: boolean = false,
): CongruenceResult {
  if (a.length !== b.length) {
    return {
      shapeMatches: false,
      sizeMatches: false,
      isCongruent: false,
      verdict: 'different',
      maxDeviation: Infinity,
    }
  }

  // ── 1) 위치 판정 ──────────────────────────────────────
  // ⚠️ 이게 없으면 어디에 있든 편차 0으로 합동이 되어
  //    "포개었는가"를 확인할 수 없다.
  if (checkPosition) {
    const ca = bboxCenterOf(a)
    const cb = bboxCenterOf(b)
    const posDev = Math.hypot(ca.x - cb.x, ca.y - cb.y)
    const posTolerance = epsilon * canvasSize * 2

    if (posDev > posTolerance) {
      return {
        shapeMatches: false,
        sizeMatches: false,
        isCongruent: false,
        verdict: 'different',
        maxDeviation: posDev,
      }
    }
  }

  // ── 2) 모양 판정 ──────────────────────────────────────
  // 오차 기준은 도형 둘레 (px). 화면 크기로 환산한다.
  const refPerimeter = Math.max(perimeter(a), 1)
  const epsilonOnPerimeter = epsilon * canvasSize

  const shapeResult = compareShape(
    a,
    b,
    epsilonOnPerimeter / refPerimeter,
    refPerimeter,
  )

  if (!shapeResult.matches) {
    return {
      shapeMatches: false,
      sizeMatches: false,
      isCongruent: false,
      verdict: 'different',
      maxDeviation: shapeResult.deviation,
    }
  }

  // ── 3) 크기 판정 ──────────────────────────────────────
  const sizeResult = compareSize(a, b, epsilon)
  const isCongruent = sizeResult.matches

  return {
    shapeMatches: true,
    sizeMatches: sizeResult.matches,
    isCongruent,
    verdict: sizeResult.matches ? 'congruent' : 'shape-only',
    maxDeviation: shapeResult.deviation,
  }
}

/** 도형 + 변환 → 화면 좌표 헬퍼 */
export function toScreenPoints(shape: Shape, t: Transform): Point[] {
  return applyTransform(shape.vertices, t)
}

/** 도형의 현재 중심 */
export function shapeCenter(shape: Shape, t: Transform): Point {
  return bboxCenterOf(applyTransform(shape.vertices, t))
}