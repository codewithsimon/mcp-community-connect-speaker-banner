import type { BannerFormat, BannerPlan, Speaker } from './types'
import { fitText, type FittedText, type TextBox } from './textFit'

export const BANNER_SIZE = 1024
export const WIDESCREEN_WIDTH = 1920
export const WIDESCREEN_HEIGHT = 1080

interface Layout {
  width: number
  height: number
  color: string
  titleBox: TextBox
  titlePreferred: number
  titleMinimum: number
  nameBox: TextBox
  namePreferred: number
  nameMinimum: number
  taglineBox: TextBox
  taglinePreferred: number
  taglineMinimum: number
  headshot: { x: number; y: number; radius: number }
  combinedArea: TextBox
}

const LAYOUTS: Record<BannerFormat, Layout> = {
  square: {
    width: BANNER_SIZE,
    height: BANNER_SIZE,
    color: '#001f56',
    titleBox: { x: 63, y: 350, width: 485, height: 205 },
    titlePreferred: 58,
    titleMinimum: 30,
    nameBox: { x: 650, y: 588, width: 335, height: 52 },
    namePreferred: 40,
    nameMinimum: 24,
    taglineBox: { x: 668, y: 645, width: 300, height: 62 },
    taglinePreferred: 23,
    taglineMinimum: 15,
    headshot: { x: 818, y: 432, radius: 126 },
    combinedArea: { x: 638, y: 310, width: 360, height: 390 },
  },
  widescreen: {
    width: WIDESCREEN_WIDTH,
    height: WIDESCREEN_HEIGHT,
    color: '#ffffff',
    titleBox: { x: 130, y: 455, width: 835, height: 300 },
    titlePreferred: 86,
    titleMinimum: 44,
    nameBox: { x: 1320, y: 742, width: 430, height: 75 },
    namePreferred: 62,
    nameMinimum: 34,
    taglineBox: { x: 1340, y: 833, width: 390, height: 86 },
    taglinePreferred: 34,
    taglineMinimum: 22,
    headshot: { x: 1535, y: 510, radius: 191 },
    combinedArea: { x: 1260, y: 300, width: 550, height: 590 },
  },
}

interface RenderResult {
  blob: Blob
  warnings: string[]
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('The browser could not encode the banner as PNG.'))
    }, 'image/png')
  })
}

async function loadImage(source: string | Blob): Promise<HTMLImageElement> {
  const url = typeof source === 'string' ? source : URL.createObjectURL(source)
  try {
    const image = new Image()
    image.decoding = 'async'
    if (typeof source === 'string') image.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Image could not be loaded.'))
      image.src = url
    })
    return image
  } finally {
    if (typeof source !== 'string') URL.revokeObjectURL(url)
  }
}

export async function validateBackground(file: File, format: BannerFormat): Promise<void> {
  let image: HTMLImageElement
  try {
    image = await loadImage(file)
  } catch {
    throw new Error('The selected background is not a readable image.')
  }
  const layout = LAYOUTS[format]
  if (image.naturalWidth !== layout.width || image.naturalHeight !== layout.height) {
    throw new Error(
      `Background must be exactly ${layout.width}×${layout.height}px; this image is ${image.naturalWidth}×${image.naturalHeight}px.`,
    )
  }
}

async function ensureFonts(): Promise<void> {
  await Promise.all([
    document.fonts.load('700 58px "DM Sans"'),
    document.fonts.load('400 24px "DM Sans"'),
  ])
  if (!document.fonts.check('700 58px "DM Sans"')) {
    throw new Error('DM Sans could not be loaded. Refresh the page before generating banners.')
  }
}

function measureWith(ctx: CanvasRenderingContext2D, weight: 400 | 700) {
  return (text: string, fontSize: number) => {
    ctx.font = `${weight} ${fontSize}px "DM Sans"`
    return ctx.measureText(text).width
  }
}

function drawText(
  ctx: CanvasRenderingContext2D,
  fitted: FittedText,
  box: TextBox,
  weight: 400 | 700,
  align: CanvasTextAlign,
  color: string,
): void {
  ctx.save()
  ctx.beginPath()
  ctx.rect(box.x, box.y, box.width, box.height)
  ctx.clip()
  ctx.fillStyle = color
  ctx.font = `${weight} ${fitted.fontSize}px "DM Sans"`
  ctx.textAlign = align
  ctx.textBaseline = 'top'

  const totalHeight = fitted.lines.length * fitted.lineHeight
  let y = box.y + Math.max(0, (box.height - totalHeight) / 2)
  const x = align === 'center' ? box.x + box.width / 2 : box.x
  for (const line of fitted.lines) {
    ctx.fillText(line, x, y)
    y += fitted.lineHeight
  }
  ctx.restore()
}

function fitAndDraw(
  ctx: CanvasRenderingContext2D,
  text: string,
  box: TextBox,
  preferred: number,
  minimum: number,
  weight: 400 | 700,
  align: CanvasTextAlign,
  label: string,
  warnings: string[],
  color: string,
): void {
  const fitted = fitText(text, box, preferred, minimum, 1.12, measureWith(ctx, weight))
  if (!fitted) {
    warnings.push(`${label} does not fit the fixed layout at the minimum font size.`)
    drawOverflowWarning(ctx, box, `${label} too long`)
    return
  }
  drawText(ctx, fitted, box, weight, align, color)
}

function drawOverflowWarning(ctx: CanvasRenderingContext2D, box: TextBox, message: string): void {
  ctx.save()
  ctx.fillStyle = '#fff4e5'
  ctx.strokeStyle = '#b54708'
  ctx.lineWidth = 2
  ctx.fillRect(box.x, box.y, box.width, box.height)
  ctx.strokeRect(box.x, box.y, box.width, box.height)
  ctx.fillStyle = '#7a2e0e'
  ctx.font = '700 16px "DM Sans"'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(message, box.x + box.width / 2, box.y + box.height / 2, box.width - 16)
  ctx.restore()
}

function drawPhotoPlaceholder(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  color: string,
): void {
  ctx.save()
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
  ctx.fillStyle = '#e5edf7'
  ctx.fill()
  ctx.strokeStyle = '#7b91ad'
  ctx.lineWidth = Math.max(2, radius * 0.025)
  ctx.stroke()
  ctx.fillStyle = color
  ctx.font = `700 ${Math.max(12, radius * 0.14)}px "DM Sans"`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Photo unavailable', centerX, centerY, radius * 1.5)
  ctx.restore()
}

async function drawHeadshot(
  ctx: CanvasRenderingContext2D,
  speaker: Speaker,
  centerX: number,
  centerY: number,
  radius: number,
  warnings: string[],
  color: string,
): Promise<void> {
  if (!speaker.profilePicture) {
    warnings.push(`${speaker.fullName} has no profile picture.`)
    drawPhotoPlaceholder(ctx, centerX, centerY, radius, color)
    return
  }

  let image: HTMLImageElement
  try {
    image = await loadImage(speaker.profilePicture)
  } catch {
    warnings.push(`Could not load the profile picture for ${speaker.fullName}.`)
    drawPhotoPlaceholder(ctx, centerX, centerY, radius, color)
    return
  }

  const diameter = radius * 2
  const scale = Math.max(diameter / image.naturalWidth, diameter / image.naturalHeight)
  const width = image.naturalWidth * scale
  const height = image.naturalHeight * scale

  ctx.save()
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(image, centerX - width / 2, centerY - height / 2, width, height)
  ctx.restore()
}

async function drawSingleSpeaker(
  ctx: CanvasRenderingContext2D,
  speaker: Speaker,
  warnings: string[],
  layout: Layout,
): Promise<void> {
  const { headshot } = layout
  await drawHeadshot(ctx, speaker, headshot.x, headshot.y, headshot.radius, warnings, layout.color)
  fitAndDraw(
    ctx,
    speaker.fullName,
    layout.nameBox,
    layout.namePreferred,
    layout.nameMinimum,
    700,
    'center',
    'Speaker name',
    warnings,
    layout.color,
  )
  fitAndDraw(
    ctx,
    speaker.tagLine || 'Designation not provided',
    layout.taglineBox,
    layout.taglinePreferred,
    layout.taglineMinimum,
    400,
    'center',
    'Speaker designation',
    warnings,
    layout.color,
  )
}

async function drawCombinedSpeakers(
  ctx: CanvasRenderingContext2D,
  speakers: Speaker[],
  warnings: string[],
  layout: Layout,
): Promise<void> {
  const columns = speakers.length === 2 ? 2 : 2
  const rows = Math.ceil(speakers.length / columns)
  const area = layout.combinedArea
  const cellWidth = area.width / columns
  const cellHeight = area.height / rows
  const scale = layout.width / BANNER_SIZE
  const radius = (rows === 1 ? 66 : 48) * scale

  await Promise.all(
    speakers.map(async (speaker, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      const cellX = area.x + column * cellWidth
      const cellY = area.y + row * cellHeight
      const centerX = cellX + cellWidth / 2
      const centerY = cellY + radius + 2

      await drawHeadshot(ctx, speaker, centerX, centerY, radius, warnings, layout.color)
      const nameBox: TextBox = {
        x: cellX + 6,
        y: centerY + radius + 8,
        width: cellWidth - 12,
        height: (rows === 1 ? 48 : 40) * scale,
      }
      const taglineBox: TextBox = {
        x: cellX + 8,
        y: nameBox.y + nameBox.height,
        width: cellWidth - 16,
        height: (rows === 1 ? 58 : 42) * scale,
      }
      fitAndDraw(
        ctx,
        speaker.fullName,
        nameBox,
        (rows === 1 ? 24 : 20) * scale,
        14 * scale,
        700,
        'center',
        `${speaker.fullName} name`,
        warnings,
        layout.color,
      )
      fitAndDraw(
        ctx,
        speaker.tagLine || 'Designation not provided',
        taglineBox,
        (rows === 1 ? 17 : 14) * scale,
        11 * scale,
        400,
        'center',
        `${speaker.fullName} designation`,
        warnings,
        layout.color,
      )
    }),
  )
}

export async function renderBanner(
  plan: BannerPlan,
  background: File,
  format: BannerFormat,
): Promise<RenderResult> {
  await ensureFonts()
  const backgroundImage = await loadImage(background)
  const layout = LAYOUTS[format]
  const canvas = document.createElement('canvas')
  canvas.width = layout.width
  canvas.height = layout.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas rendering is not supported by this browser.')

  ctx.drawImage(backgroundImage, 0, 0, layout.width, layout.height)
  const warnings: string[] = []
  fitAndDraw(
    ctx,
    plan.session.title,
    layout.titleBox,
    layout.titlePreferred,
    layout.titleMinimum,
    700,
    'left',
    'Session title',
    warnings,
    layout.color,
  )

  if (plan.kind === 'combined') {
    await drawCombinedSpeakers(ctx, plan.speakers, warnings, layout)
  } else {
    await drawSingleSpeaker(ctx, plan.speakers[0], warnings, layout)
  }

  return { blob: await canvasToBlob(canvas), warnings }
}
