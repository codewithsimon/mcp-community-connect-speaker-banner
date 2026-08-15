export interface TextBox {
  x: number
  y: number
  width: number
  height: number
}

export interface FittedText {
  fontSize: number
  lineHeight: number
  lines: string[]
}

export type MeasureText = (text: string, fontSize: number) => number

export function wrapText(text: string, maxWidth: number, fontSize: number, measure: MeasureText): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []

  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (measure(candidate, fontSize) <= maxWidth) {
      current = candidate
      continue
    }

    if (current) lines.push(current)
    if (measure(word, fontSize) <= maxWidth) {
      current = word
      continue
    }

    let fragment = ''
    for (const character of word) {
      if (fragment && measure(fragment + character, fontSize) > maxWidth) {
        lines.push(fragment)
        fragment = character
      } else {
        fragment += character
      }
    }
    current = fragment
  }

  if (current) lines.push(current)
  return lines
}

export function fitText(
  text: string,
  box: Pick<TextBox, 'width' | 'height'>,
  preferredSize: number,
  minimumSize: number,
  lineHeightRatio: number,
  measure: MeasureText,
): FittedText | null {
  for (let fontSize = preferredSize; fontSize >= minimumSize; fontSize -= 1) {
    const lines = wrapText(text, box.width, fontSize, measure)
    const lineHeight = fontSize * lineHeightRatio
    if (lines.length > 0 && lines.length * lineHeight <= box.height) {
      return { fontSize, lineHeight, lines }
    }
  }
  return null
}
