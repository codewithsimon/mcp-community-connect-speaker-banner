import { describe, expect, it } from 'vitest'
import { fitText, wrapText } from '../src/textFit'

const measure = (text: string, fontSize: number) => text.length * fontSize * 0.5

describe('wrapText', () => {
  it('wraps at word boundaries', () => {
    expect(wrapText('one two three', 40, 10, measure)).toEqual(['one two', 'three'])
  })

  it('splits a word that is wider than the box', () => {
    expect(wrapText('abcdefghij', 20, 10, measure)).toEqual(['abcd', 'efgh', 'ij'])
  })
})

describe('fitText', () => {
  it('shrinks deterministically until all lines fit', () => {
    const fitted = fitText('one two three four', { width: 60, height: 30 }, 16, 8, 1.1, measure)
    expect(fitted).not.toBeNull()
    expect(fitted!.fontSize).toBeLessThan(16)
    expect(fitted!.lines.length * fitted!.lineHeight).toBeLessThanOrEqual(30)
  })

  it('returns null when text cannot fit at the minimum', () => {
    expect(fitText('many words that cannot fit', { width: 20, height: 5 }, 12, 10, 1.1, measure)).toBeNull()
  })
})
