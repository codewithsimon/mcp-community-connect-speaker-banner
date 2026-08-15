import { describe, expect, it } from 'vitest'
import { planBanners } from '../src/bannerPlan'
import type { Session, Speaker } from '../src/types'

const speaker = (id: string): Speaker => ({
  id,
  fullName: `Speaker ${id}`,
  tagLine: 'Engineer',
  profilePicture: null,
})

const session = (count: number): Session => ({
  id: `session-${count}`,
  title: `${count} speaker session`,
  speakers: Array.from({ length: count }, (_, index) => speaker(String(index + 1))),
})

describe('planBanners', () => {
  it('plans one banner for a single-speaker session', () => {
    const result = planBanners([session(1)])
    expect(result.banners.map((banner) => banner.kind)).toEqual(['single'])
  })

  it('plans a combined banner and one banner per speaker', () => {
    const result = planBanners([session(3)])
    expect(result.banners.map((banner) => banner.kind)).toEqual([
      'combined',
      'individual',
      'individual',
      'individual',
    ])
  })

  it('warns and produces individual banners when a group exceeds the fixed collage', () => {
    const result = planBanners([session(5)])
    expect(result.banners).toHaveLength(5)
    expect(result.banners.every((banner) => banner.kind === 'individual')).toBe(true)
    expect(result.warnings[0]).toMatch(/supports up to 4/)
  })

  it('adds deterministic suffixes when normalized filenames collide', () => {
    const first = session(1)
    const second = { ...session(1), id: 'another-session' }
    const result = planBanners([first, second])

    expect(result.banners.map((banner) => banner.filename)).toEqual([
      '1-speaker-session-speaker-1.png',
      '1-speaker-session-speaker-1-2.png',
    ])
  })
})
