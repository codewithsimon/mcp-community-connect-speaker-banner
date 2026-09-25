import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import type { NormalizedSchedule } from '../src/types'

const schedule: NormalizedSchedule = {
  sessions: [
    {
      id: 'session-1',
      title: 'Building reliable agents',
      speakers: [
        {
          id: 'speaker-1',
          fullName: 'Ada Example',
          tagLine: 'Engineer',
          profilePicture: null,
        },
      ],
    },
  ],
  warnings: [],
}

vi.mock('../src/renderer', () => ({
  validateBackground: vi.fn().mockResolvedValue(undefined),
  renderBanner: vi.fn().mockResolvedValue({
    blob: new Blob(['png'], { type: 'image/png' }),
    warnings: [],
  }),
}))

vi.mock('../src/sessionize', () => ({
  fetchSessionizeSchedule: vi.fn((_input: string, signal?: AbortSignal) => {
    return new Promise<NormalizedSchedule>((resolve, reject) => {
      const timer = setTimeout(() => resolve(schedule), 10)
      signal?.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      })
    })
  }),
}))

describe('App generation', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:preview'),
      revokeObjectURL: vi.fn(),
    })
  })

  it('does not abort a new request when clearing previous banners', async () => {
    render(<App />)

    fireEvent.change(screen.getByPlaceholderText(/cnyq0f99 or/), {
      target: { value: 'cnyq0f99' },
    })
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')
    expect(fileInput).not.toBeNull()
    fireEvent.change(fileInput!, {
      target: { files: [new File(['background'], 'background.png', { type: 'image/png' })] },
    })

    const generateButton = screen.getByRole('button', { name: 'Generate banners' })
    await waitFor(() => expect(generateButton).toBeEnabled())
    fireEvent.click(generateButton)

    expect(await screen.findByText('Generated 1 banner.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Building reliable agents/ })).toBeInTheDocument()
  })

  it('generates square and widescreen versions when both backgrounds are supplied', async () => {
    render(<App />)

    fireEvent.change(screen.getByPlaceholderText(/cnyq0f99 or/), {
      target: { value: 'cnyq0f99' },
    })
    const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]')
    fireEvent.change(fileInputs[0], {
      target: { files: [new File(['square'], 'square.png', { type: 'image/png' })] },
    })
    fireEvent.change(fileInputs[1], {
      target: { files: [new File(['widescreen'], 'widescreen.png', { type: 'image/png' })] },
    })

    const generateButton = screen.getByRole('button', { name: 'Generate banners' })
    await waitFor(() => expect(generateButton).toBeEnabled())
    fireEvent.click(generateButton)

    expect(await screen.findByText('Generated 2 banners.')).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: /Building reliable agents/ })).toHaveLength(2)
    expect(screen.getByText(/Speaker · 16:9/)).toBeInTheDocument()
  })
})
