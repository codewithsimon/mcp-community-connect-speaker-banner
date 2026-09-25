import { describe, expect, it } from 'vitest'
import { bannerFilename, safeFilenamePart, widescreenBannerFilename } from '../src/filenames'

describe('safe filenames', () => {
  it('removes unsafe characters and normalizes whitespace', () => {
    expect(safeFilenamePart('  Café: MCP / PR?  ')).toBe('cafe-mcp-pr')
  })

  it('uses a deterministic fallback', () => {
    expect(safeFilenamePart('✨')).toBe('banner')
  })

  it('builds a PNG filename', () => {
    expect(bannerFilename('My Session', ['Ada Lovelace'], false)).toBe(
      'my-session-ada-lovelace.png',
    )
  })

  it('marks widescreen exports without changing the square filename', () => {
    expect(widescreenBannerFilename('my-session-ada-lovelace.png')).toBe(
      'my-session-ada-lovelace-16x9.png',
    )
  })
})
