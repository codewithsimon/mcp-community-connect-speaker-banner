import type { NormalizedSchedule, Session, Speaker } from './types'

const SESSIONIZE_HOSTS = new Set(['sessionize.com', 'www.sessionize.com'])
const API_ID_PATTERN = /^[a-zA-Z0-9_-]{4,64}$/

export function resolveSessionizeEndpoint(input: string): string {
  const value = input.trim()
  if (!value) {
    throw new Error('Enter a Sessionize public API ID or endpoint.')
  }

  if (API_ID_PATTERN.test(value)) {
    return `https://sessionize.com/api/v2/${value}/view/All`
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('Use a public API ID such as cnyq0f99 or a full Sessionize endpoint.')
  }

  if (
    url.protocol !== 'https:' ||
    !SESSIONIZE_HOSTS.has(url.hostname.toLowerCase()) ||
    !/^\/api\/v2\/[^/]+\/view\/all\/?$/i.test(url.pathname)
  ) {
    throw new Error('The endpoint must be a Sessionize HTTPS public view/All endpoint.')
  }

  url.hash = ''
  url.search = ''
  return url.toString().replace(/\/$/, '')
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

function optionalString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeSpeaker(value: unknown): Speaker | null {
  const record = asRecord(value)
  if (!record) return null

  const id = optionalString(record.id)
  const fullName = optionalString(record.fullName)
  if (!id || !fullName) return null

  return {
    id,
    fullName,
    tagLine: optionalString(record.tagLine),
    profilePicture: optionalString(record.profilePicture) || null,
  }
}

function speakerIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      const record = asRecord(item)
      return record ? optionalString(record.id) : ''
    })
    .filter(Boolean)
}

export function normalizeSessionizePayload(payload: unknown): NormalizedSchedule {
  const root = asRecord(payload)
  if (!root || !Array.isArray(root.sessions) || !Array.isArray(root.speakers)) {
    throw new Error('Sessionize returned an unexpected schema. Expected sessions and speakers arrays.')
  }

  const warnings: string[] = []
  const speakers = root.speakers
    .map(normalizeSpeaker)
    .filter((speaker): speaker is Speaker => speaker !== null)
  const speakersById = new Map(speakers.map((speaker) => [speaker.id, speaker]))

  const sessions: Session[] = []
  for (const value of root.sessions) {
    const record = asRecord(value)
    if (!record) continue

    const status = optionalString(record.status)
    if (status && status.toLowerCase() !== 'accepted') continue
    if (record.isServiceSession === true) continue

    const id = optionalString(record.id)
    const title = optionalString(record.title)
    if (!id || !title) continue

    const resolvedSpeakers = speakerIds(record.speakers)
      .map((speakerId) => speakersById.get(speakerId))
      .filter((speaker): speaker is Speaker => speaker !== undefined)

    if (resolvedSpeakers.length === 0) {
      warnings.push(`Skipped “${title}” because it has no matching speaker profile.`)
      continue
    }

    sessions.push({ id, title, speakers: resolvedSpeakers })
  }

  if (sessions.length === 0) {
    throw new Error('No accepted, non-service sessions with matching speakers were found.')
  }

  return { sessions, warnings }
}

export async function fetchSessionizeSchedule(
  input: string,
  signal?: AbortSignal,
): Promise<NormalizedSchedule> {
  const endpoint = resolveSessionizeEndpoint(input)
  let response: Response

  try {
    response = await fetch(endpoint, { signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error('Could not reach Sessionize. Check the public endpoint and your connection.')
  }

  if (!response.ok) {
    throw new Error(`Sessionize request failed with HTTP ${response.status}.`)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error('Sessionize returned a response that was not valid JSON.')
  }

  return normalizeSessionizePayload(payload)
}
