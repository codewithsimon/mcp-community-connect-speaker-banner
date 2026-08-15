import JSZip from 'jszip'
import type { GeneratedBanner } from './types'

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function downloadBanner(banner: GeneratedBanner): void {
  downloadBlob(banner.blob, banner.filename)
}

export async function downloadBannerZip(banners: GeneratedBanner[]): Promise<void> {
  const zip = new JSZip()
  for (const banner of banners) {
    zip.file(banner.filename, banner.blob)
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  downloadBlob(blob, 'mcp-community-connect-speaker-banners.zip')
}
