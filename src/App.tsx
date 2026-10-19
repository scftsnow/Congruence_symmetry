/**
 * App shell.
 *
 * Three units so far, in the textbook's order: 합동 first, then what a match
 * actually pairs up, then the lines that fold a shape onto itself. The congruence stage is one board — the child drags a shape
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
 *
 * Line symmetry is three rows rather than one for the same reason: finding the
 * axis, finding what faces what across it, and the two facts about it are three
 * different questions, and one door for all three never said which was inside.
 */

import { useState } from 'react'
import { CongruenceStage } from './modes/CongruenceStage'
import { CorrespondenceStage } from './modes/CorrespondenceStage'
import { SymmetryAxisStage } from './modes/SymmetryAxisStage'
import { SymmetryPartsStage } from './modes/SymmetryPartsStage'
import { SymmetryFactsStage } from './modes/SymmetryFactsStage'
import { SymmetryDrawStage } from './modes/SymmetryDrawStage'
import { SymmetryPointAxisStage } from './modes/SymmetryPointAxisStage'
import { SymmetryPointPartsStage } from './modes/SymmetryPointPartsStage'
import { SymmetryPointFactsStage } from './modes/SymmetryPointFactsStage'
import { SymmetryPointDrawStage } from './modes/SymmetryPointDrawStage'

type Screen =
  | 'home'
  | 'congruence'
  | 'correspondence'
  | 'symmetry-axis'
  | 'symmetry-parts'
  | 'symmetry-facts'
  | 'symmetry-draw'
  | 'point-axis'
  | 'point-parts'
  | 'point-facts'
  | 'point-draw'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')

  if (screen === 'congruence') {
    return <CongruenceStage onBack={() => setScreen('home')} />
  }

  if (screen === 'correspondence') {
    return <CorrespondenceStage onBack={() => setScreen('home')} />
  }

  if (screen === 'symmetry-axis') {
    return <SymmetryAxisStage onBack={() => setScreen('home')} />
  }

  if (screen === 'symmetry-parts') {
    return <SymmetryPartsStage onBack={() => setScreen('home')} />
  }

  if (screen === 'symmetry-facts') {
    return <SymmetryFactsStage onBack={() => setScreen('home')} />
  }

  if (screen === 'symmetry-draw') {
    return <SymmetryDrawStage onBack={() => setScreen('home')} />
  }

  if (screen === 'point-axis') {
    return <SymmetryPointAxisStage onBack={() => setScreen('home')} />
  }

  if (screen === 'point-parts') {
    return <SymmetryPointPartsStage onBack={() => setScreen('home')} />
  }

  if (screen === 'point-facts') {
    return <SymmetryPointFactsStage onBack={() => setScreen('home')} />
  }

  if (screen === 'point-draw') {
    return <SymmetryPointDrawStage onBack={() => setScreen('home')} />
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
            <li className="unit-list__item unit-list__item--active">
              <button
                type="button"
                className="unit-open"
                onClick={() => setScreen('symmetry-axis')}
              >
                <span className="unit-list__badge">3</span>
                <span>
                  <strong>선대칭도형 찾기</strong>
                  <em>접으면 겹치는 선을 직접 그어 찾기</em>
                </span>
              </button>
            </li>
            <li className="unit-list__item unit-list__item--active">
              <button
                type="button"
                className="unit-open"
                onClick={() => setScreen('symmetry-parts')}
              >
                <span className="unit-list__badge">4</span>
                <span>
                  <strong>선대칭도형의 대응점·대응변·대응각</strong>
                  <em>대칭축을 사이에 두고 마주 보는 짝 찾기</em>
                </span>
              </button>
            </li>
            <li className="unit-list__item unit-list__item--active">
              <button
                type="button"
                className="unit-open"
                onClick={() => setScreen('symmetry-facts')}
              >
                <span className="unit-list__badge">5</span>
                <span>
                  <strong>선대칭도형의 성질</strong>
                  <em>마주 보는 점을 이으면 수직, 거리는 같음</em>
                </span>
              </button>
            </li>
            <li className="unit-list__item unit-list__item--active">
              <button
                type="button"
                className="unit-open"
                onClick={() => setScreen('symmetry-draw')}
              >
                <span className="unit-list__badge">6</span>
                <span>
                  <strong>선대칭도형 그리기</strong>
                  <em>반대쪽 대응점을 찾아 완성하기</em>
                </span>
              </button>
            </li>
            <li className="unit-list__item unit-list__item--active">
              <button
                type="button"
                className="unit-open"
                onClick={() => setScreen('point-axis')}
              >
                <span className="unit-list__badge">7</span>
                <span>
                  <strong>점대칭도형 찾기</strong>
                  <em>반 바퀴 돌려 겹치는 대칭의 중심을 눌러 찾기</em>
                </span>
              </button>
            </li>
            <li className="unit-list__item unit-list__item--active">
              <button
                type="button"
                className="unit-open"
                onClick={() => setScreen('point-parts')}
              >
                <span className="unit-list__badge">8</span>
                <span>
                  <strong>점대칭도형의 대응점·대응변·대응각</strong>
                  <em>대칭의 중심을 사이에 두고 마주 보는 짝 찾기</em>
                </span>
              </button>
            </li>
            <li className="unit-list__item unit-list__item--active">
              <button
                type="button"
                className="unit-open"
                onClick={() => setScreen('point-facts')}
              >
                <span className="unit-list__badge">9</span>
                <span>
                  <strong>점대칭도형의 성질</strong>
                  <em>잇는 선분은 중심을 지나고 거리는 같음</em>
                </span>
              </button>
            </li>
            <li className="unit-list__item unit-list__item--active">
              <button
                type="button"
                className="unit-open"
                onClick={() => setScreen('point-draw')}
              >
                <span className="unit-list__badge">10</span>
                <span>
                  <strong>점대칭도형 그리기</strong>
                  <em>반대쪽 대응점을 찾아 완성하기</em>
                </span>
              </button>
            </li>
          </ul>
        </section>

        </main>
    </div>
  )
}
