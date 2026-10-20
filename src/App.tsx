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
 * read, saying nothing a child cannot find out by opening the door.
 *
 * The way in changes the screen to the doors rather than scrolling to them:
 * the cover is the place you arrive, the doors are the place you choose, and
 * the two never share the frame. Going back from any unit lands on the doors,
 * never on the cover — the cover is only ever the beginning.
 *
 * A unit earns its star from its own stage, at the moment the ending popup goes
 * up, and keeps it in the browser — see useUnitProgress. Nothing here decides
 * whether a unit was finished; that is the board's own business.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { Constellation } from './components/Constellation'
import { SkyParticles } from './components/SkyParticles'
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
import { useUnitProgress, type UnitProgress } from './modes/useUnitProgress'

type Screen =
  | 'cover'
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

/** the ten doors, as a type: everything that is neither the cover nor the list */
export type UnitId = Exclude<Screen, 'cover' | 'home'>

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
const UNITS: Array<{ id: UnitId; title: string }> = [
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

/**
 * The doors as a screen of their own.
 *
 * Exported so the home screen can be read without opening the app: the cover
 * is what <App/> shows first, and a static render of that shows no doors at
 * all. What is handed in is the progress and the way out — nothing here decides
 * whether a unit was finished, and nothing here remembers it either.
 */
export function HomeUnits({
  progress,
  onOpen,
}: {
  progress: UnitProgress
  onOpen: (unit: UnitId) => void
}) {
  return (
    <main className="home__main">
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
                <button type="button" className="unit-open" onClick={() => onOpen(unit.id)}>
                  {done ? (
                    <span
                      className={
                        'unit-list__badge unit-list__badge--star' +
                        (progress.fresh === unit.id ? ' unit-list__badge--fresh' : '')
                      }
                      aria-label="해낸 단원"
                    >
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
  )
}

/** the count of finished units, worn in the top-right corner of every home screen */
export function EarnedStars({ progress }: { progress: UnitProgress }) {
  const fresh = progress.fresh !== null
  /*
   * The star and the number celebrate once, when the doors open on a unit just
   * finished. The record was written while the board was still up, so by the
   * time this mounts the count is already higher — without the flag there would
   * be nothing to tell a fresh arrival from a remembered one.
   */
  useEffect(() => {
    if (!fresh) return
    const timer = window.setTimeout(() => progress.settleFresh(), 1200)
    return () => window.clearTimeout(timer)
  }, [fresh, progress])
  return (
    <p
      className={'home__stars' + (fresh ? ' home__stars--fresh' : '')}
      aria-label={`해낸 단원 ${progress.count} / ${UNITS.length}`}
    >
      <span className="home__star" aria-hidden="true">
        ★
      </span>
      <span className={'home__stars__count' + (fresh ? ' home__stars__count--fresh' : '')}>
        {progress.count} / {UNITS.length}
      </span>
    </p>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('cover')
  const progress = useUnitProgress()
  const goHome = () => setScreen('home')
  const finish = (unit: UnitId) => () => progress.markDone(unit)

  /*
   * The particles drift behind every screen — the cover, the doors and the
   * boards alike — so the sky is one sky everywhere. They are collected here
   * rather than in each screen because no screen may forget them: a sky with a
   * hole in it where one unit sits is not one sky.
   */
  let stage: ReactNode = null
  if (screen === 'congruence') {
    stage = <CongruenceStage onBack={goHome} onComplete={finish('congruence')} />
  } else if (screen === 'correspondence') {
    stage = <CorrespondenceStage onBack={goHome} onComplete={finish('correspondence')} />
  } else if (screen === 'symmetry-axis') {
    stage = <SymmetryAxisStage onBack={goHome} onComplete={finish('symmetry-axis')} />
  } else if (screen === 'symmetry-parts') {
    stage = <SymmetryPartsStage onBack={goHome} onComplete={finish('symmetry-parts')} />
  } else if (screen === 'symmetry-facts') {
    stage = <SymmetryFactsStage onBack={goHome} onComplete={finish('symmetry-facts')} />
  } else if (screen === 'symmetry-draw') {
    stage = <SymmetryDrawStage onBack={goHome} onComplete={finish('symmetry-draw')} />
  } else if (screen === 'point-axis') {
    stage = <SymmetryPointAxisStage onBack={goHome} onComplete={finish('point-axis')} />
  } else if (screen === 'point-parts') {
    stage = <SymmetryPointPartsStage onBack={goHome} onComplete={finish('point-parts')} />
  } else if (screen === 'point-facts') {
    stage = <SymmetryPointFactsStage onBack={goHome} onComplete={finish('point-facts')} />
  } else if (screen === 'point-draw') {
    stage = <SymmetryPointDrawStage onBack={goHome} onComplete={finish('point-draw')} />
  }

  if (screen === 'cover') {
    return (
      <div className="home">
        <SkyParticles />
        <section className="hero" aria-label="합동과 대칭 시작">
          {/*
           * The title stands in the middle of the sky, with the constellations
           * around it: the great ring is drawn about the middle of its canvas,
           * so the title sits inside the ring rather than above the picture.
           */}
          <div className="hero__sky">
            <Constellation />
            <header className="home__header hero__header">
              <h1 className="home__title">합동과 대칭</h1>
              <button type="button" className="start-btn hero__start" onClick={goHome}>
                시작하기
              </button>
              <EarnedStars progress={progress} />
            </header>
          </div>
        </section>
      </div>
    )
  }

  return (
    <>
      <SkyParticles />
      {stage ?? (
        <div className="home">
          <header className="home__header home__header--doors">
            <h1 className="home__title">합동과 대칭</h1>
            <EarnedStars progress={progress} />
          </header>

          <HomeUnits progress={progress} onOpen={(unit) => setScreen(unit)} />
        </div>
      )}
    </>
  )
}