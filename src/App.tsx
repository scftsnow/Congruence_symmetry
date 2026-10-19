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
 *
 * WHAT THE HOME SAYS, AND WHAT IT DOES NOT
 * --------------------------------------
 * The header carries the count of finished units and the list carries a star per
 * finished unit. It used to carry a sentence about the app, a panel heading and a
 * line explaining the first unit: three pieces of text that said nothing a child
 * cannot already see, in the one place that has to be quick to read. What is left
 * is the title, the stars, and the doors.
 *
 * A unit earns its star from its own stage, at the moment the ending popup goes
 * up, and keeps it in the browser — see useUnitProgress. Nothing here decides
 * whether a unit was finished; that is the board's own business.
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
import { useUnitProgress } from './modes/useUnitProgress'

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

/**
 * The doors, in the order the textbook puts them in.
 *
 * A list rather than ten hand-written rows, because three things now have to
 * agree about every unit — which screen it opens, what its star is stored under,
 * and what it says — and a list is where those three can only be written once.
 * The screen id doubles as the stored id: they are the same name for the same
 * unit, and a second name for it would be a second thing to keep in step.
 */
const UNITS: Array<{ id: Screen; title: string; hint: string }> = [
  {
    id: 'congruence',
    title: '합동인 도형 찾기',
    hint: '도형을 끌어다 겹치고, 돌리고, 뒤집어 확인',
  },
  {
    id: 'correspondence',
    title: '대응점 · 대응변 · 대응각 찾기',
    hint: '빛나는 점·변·각의 짝을 찾아보기',
  },
  {
    id: 'symmetry-axis',
    title: '선대칭도형 찾기',
    hint: '접으면 겹치는 선을 직접 그어 찾기',
  },
  {
    id: 'symmetry-parts',
    title: '선대칭도형의 대응점·대응변·대응각',
    hint: '대칭축을 사이에 두고 마주 보는 짝 찾기',
  },
  {
    id: 'symmetry-facts',
    title: '선대칭도형의 성질',
    hint: '마주 보는 점을 이으면 수직, 거리는 같음',
  },
  {
    id: 'symmetry-draw',
    title: '선대칭도형 그리기',
    hint: '반대쪽 대응점을 찾아 완성하기',
  },
  {
    id: 'point-axis',
    title: '점대칭도형 찾기',
    hint: '반 바퀴 돌려 겹치는 대칭의 중심을 눌러 찾기',
  },
  {
    id: 'point-parts',
    title: '점대칭도형의 대응점·대응변·대응각',
    hint: '대칭의 중심을 사이에 두고 마주 보는 짝 찾기',
  },
  {
    id: 'point-facts',
    title: '점대칭도형의 성질',
    hint: '잇는 선분은 중심을 지나고 거리는 같음',
  },
  {
    id: 'point-draw',
    title: '점대칭도형 그리기',
    hint: '반대쪽 대응점을 찾아 완성하기',
  },
]

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const progress = useUnitProgress()
  const goHome = () => setScreen('home')
  const finish = (unit: Screen) => () => progress.markDone(unit)

  if (screen === 'congruence') {
    return <CongruenceStage onBack={goHome} onComplete={finish('congruence')} />
  }

  if (screen === 'correspondence') {
    return <CorrespondenceStage onBack={goHome} onComplete={finish('correspondence')} />
  }

  if (screen === 'symmetry-axis') {
    return <SymmetryAxisStage onBack={goHome} onComplete={finish('symmetry-axis')} />
  }

  if (screen === 'symmetry-parts') {
    return <SymmetryPartsStage onBack={goHome} onComplete={finish('symmetry-parts')} />
  }

  if (screen === 'symmetry-facts') {
    return <SymmetryFactsStage onBack={goHome} onComplete={finish('symmetry-facts')} />
  }

  if (screen === 'symmetry-draw') {
    return <SymmetryDrawStage onBack={goHome} onComplete={finish('symmetry-draw')} />
  }

  if (screen === 'point-axis') {
    return <SymmetryPointAxisStage onBack={goHome} onComplete={finish('point-axis')} />
  }

  if (screen === 'point-parts') {
    return <SymmetryPointPartsStage onBack={goHome} onComplete={finish('point-parts')} />
  }

  if (screen === 'point-facts') {
    return <SymmetryPointFactsStage onBack={goHome} onComplete={finish('point-facts')} />
  }

  if (screen === 'point-draw') {
    return <SymmetryPointDrawStage onBack={goHome} onComplete={finish('point-draw')} />
  }

  return (
    <div className="home">
      <header className="home__header">
        <h1 className="home__title">합동과 대칭</h1>
        <p className="home__stars" aria-label={`해낸 단원 ${progress.count} / ${UNITS.length}`}>
          <span className="home__star" aria-hidden="true">
            ★
          </span>
          {progress.count} / {UNITS.length}
        </p>
      </header>

      <main className="home__main">
        <section className="panel">
          <ul className="unit-list">
            {UNITS.map((unit, i) => {
              const done = progress.isDone(unit.id)
              return (
                <li
                  key={unit.id}
                  className={
                    'unit-list__item unit-list__item--active' +
                    (done ? ' unit-list__item--done' : '')
                  }
                >
                  <button
                    type="button"
                    className="unit-open"
                    onClick={() => setScreen(unit.id)}
                  >
                    {done ? (
                      <span className="unit-list__badge unit-list__badge--star" aria-label="해낸 단원">
                        ★
                      </span>
                    ) : (
                      <span className="unit-list__badge">{i + 1}</span>
                    )}
                    <span>
                      <strong>{unit.title}</strong>
                      <em>{unit.hint}</em>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      </main>
    </div>
  )
}