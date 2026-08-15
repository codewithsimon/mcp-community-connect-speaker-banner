import { describe, expect, it } from 'vitest'
import { normalizeSessionizePayload, resolveSessionizeEndpoint } from '../src/sessionize'

describe('resolveSessionizeEndpoint', () => {
  it('expands a public API ID', () => {
    expect(resolveSessionizeEndpoint('cnyq0f99')).toBe(
      'https://sessionize.com/api/v2/cnyq0f99/view/All',
    )
  })

  it('accepts and normalizes a full public endpoint', () => {
    expect(
      resolveSessionizeEndpoint(' https://sessionize.com/api/v2/cnyq0f99/view/All/?ignored=yes '),
    ).toBe('https://sessionize.com/api/v2/cnyq0f99/view/All')
  })

  it('rejects non-Sessionize URLs', () => {
    expect(() => resolveSessionizeEndpoint('https://example.com/api/v2/id/view/All')).toThrow(
      /Sessionize HTTPS/,
    )
  })
})

describe('normalizeSessionizePayload', () => {
  const payload = {
    speakers: [
      {
        id: 'speaker-1',
        fullName: 'Ada Lovelace',
        tagLine: 'Engineer',
        profilePicture: 'https://example.com/ada.png',
      },
    ],
    sessions: [
      {
        id: 'accepted',
        title: 'Useful session',
        status: 'Accepted',
        isServiceSession: false,
        speakers: ['speaker-1'],
      },
      {
        id: 'rejected',
        title: 'Rejected session',
        status: 'Rejected',
        speakers: ['speaker-1'],
      },
      {
        id: 'service',
        title: 'Lunch',
        status: 'Accepted',
        isServiceSession: true,
        speakers: ['speaker-1'],
      },
    ],
  }

  it('maps accepted non-service sessions to complete speakers', () => {
    expect(normalizeSessionizePayload(payload)).toEqual({
      sessions: [
        {
          id: 'accepted',
          title: 'Useful session',
          speakers: [
            {
              id: 'speaker-1',
              fullName: 'Ada Lovelace',
              tagLine: 'Engineer',
              profilePicture: 'https://example.com/ada.png',
            },
          ],
        },
      ],
      warnings: [],
    })
  })

  it('rejects an unexpected schema', () => {
    expect(() => normalizeSessionizePayload({ sessions: [] })).toThrow(/unexpected schema/)
  })
})
