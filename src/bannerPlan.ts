import { bannerFilename } from './filenames'
import type { BannerPlan, PlannedBanners, Session } from './types'

export const MAX_COMBINED_SPEAKERS = 4

export function planBanners(sessions: Session[]): PlannedBanners {
  const banners: BannerPlan[] = []
  const warnings: string[] = []
  const usedFilenames = new Set<string>()

  function uniqueFilename(proposed: string): string {
    if (!usedFilenames.has(proposed)) {
      usedFilenames.add(proposed)
      return proposed
    }

    const stem = proposed.replace(/\.png$/i, '')
    let suffix = 2
    while (usedFilenames.has(`${stem}-${suffix}.png`)) suffix += 1
    const filename = `${stem}-${suffix}.png`
    usedFilenames.add(filename)
    return filename
  }

  for (const session of sessions) {
    if (session.speakers.length === 1) {
      const speaker = session.speakers[0]
      banners.push({
        id: `${session.id}-${speaker.id}`,
        kind: 'single',
        session,
        speakers: [speaker],
        filename: uniqueFilename(bannerFilename(session.title, [speaker.fullName], false)),
      })
      continue
    }

    if (session.speakers.length <= MAX_COMBINED_SPEAKERS) {
      banners.push({
        id: `${session.id}-combined`,
        kind: 'combined',
        session,
        speakers: session.speakers,
        filename: uniqueFilename(
          bannerFilename(
            session.title,
            session.speakers.map((speaker) => speaker.fullName),
            true,
          ),
        ),
      })
    } else {
      warnings.push(
        `“${session.title}” has ${session.speakers.length} speakers; the combined card was skipped because the fixed layout supports up to ${MAX_COMBINED_SPEAKERS}.`,
      )
    }

    for (const speaker of session.speakers) {
      banners.push({
        id: `${session.id}-${speaker.id}`,
        kind: 'individual',
        session,
        speakers: [speaker],
        filename: uniqueFilename(bannerFilename(session.title, [speaker.fullName], false)),
      })
    }
  }

  return { banners, warnings }
}
