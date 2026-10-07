/**
 * 앱 스모크 테스트 — 컴포넌트가 실제로 렌더되는지 검증
 *
 * 번들에 문자열이 있는 것과 화면이 뜨는 것은 다르다.
 * 실제로 마운트해서 DOM을 확인한다.
 *
 * 실행: npx tsx src/smoke.test.tsx
 */

import { renderToStaticMarkup } from 'react-dom/server'
import App from './App'
import { StackPractice } from './modes/StackPractice'
import { BASIC_SHAPES } from './geometry/shapes'
import type { Shape } from './geometry/types'
import { checkCongruence, EPSILON_STACK } from './geometry/compare'
import { applyTransform, identity } from './geometry/transforms'
import type { Point } from './geometry/types'

let pass = 0
let fail = 0

function ok(name: string, cond: boolean) {
  if (cond) {
    pass++
    console.log(`  ✅ ${name}`)
  } else {
    fail++
    console.log(`  ❌ ${name}`)
  }
}

function section(t: string) {
  console.log(`\n▶ ${t}`)
}

// ── 1. 홈 화면 렌더 ─────────────────────────────────────
section('1. 홈 화면 렌더링')
{
  const html = renderToStaticMarkup(<App />)
  console.log(`   (HTML ${html.length} bytes)`)

  ok('제목 "합동과 대칭" 포함', html.includes('합동과 대칭'))
  ok('단계 1 패널', html.includes('왼쪽 도형 고르기'))
  ok('단계 2 패널', html.includes('오른쪽 도형 고르기'))
  ok('시작 버튼', html.includes('포개어 보기 시작하기'))
  ok('도형 7종 모두 렌더', BASIC_SHAPES.every((s) => html.includes(s.name)))
  ok('정오각형 렌더됨', html.includes('정오각형'))
  ok('마름모 렌더됨', html.includes('마름모'))
  ok('SVG polygon 생성됨', html.includes('<polygon'))
}

// ── 2. 포개기 모드 렌더 ─────────────────────────────────
section('2. 포개기 모드 렌더링')
{
  const square = BASIC_SHAPES.find((s) => s.id === 'square') as Shape
  const html = renderToStaticMarkup(
    <StackPractice
      referenceShape={square}
      movableShape={square}
      onBack={() => {}}
    />,
  )
  console.log(`   (HTML ${html.length} bytes)`)

  ok('제목 "포개어 보자"', html.includes('포개어 보자'))
  ok('돌리기 버튼', html.includes('돌리기'))
  ok('뒤집기 버튼', html.includes('뒤집기'))
  ok('크기 버튼', html.includes('크기'))
  ok('처음부터 버튼', html.includes('처음부터'))
  ok('도형 경로(path) 생성됨', html.includes('<path'))
  ok('격자 렌더됨', html.includes('<line'))
  ok('안내 문구', html.includes('끌어서'))
}

// ── 3. 실사용 시나리오 — 그대로 포갔을 때 ────────────────
section('3. 포개기 시나리오 (실제 판정 흐름)')
{
  const square = BASIC_SHAPES.find((s) => s.id === 'square') as Shape
  const a: Point[] = applyTransform(square.vertices, identity(280, 310))
  const b: Point[] = applyTransform(square.vertices, identity(280, 310))

  const r = checkCongruence(a, b, EPSILON_STACK, 1000, true)
  ok('완전히 포개면 → congruent', r.verdict === 'congruent')
  ok('정답 판정', r.isCongruent === true)
}
{
  // 크기만 1.4배 → "모양은 같고 크기가 달라"
  const square = BASIC_SHAPES.find((s) => s.id === 'square') as Shape
  const a = applyTransform(square.vertices, identity(280, 310))
  const b = applyTransform(square.vertices, {
    ...identity(280, 310),
    scale: 1.4,
  })
  const r = checkCongruence(a, b, EPSILON_STACK, 1000, true)
  ok('크기만 다르면 → shape-only', r.verdict === 'shape-only')
  ok('모양은 같다고 인정', r.shapeMatches === true)
  ok('합동은 아님', r.isCongruent === false)
}
{
  // 90도 회전 → 방향 달라도 합동
  const square = BASIC_SHAPES.find((s) => s.id === 'square') as Shape
  const a = applyTransform(square.vertices, identity(280, 310))
  const b = applyTransform(square.vertices, {
    ...identity(280, 310),
    rotation: 90,
  })
  const r = checkCongruence(a, b, EPSILON_STACK, 1000, true)
  ok('90도 회전 → congruent', r.verdict === 'congruent')
}
{
  // 다른 도형 → 정답 없이 안내만
  const square = BASIC_SHAPES.find((s) => s.id === 'square') as Shape
  const tri = BASIC_SHAPES.find((s) => s.id === 'triangle') as Shape
  const a = applyTransform(square.vertices, identity(280, 310))
  const b = applyTransform(tri.vertices, identity(280, 310))
  const r = checkCongruence(a, b, EPSILON_STACK, 1000, true)
  ok('다른 도형 → different', r.verdict === 'different')
  ok('합동 아님', r.isCongruent === false)
}
{
  // 아직 포개지 않음 → 안내
  const square = BASIC_SHAPES.find((s) => s.id === 'square') as Shape
  const a = applyTransform(square.vertices, identity(280, 310))
  const b = applyTransform(square.vertices, identity(720, 420))
  const r = checkCongruence(a, b, EPSILON_STACK, 1000, true)
  ok('멀리 있으면 → different (포개지 않았음)', r.verdict === 'different')
}

// ── 4. 모든 도형 세트 기본 검증 ─────────────────────────
section('4. 모든 기본 도형 자기합동 검증')
for (const shape of BASIC_SHAPES) {
  const a = applyTransform(shape.vertices, identity(300, 300))
  const r = checkCongruence(a, a, EPSILON_STACK, 1000, true)
  ok(`${shape.name} 자기 자신과 → congruent`, r.verdict === 'congruent')
}

// ── 5. 회전 내성 검증 (방향 달라도 합동) ────────────────
section('5. 회전 내성 — 모든 도형')
for (const shape of BASIC_SHAPES) {
  const base = applyTransform(shape.vertices, identity(300, 300))
  const allOk = [90, 180, 270].every((deg) => {
    const rotated = applyTransform(shape.vertices, {
      ...identity(300, 300),
      rotation: deg,
    })
    return checkCongruence(base, rotated, EPSILON_STACK, 1000, true).isCongruent
  })
  ok(`${shape.name} 90/180/270도 회전 → 모두 합동`, allOk)
}

// ── 결과 ────────────────────────────────────────────────
console.log(`\n${'─'.repeat(52)}`)
console.log(`✅ 통과: ${pass}   ❌ 실패: ${fail}`)
if (fail > 0) {
  throw new Error(`스모크 테스트 ${fail}건 실패`)
}
console.log('✅ 앱 스모크 테스트 통과')