/**
 * Display-label spec.
 *
 * Internal ids are english for the code's benefit. The child only ever sees
 * the hangul syllable, as in the textbook ("\uAC00\uC640 \uC0AC"). This spec
 * keeps that separation from collapsing again.
 */

import { describe, it, expect } from '../harness/api'
import { buildStage1Board, stage1PairLabel } from '../../src/modes/useStage1'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const board = buildStage1Board()

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

// The textbook syllables, in order.
const SYLLABLES = [
  '\uAC00', // ga
  '\uB098', // na
  '\uB2E4', // da
  '\uB77C', // ra
  '\uB9C8', // ma
  '\uBC14', // ba
  '\uC0AC', // sa
  '\uC544', // a
]

describe('every shape carries a display label', () => {
  it('gives every board item a label', () => {
    for (const item of board) {
      expect(typeof item.label === 'string' && item.label.length > 0).toBeTruthy()
    }
  })

  it('uses the textbook hangul syllables', () => {
    const labels = board.map((i) => i.label).sort()
    expect(labels).toContain(SYLLABLES[0])
    expect(labels).toContain(SYLLABLES[6])
  })

  it('never reuses a label', () => {
    const labels = board.map((i) => i.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('keeps every label to a single syllable', () => {
    for (const item of board) {
      expect([...item.label].length).toBe(1)
    }
  })
})

describe('internal ids never reach the screen', () => {
  it('the board renderer prints the label, not the id', () => {
    const stage = source('src/modes/Stage1Find.tsx')
    // the text node must use label
    expect(stage.includes('{item.label}')).toBeTruthy()
    // and must not print item.id inside a <text> element
    const textBlocks = stage.split('<text').slice(1)
    for (const block of textBlocks) {
      const body = block.split('</text>')[0]
      expect(body.includes('item.id')).toBeFalsy()
    }
  })

  it('formats the stage 2 header from labels', () => {
    const label = stage1PairLabel(board, 'ga', 'sa')
    expect(label).toBe(SYLLABLES[0] + ' \u00B7 ' + SYLLABLES[6])
    expect(label.includes('ga')).toBeFalsy()
    expect(label.includes('sa')).toBeFalsy()
  })

  it('falls back to the id only if a shape is missing', () => {
    // defensive: an unknown id must not produce undefined in the header
    const label = stage1PairLabel(board, 'ga', '__missing__')
    expect(label.includes(SYLLABLES[0])).toBeTruthy()
  })
})

const { report } = await import('../harness/spec.mjs')
report()