export interface Speaker {
  id: string
  fullName: string
  tagLine: string
  profilePicture: string | null
}

export interface Session {
  id: string
  title: string
  speakers: Speaker[]
}

export interface NormalizedSchedule {
  sessions: Session[]
  warnings: string[]
}

export type BannerKind = 'single' | 'combined' | 'individual'

export interface BannerPlan {
  id: string
  kind: BannerKind
  session: Session
  speakers: Speaker[]
  filename: string
}

export interface PlannedBanners {
  banners: BannerPlan[]
  warnings: string[]
}

export interface GeneratedBanner extends BannerPlan {
  blob: Blob
  previewUrl: string
  warnings: string[]
}
