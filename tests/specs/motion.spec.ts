/**
 * Motion spec — a turn has to be seen.
 *
 * Two bugs hid here, and neither of them is visible in a screenshot.
 *
 * The first was that there was no animation at all. The shape was drawn from
 * absolute screen coordinates recomputed every render, so a turn replaced the
 * path between one frame and the next. The shape jumped from one angle to
 * another, which is the same as not turning it at all — the unit's whole claim
 * is that direction does not matter, and a jump gives the child no chance to
 * watch the two directions become the same shape.
 *
 * The second was subtler and would have appeared the moment the first was
 * fixed: the position is part of the transform, so transitioning it makes the
 * shape lag behind a moving finger. A child dragging a shape would be dragging
 * something that was not under their thumb.
 *
 * These are checked against the source, because neither produces markup that
 * differs. A rendered snapshot of a CSS transition is a snapshot of its first
 * frame, which looks exactly like no animation at all.
 */

import { describe, it, expect } from '../harness/api'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildBoard, shapePoints } from '../../src/modes/useBoard'
import { applyTransform } from '../../src/geometry/transforms'
import { judge, turnedItem } from '../../src/geometry/verdict'
import { findMatches } from '../../src/geometry/pairs'

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

/** Code with comments removed, so a file may explain itself without tripping a check. */
function code(path: string): string {
  return source(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
}

const CANVAS = 1100
const board = buildBoard()
const at = (shapeId: string) => board.find((i) => i.shape.id === shapeId)!

// ── the shape has to be drawn in local coordinates ────────
describe('the shape is drawn in its own coordinates so CSS can move it', () => {
  it('the outline is the shape local vertices, not screen coordinates', () => {
    // Drawn in screen coordinates there is nothing to transition: the path
    // changes and the shape is somewhere else next frame.
    const parts = source('src/components/BoardShapeView.tsx')
    expect(parts.includes('pointsToPath(item.shape.vertices)')).toBeTruthy()
  })

  it('the view does not recompute screen points', () => {
    const view = code('src/components/BoardShapeView.tsx')
    // shapePoints is still used by the overlay, which measures real geometry.
    // What must not happen is the view building its own outline from it.
    expect(view.includes('pointsToPath(shapePoints(')).toBeFalsy()
  })

  it('position, rotation and mirror are all CSS transforms', () => {
    const view = source('src/components/BoardShapeView.tsx')
    expect(view.includes('translate(')).toBeTruthy()
    expect(view.includes('rotate(')).toBeTruthy()
    // the mirror, so a flipped pair visibly turns over
    expect(view.includes('item.flipped ? -1 : 1')).toBeTruthy()
  })

  it('the label does not spin with its shape', () => {
    // A syllable that rotates is no longer a name for the shape, and the child
    // cannot point at 가 if 가 is upside down.
    const parts = source('src/components/BoardShapeView.tsx')
    const view = parts.slice(parts.indexOf('export function BoardShapeView'))

    const inner = view.slice(0, view.indexOf('</g>') + 4)
    expect(inner.includes('{item.label}')).toBeFalsy()
    expect(view.includes('{item.label}')).toBeTruthy()
  })
})

// ── the motion ───────────────────────────────────────────
describe('a turn is animated', () => {
  it('the transform is transitioned', () => {
    expect(/\.board-shape\s*\{[^}]*transition/.test(source('src/styles/board.css'))).toBeTruthy()
  })

  it('a quarter turn is long enough to follow', () => {
    // Under 300ms it reads as a jump, which is the failure this exists to fix.
    const css = source('src/styles/board.css')
    const match = css.match(/\.board-shape\s*\{[^}]*transform\s+(\d+)ms/)
    expect(match ? Number(match[1]) > 300 : false).toBeTruthy()
  })

  it('the whole transform moves, not just the rotation', () => {
    // A turn also carries the shape onto its partner. Splitting the two would
    // show the shape teleport and then spin, which is two motions instead of one.
    expect(/transform\s+\d+ms/.test(source('src/styles/board.css'))).toBeTruthy()
  })

  it('the transition is dropped while a finger is down', () => {
    // The position is part of the transform, so transitioning it makes the shape
    // lag behind a moving finger. This is the check that would have caught that.
    expect(/\.board-shape--dragging\s*\{[^}]*transition:\s*opacity/.test(source('src/styles/board.css'))).toBe(
      true,
    )
  })

  it('the screen tracks whether a shape is being dragged', () => {
    const stage = source('src/modes/CongruenceStage.tsx')
    expect(stage.includes('dragging')).toBeTruthy()
  })

  it('dragging starts on press and stops on release', () => {
    // The turn starts on release, which is exactly when the drag flag comes off
    // and the transition comes back.
    const stage = source('src/modes/CongruenceStage.tsx')
    expect(stage.includes('setDragging(true)')).toBeTruthy()
    expect(stage.includes('setDragging(false)')).toBeTruthy()
  })

  it('the flag is passed to the shape being dragged only', () => {
    // Only the held shape is exempt. Animating the others would make the whole
    // board creep whenever anything moved.
    const stage = source('src/modes/CongruenceStage.tsx')
    expect(stage.includes('dragging={dragging && board.held === item.id}')).toBeTruthy()
  })

  it('the class is actually applied', () => {
    const parts = source('src/components/BoardShapeView.tsx')
    expect(parts.includes('board-shape--dragging')).toBeTruthy()
  })
})

// ── a turn still ends in a real coincidence ──────────────
describe('the animation did not break the geometry', () => {
  const PAIRS: Array<[string, string]> = [
    ['rect-wide', 'rect-tall'],
    ['trap-lying', 'trap-side'],
    ['tri-scalene', 'tri-scalene-2'],
    ['arrow-right', 'arrow-up'],
    ['fish-right', 'fish-left'],
  ]

  it('every pair still lands where the drawn shape lands', () => {
    // The CSS transform has to be the same transform the geometry applies, or
    // the child watches a shape swing to one place and have it registered
    // somewhere else.
    const problems: string[] = []

    for (const [aId, bId] of PAIRS) {
      const a = at(aId)
      const held = { ...at(bId), x: a.x + 30, y: a.y + 25 }
      const r = judge(shapePoints(a), shapePoints(held), CANVAS)
      if (!r.solution) {
        problems.push(aId + '+' + bId + ': no turn')
        continue
      }

      const landed = turnedItem(held, r.solution)

      // what the geometry says the outline is
      const geometric = shapePoints(landed)

      // what the CSS transform puts on screen: local path, then
      // scale, then rotate, then translate — the order applyTransform uses
      const drawn = applyTransform(landed.shape.vertices, {
        cx: landed.x,
        cy: landed.y,
        rotation: landed.rotation,
        flipped: landed.flipped,
        scale: 1,
      })

      const worst = Math.max(
        ...geometric.map((p, i) => Math.hypot(p.x - drawn[i].x, p.y - drawn[i].y)),
      )
      if (worst > 0.01) problems.push(aId + '+' + bId + ': off by ' + worst.toFixed(3))

      if (findMatches([a, landed], CANVAS).length !== 1) {
        problems.push(aId + '+' + bId + ': not registered')
      }
    }

    expect(problems.length === 0 ? 'ok' : problems.join(', ')).toBe('ok')
  })

  it('the transform composes in the order the geometry does', () => {
    // CSS applies transform functions left to right, so the leftmost is the
    // outermost and runs last. `translate rotate scale` therefore means
    // scale first, then rotate, then translate — which is exactly what
    // applyTransform does. Written any other way round, a turned shape lands
    // beside its partner instead of on it, and nothing throws.
    const parts = source('src/components/BoardShapeView.tsx')
    const transform = parts.match(/transform: `([^`]*)`/)?.[1] ?? ''
    expect(transform).toBeTruthy()

    expect(transform.indexOf('translate')).toBeLessThan(transform.indexOf('rotate'))
    expect(transform.indexOf('rotate')).toBeLessThan(transform.indexOf('scale'))
  })

  it('the mirror on screen is about the axis the geometry mirrors about', () => {
    // The CSS scales x by -1 about the local origin. applyTransform mirrors x
    // about the origin too. If those ever drift apart the child watches a shape
    // claim to have turned over while its tail stays on the same side, and the
    // overlay is shading a region the shape is not actually in.
    const item = at('fish-left')
    expect(item.flipped).toBeTruthy()

    const drawn = applyTransform(item.shape.vertices, {
      cx: item.x, cy: item.y, rotation: item.rotation, flipped: item.flipped, scale: 1,
    })
    const plain = applyTransform(item.shape.vertices, {
      cx: item.x, cy: item.y, rotation: item.rotation, flipped: false, scale: 1,
    })

    // A mirror negates x about the local origin and leaves y untouched, so each
    // drawn vertex sits the same distance the other side of the origin as the
    // un-flipped one. Compared vertex by vertex, in outline order, because
    // sorting the two lists separately would pair up different corners and
    // prove nothing.
    for (let i = 0; i < drawn.length; i++) {
      const flippedOffset = drawn[i].x - item.x
      const plainOffset = plain[i].x - item.x
      expect(Math.abs(flippedOffset + plainOffset) < 0.01).toBeTruthy()
      expect(Math.abs(drawn[i].y - plain[i].y) < 0.01).toBeTruthy()
    }
  })
})

const { report } = await import('../harness/spec.mjs')
report()
