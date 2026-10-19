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
 * The first screen is a cover, not a list: the title, the earned stars, one
 * turning constellation and one way in. It used to also carry a sentence about
 * the app, a panel heading, a line explaining the first unit, a caption under
 * every row — a page of sentences, on the screens that have to be quick to
 * read, saying nothing a child cannot find out by opening the door. The unit
 * list waits one tap below, and the tap only scrolls: everything is already on
 * the page, so there is no second screen to get lost on the way to.
 *
 * A unit earns its star from its own stage, at the moment the ending popup goes
 * up, and keeps it in the browser — see useUnitProgress. Nothing here decides
 * whether a unit was finished; that is the board's own business.
 */

import { useRef, useState } from 'react'
import { Constellation } from './components/Constellation'
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
 *
 * A name and nothing else. Each row once carried a line describing what the
 * child would do inside; ten of those turned the list into a page of sentences
 * and none of them said anything the row's own name did not.
 */
const UNITS: Array<{ id: Screen; title: string }> = [
  { id: 'congruence', title: '합동인 도형 찾기' },
  { id: 'correspondence', title: '대응점 · 대응변 · 대응각 찾기' },
  { id: 'symmetry-axis', title: '선대칭도형 찾기' },
  { id: 'symmetry-parts', title: '선대칭도형의 대응점·대응변·대응각' },
  { id: 'symmetry-facts', title: '선대칭도형의 성질' },
  { id: 'symmetry-draw', title: '선대칭도형 그리기' },
  { id: 'point-axis', title: '점대칭도형 찾기' },
  { id: 'point-parts', title: '점대칭도형의 대응점·대응변·대응각' },
  { id: 'point-facts', title: '점대칭도형의 성질' },
  { id: 'point-draw', title: '점대칭도형 그리기' },
]

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const progress = useUnitProgress()
  const goHome = () => setScreen('home')
  const finish = (unit: Screen) => () => progress.markDone(unit)
  /*
   * The unit list lives one screenful down from the cover. The way in only
   * scrolls there — the list is already rendered below, so opening a unit is
   * never more than one tap away and there is no second first-screen to learn.
   */
  const listRef = useRef<HTMLElement | null>(null)
  const revealUnits = () => {
    const list = listRef.current
    if (!list) return
    const top = list.getBoundingClientRect().top + window.scrollY
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
    /*
     * A parachute for a browser that accepts 'smooth' and then never moves: if
     * half a second later nothing has happened at all, go there at once rather
     * than stranding the child on the cover with a button that did nothing.
     */
    if (!reduce) {
      const from = window.scrollY
      window.setTimeout(() => {
        if (Math.abs(window.scrollY - from) < 4) window.scrollTo({ top, behavior: 'auto' })
      }, 600)
    }
  }

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
      <section className="hero" aria-label="합동과 대칭 시작">
        <header className="home__header">
          <h1 className="home__title">합동과 대칭</h1>
          <p className="home__stars" aria-label={`해낸 단원 ${progress.count} / ${UNITS.length}`}>
            <span className="home__star" aria-hidden="true">
              ★
            </span>
            {progress.count} / {UNITS.length}
          </p>
        </header>

        <Constellation />

        <button type="button" className="start-btn hero__start" onClick={revealUnits}>
          시작하기
        </button>
      </section>

      <main className="home__main" ref={listRef}>
        <section className="panel" aria-label="단원 고르기">
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
                    <strong>{unit.title}</strong>
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