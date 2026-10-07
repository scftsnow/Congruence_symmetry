/**
 * App shell.
 *
 * The congruence stage is one board: shapes are laid out, the child drags one
 * onto another, and rotates or flips until they coincide. There is no
 * shape-picker step and no separate "find" and "stack" screens, because
 * proving congruence and finding it are the same act.
 */

import { useState } from 'react'
import { CongruenceStage } from './modes/CongruenceStage'

type Screen = 'home' | 'congruence'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')

  if (screen === 'congruence') {
    return <CongruenceStage onBack={() => setScreen('home')} />
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
            <span className="panel__step">1</span> 합동과 대칭
          </h2>
          <p className="panel__hint">
            도형들을 <strong>겹쳐 보면서</strong> 같은 모양과 크기를 찾아봐요
          </p>
          <ul className="unit-list">
            <li className="unit-list__item unit-list__item--active">
              <span className="unit-list__badge">1</span>
              <span>
                <strong>합동인 도형 찾기</strong>
                <em>도형을 끌어다 겹치고, 돌리고, 뒤집어 확인</em>
              </span>
            </li>
            <li className="unit-list__item unit-list__item--locked">
              <span className="unit-list__badge">2</span>
              <span>
                <strong>대응점 찾기</strong>
                <em>겹쳤을 때 만나는 점과 변</em>
              </span>
            </li>
            <li className="unit-list__item unit-list__item--locked">
              <span className="unit-list__badge">3</span>
              <span>
                <strong>선대칭과 점대칭</strong>
                <em>접거나 돌려서 겹치는 중심</em>
              </span>
            </li>
          </ul>
        </section>

        <button
          type="button"
          className="start-btn"
          onClick={() => setScreen('congruence')}
        >
          합동인 도형 찾기 시작하기 →
        </button>
      </main>
    </div>
  )
}