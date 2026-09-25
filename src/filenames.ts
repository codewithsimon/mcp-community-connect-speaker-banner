const MAX_PART_LENGTH = 60

export function safeFilenamePart(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_PART_LENGTH)
    .replace(/-+$/g, '')

  return normalized || 'banner'
}

export function bannerFilename(sessionTitle: string, speakerNames: string[], combined: boolean): string {
  const session = safeFilenamePart(sessionTitle)
  const people = combined ? 'all-speakers' : safeFilenamePart(speakerNames.join('-'))
  return `${session}-${people}.png`
}

export function widescreenBannerFilename(filename: string): string {
  return filename.replace(/\.png$/i, '-16x9.png')
}
