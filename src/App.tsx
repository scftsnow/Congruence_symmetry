/**
 * App shell — one screen at a time, panels inside.
 *
 * Stage order follows the textbook for 초5 2학기 3단원:
 *   stage1  find the congruent pair among scattered shapes
 *   stage2  stack that pair by hand to prove it
 *   stage3  corresponding points, edges and angles   (not built yet)
 */

import { useState } from 'react'
import { Stage1 } from './modes/Stage1Find'
import { StackPractice } from './modes/StackPractice'
import { BASIC_SHAPES } from './geometry/shapes'
import type { Shape } from './geometry/types'

type Screen = 'home' | 'stage1' | 'stage2'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [referenceShape, setReferenceShape] = useState<Shape>(BASIC_SHAPES[1])
  const [movableShape, setMovableShape] = useState<Shape>(BASIC_SHAPES[1])
  /** the pair handed over from stage 1 for hands-on proof */
  const [pair, setPair] = useState<{ from: string; to: string; label: string } | null>(null)

  if (screen === 'stage1') {
    return (
      <Stage1
        onBack={() => setScreen('home')}
        onVerifyPair={(from, to, label) => {
          setPair({ from, to, label })
          setScreen('stage2')
        }}
      />
    )
  }

  if (screen === 'stage2') {
    return (
      <StackPractice
        referenceShape={referenceShape}
        movableShape={movableShape}
        pairLabel={pair?.label}
        onBack={() => setScreen('stage1')}
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
        <section className="panel">
          <h2 className="panel__title">
            <span className="panel__step">1</span> 합동인 도형 찾기
          </h2>
          <p className="panel__hint">
            흩어져 있는 도형들에서 <strong>합동인 쌍</strong>을 찾아 이어 보세요
          </p>
          <ShapePicker selected={referenceShape.id} onSelect={setReferenceShape} />
        </section>

        <section className="panel">
          <h2 className="panel__title">
            <span className="panel__step">2</span> 직접 포개어 보기
          </h2>
          <p className="panel__hint">
            찾은 쌍을 실제로 <strong>겹쳐 보면서</strong> 확인해요
          </p>
          <ShapePicker selected={movableShape.id} onSelect={setMovableShape} />
        </section>

        <button
          type="button"
          className="start-btn"
          onClick={() => setScreen('stage1')}
        >
          합동인 도형 찾기 시작하기 →
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