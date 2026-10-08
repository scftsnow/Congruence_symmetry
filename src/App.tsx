/**
 * App shell.
 *
 * Two units so far, in the textbook's order: 합동 first, then what a match
 * actually pairs up. The congruence stage is one board — the child drags a shape
 * onto another and the system turns or flips it until they coincide, with no
 * shape-picker step and no separate "find" and "stack" screens, because proving
 * congruence and finding it are the same act.
 *
 * The home has no start button of its own. It used to carry one below the list,
 * pointing at the first unit, which meant two different-sized doors into the same
 * room and no way to tell which was the front one. The rows of the list are now
 * the only way in.
 *
 * The correspondence stage is a separate screen rather than a fourth step of the
 * board. It has its own shapes and its own question, and bolting it onto a board
 * the child has already worked through would make two different activities share
 * one set of rules.
 */

import { useState } from 'react'
import { CongruenceStage } from './modes/CongruenceStage'
import { CorrespondenceStage } from './modes/CorrespondenceStage'

type Screen = 'home' | 'congruence' | 'correspondence'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')

  if (screen === 'congruence') {
    return <CongruenceStage onBack={() => setScreen('home')} />
  }

  if (screen === 'correspondence') {
    return <CorrespondenceStage onBack={() => setScreen('home')} />
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
              <button
                type="button"
                className="unit-open"
                onClick={() => setScreen('congruence')}
              >
                <span className="unit-list__badge">1</span>
                <span>
                  <strong>합동인 도형 찾기</strong>
                  <em>도형을 끌어다 겹치고, 돌리고, 뒤집어 확인</em>
                </span>
              </button>
            </li>
            <li className="unit-list__item unit-list__item--active">
              <button
                type="button"
                className="unit-open"
                onClick={() => setScreen('correspondence')}
              >
                <span className="unit-list__badge">2</span>
                <span>
                  <strong>대응점 · 대응변 · 대응각 찾기</strong>
                  <em>빛나는 점·변·각의 짝을 찾아보기</em>
                </span>
              </button>
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

        </main>
    </div>
  )
}