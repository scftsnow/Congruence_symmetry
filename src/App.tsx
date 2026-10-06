/**
 * 홈 화면
 *
 * ⚠️ 구조 원칙 (SPEC): 단일 화면 + 패널
 *    앱이 복잡해질수록 탭·라우팅 대신 한 화면 안에서 패널만 바꿾�다.
 */

import { useState } from 'react'
import { StackPractice } from './modes/StackPractice'
import { BASIC_SHAPES } from './geometry/shapes'
import type { Shape } from './geometry/types'

type Screen = 'home' | 'stack'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [referenceShape, setReferenceShape] = useState<Shape>(BASIC_SHAPES[1])
  const [movableShape, setMovableShape] = useState<Shape>(BASIC_SHAPES[1])

  if (screen === 'stack') {
    return (
      <StackPractice
        referenceShape={referenceShape}
        movableShape={movableShape}
        onBack={() => setScreen('home')}
      />
    )
  }

  return (
    <div className="home">
      <header className="home__header">
        <h1 className="home__title">합동과 대칭</h1>
        <p className="home__subtitle">도형을 만져보며 배우는 수학 놀이터</p>
      </header>

      <main className="home__main">
        {/* 1단계: 기준 도형 고르기 */}
        <section className="panel">
          <h2 className="panel__title">
            <span className="panel__step">1</span> 왼쪽 도형 고르기
          </h2>
          <p className="panel__hint">기준이 되는 도형을 골라줘</p>
          <ShapePicker
            selected={referenceShape.id}
            onSelect={setReferenceShape}
          />
        </section>

        {/* 2단계: 맞춰 볼 도형 고르기 */}
        <section className="panel">
          <h2 className="panel__title">
            <span className="panel__step">2</span> 오른쪽 도형 고르기
          </h2>
          <p className="panel__hint">
            <strong>같은 도형</strong>을 골라보거나, 다른 도형으로 실험해봐
          </p>
          <ShapePicker selected={movableShape.id} onSelect={setMovableShape} />
        </section>

        {/* 시작 */}
        <button
          type="button"
          className="start-btn"
          onClick={() => setScreen('stack')}
        >
          포개어 보기 시작하기 →
        </button>
      </main>
    </div>
  )
}

function ShapePicker({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (s: Shape) => void
}) {
  return (
    <div className="shape-picker" role="radiogroup">
      {BASIC_SHAPES.map((shape) => (
        <button
          key={shape.id}
          type="button"
          role="radio"
          aria-checked={selected === shape.id}
          className={`shape-chip ${selected === shape.id ? 'shape-chip--active' : ''}`}
          onClick={() => onSelect(shape)}
        >
          <svg viewBox="-80 -80 160 160" className="shape-chip__icon">
            <polygon
              points={shape.vertices.map((v) => `${v.x},${v.y}`).join(' ')}
              fill={shape.color}
              stroke="#1d3557"
              strokeWidth={4}
            />
          </svg>
          <span className="shape-chip__name">{shape.name}</span>
        </button>
      ))}
    </div>
  )
}