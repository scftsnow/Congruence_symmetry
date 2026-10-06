/**
 * 합동 판정 엔진 검증 테스트
 *
 * 실행: npx tsx src/geometry/compare.test.ts
 * 또는 npm test
 */

import { checkCongruence, EPSILON_STACK, EPSILON_REDRAW } from './compare'
import { applyTransform, identity, rotate180, reflectAcrossLine } from './transforms'
import type { Point, Shape, Transform } from './types'

const CANVAS = 1000 // px
let pass = 0
let fail = 0

function check(name: string, actual: boolean, expected: boolean) {
  if (actual === expected) {
    pass++
    console.log(`  ✅ ${name}`)
  } else {
    fail++
    console.log(`  ❌ ${name} → expected ${expected}, got ${actual}`)
  }
}

function section(title: string) {
  console.log(`\n▶ ${title}`)
}

// ── 테스트용 도형 ────────────────────────────────────────
const square: Shape = {
  id: 'sq',
  name: '정사각형',
  kind: 'square',
  color: '#8ecae6',
  vertices: [
    { x: -50, y: -50 },
    { x: 50, y: -50 },
    { x: 50, y: 50 },
    { x: -50, y: 50 },
  ],
}

const triangle: Shape = {
  id: 'tri',
  name: '삼각형',
  kind: 'triangle',
  color: '#ffb703',
  vertices: [
    { x: 0, y: -60 },
    { x: 60, y: 50 },
    { x: -60, y: 50 },
  ],
}

const rect: Shape = {
  id: 'rect',
  name: '직사각형',
  kind: 'rectangle',
  color: '#90be6d',
  vertices: [
    { x: -80, y: -40 },
    { x: 80, y: -40 },
    { x: 80, y: 40 },
    { x: -80, y: 40 },
  ],
}

const pentagon: Shape = {
  id: 'pen',
  name: '정오각형',
  kind: 'pentagon',
  color: '#f4978e',
  vertices: Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    return { x: Math.cos(a) * 60, y: Math.sin(a) * 60 }
  }),
}

const pts = (s: Shape, t: Transform) => applyTransform(s.vertices, t)

// ── 1. 기본 합동 ─────────────────────────────────────────
section('1. 같은 도형, 같은 위치')
{
  const r = checkCongruence(
    pts(square, identity(300, 300)),
    pts(square, identity(300, 300)),
    EPSILON_STACK,
    CANVAS,
  )
  check('합동으로 판정', r.isCongruent, true)
  check('verdict = congruent', r.verdict, 'congruent', )
}

// ── 2. 방향이 달라도 합동 (핵심 교과서 성질) ─────────────
section('2. 방향이 달라도 합동 ⚠️ 핵심 성질')
{
  const r = checkCongruence(
    pts(square, identity(300, 300)),
    pts(square, { ...identity(300, 300), rotation: 45 }),
    EPSILON_STACK,
    CANVAS,
  )
  check('45도 회전 → 합동', r.isCongruent, true)
}
{
  const r = checkCongruence(
    pts(rect, identity(300, 300)),
    pts(rect, { ...identity(300, 300), rotation: 90 }),
    EPSILON_STACK,
    CANVAS,
  )
  check('직사각형 90도 회전 → 합동', r.isCongruent, true)
}
{
  const r = checkCongruence(
    pts(triangle, identity(300, 300)),
    pts(triangle, { ...identity(300, 300), rotation: 180 }),
    EPSILON_STACK,
    CANVAS,
  )
  check('삼각형 180도 회전 → 합동', r.isCongruent, true)
}

// ── 3. 뒤집어도 합동 ─────────────────────────────────────
section('3. 뒤집기(좌우 반사)')
{
  const r = checkCongruence(
    pts(square, identity(300, 300)),
    pts(square, { ...identity(300, 300), flipped: true }),
    EPSILON_STACK,
    CANVAS,
  )
  check('정사각형 좌우 반사 → 합동', r.isCongruent, true)
}
{
  // 정오각형은 회전 대칭(72°)이 있어 뒤집어도 같은 도형이다.
  // 초5 교과서에서도 정오각형은 선대칭·점대칭이 모두 잡힌다.
  const r = checkCongruence(
    pts(pentagon, identity(300, 300)),
    pts(pentagon, { ...identity(300, 300), flipped: true }),
    EPSILON_STACK,
    CANVAS,
  )
  check('정오각형 좌우 반사 → 합동 (회전 대칭)', r.isCongruent, true)
}
{
  // 정삼각형도 같은 이유로 뒤집어도 같다
  const r = checkCongruence(
    pts(triangle, identity(300, 300)),
    pts(triangle, { ...identity(300, 300), flipped: true }),
    EPSILON_STACK,
    CANVAS,
  )
  check('정삼각형 좌우 반사 → 합동 (점대칭)', r.isCongruent, true)
}

// ── 4. 모양만 같고 크기가 다름 ───────────────────────────
section('4. 모양은 같고 크기가 다름 → shape-only ⚠️ 핵심 발견')
{
  const r = checkCongruence(
    pts(square, identity(300, 300)),
    pts(square, { ...identity(300, 300), scale: 1.4 }),
    EPSILON_STACK,
    CANVAS,
  )
  check('합동 아님', r.isCongruent, false)
  check('모양은 같음', r.shapeMatches, true)
  check('크기는 다름', r.sizeMatches, false)
  check('verdict = shape-only', r.verdict, 'shape-only')
}

// ── 5. 모양 자체가 다름 ──────────────────────────────────
section('5. 모양이 다름')
{
  const r = checkCongruence(
    pts(square, identity(300, 300)),
    pts(triangle, identity(300, 300)),
    EPSILON_STACK,
    CANVAS,
  )
  check('정사각형 vs 삼각형 → 합동 아님', r.isCongruent, false)
  check('모양도 다름', r.shapeMatches, false)
  check('verdict = different', r.verdict, 'different')
}
{
  // 정사각형 vs 직사각형
  const r = checkCongruence(
    pts(square, identity(300, 300)),
    pts(rect, identity(300, 300)),
    EPSILON_STACK,
    CANVAS,
  )
  check('정사각형 vs 직사각형 → 모양 다름', r.shapeMatches, false)
}

// ── 6. 위치 판정 (포개기 모드) ──────────────────────────
section('6. 위치 판정 — 포개기 모드의 핵심')
{
  // 포개기 모드: 위치가 어긋나면 합동 아님
  const r = checkCongruence(
    pts(triangle, identity(100, 100)),
    pts(triangle, identity(800, 700)),
    EPSILON_STACK,
    CANVAS,
    true, // checkPosition
  )
  check('멀리 떨어져 있으면 → 합동 아님', r.isCongruent, false)
  check('모양은 같음 (형태 자체는 같으므로)', r.shapeMatches, false)
}
{
  // 같은 자리라면 합동
  const r = checkCongruence(
    pts(triangle, identity(100, 100)),
    pts(triangle, identity(100, 100)),
    EPSILON_STACK,
    CANVAS,
    true,
  )
  check('같은 자리 → 합동', r.isCongruent, true)
}
{
  // 문제 모드: 위치를 무시하고 모양만
  const r = checkCongruence(
    pts(triangle, identity(100, 100)),
    pts(triangle, identity(800, 700)),
    EPSILON_STACK,
    CANVAS,
    false, // 위치 무시
  )
  check('문제 모드: 위치 무시 → 모양 같음', r.shapeMatches, true)
}

// ── 7. 허용 오차 관대함 ──────────────────────────────────
section('7. 허용 오차 (아이 손놀림 고려)')
{
  // 아주 살짝 어긋난 도형 (2px)
  const r = checkCongruence(
    pts(square, identity(300, 300)),
    pts(square, identity(302, 300)),
    EPSILON_STACK,
    CANVAS,
    true,
  )
  check('2px 어긋남 → 관대하게 합동', r.isCongruent, true)
}
{
  // 확실히 어긋난 도형 (40px)
  const r = checkCongruence(
    pts(square, identity(300, 300)),
    pts(square, identity(340, 300)),
    EPSILON_STACK,
    CANVAS,
    true,
  )
  check('40px 어긋남 → 합동 아님', r.isCongruent, false)
}
{
  // 허용 오차 경계 확인
  //
  // ⚠️ 위치 허용선 = ε × canvasSize × 2 (포개기는 드래그로 맞추므로 더 관대)
  //    ε=0.015, canvas=1000 → 30px
  //    → 10px, 20px 어긋남은 관대하게 합동으로 인정 (아이 손놀림 고려)
  //    → 30px를 넘으면 위치가 어긋난 것으로 판정
  const r = checkCongruence(
    pts(square, identity(300, 300)),
    pts(square, identity(310, 300)),
    EPSILON_STACK,
    CANVAS,
    true,
  )
  check('10px 어긋남 → 관대하게 합동', r.isCongruent, true)

  const r2 = checkCongruence(
    pts(square, identity(300, 300)),
    pts(square, identity(320, 300)),
    EPSILON_STACK,
    CANVAS,
    true,
  )
  check('20px 어긋남 → 아직 허용 (관대하게)', r2.isCongruent, true)

  // 허용선(30px)을 확실히 넘긴 경우
  const r3 = checkCongruence(
    pts(square, identity(300, 300)),
    pts(square, identity(360, 300)),
    EPSILON_STACK,
    CANVAS,
    true,
  )
  check('60px 어긋남 → 위치 어긋남으로 판정', r3.isCongruent, false)
}

// ── 8. 점대칭 (180도 회전) — 단원 3 대비 ─────────────────
section('8. 점대칭 180도 회전 오차 검증')
{
  const orig = pts(square, identity(300, 300))
  const rotated = orig.map((p) => rotate180(p, { x: 300, y: 300 }))
  const r = checkCongruence(orig, rotated, EPSILON_STACK, CANVAS)
  check('정확한 180도 회전 → 합동', r.isCongruent, true)
  check(
    '누적 오차 < 1px',
    r.maxDeviation < 1,
    true,
  )
}

// ── 9. 선대칭 (다음 단원 대비) ───────────────────────────
section('9. 선대칭 반사 오차 검증')
{
  const orig = pts(square, identity(300, 300))
  const axis = { x: 300, y: 0 } as Point
  const axisB = { x: 300, y: 800 } as Point
  const reflected = orig.map((p) => reflectAcrossLine(p, axis, axisB))
  const r = checkCongruence(orig, reflected, EPSILON_STACK, CANVAS)
  check('선대칭 → 합동', r.isCongruent, true)
}

// ── 10. 다시 그리기 모드 오차 ────────────────────────────
section('10. 다시 그리기 모드 (ε 2%)')
{
  const r = checkCongruence(
    pts(square, identity(300, 300)),
    pts(square, identity(318, 300)),
    EPSILON_REDRAW,
    CANVAS,
  )
  check('18px 어긋남도 ε2%는 합동', r.isCongruent, true)
}

// ── 결과 ─────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`)
console.log(`✅ 통과: ${pass}   ❌ 실패: ${fail}`)
if (fail > 0) {
  console.log('\n⚠️  판정 엔진에 오류가 있습니다.')
  process.exit(1)
}
console.log('✅ 합동 판정 엔진 검증 완료')