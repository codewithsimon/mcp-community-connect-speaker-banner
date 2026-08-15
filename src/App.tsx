import { useEffect, useRef, useState } from 'react'
import { planBanners } from './bannerPlan'
import { downloadBanner, downloadBannerZip } from './downloads'
import { renderBanner, validateBackground } from './renderer'
import { fetchSessionizeSchedule } from './sessionize'
import type { GeneratedBanner } from './types'

type Status = 'idle' | 'loading' | 'success' | 'error'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong while generating banners.'
}

export default function App() {
  const [apiInput, setApiInput] = useState('')
  const [background, setBackground] = useState<File | null>(null)
  const [backgroundError, setBackgroundError] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [banners, setBanners] = useState<GeneratedBanner[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const bannersRef = useRef<GeneratedBanner[]>([])
  const generationRef = useRef(0)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      bannersRef.current.forEach((banner) => URL.revokeObjectURL(banner.previewUrl))
    }
  }, [])

  function clearBanners() {
    bannersRef.current.forEach((banner) => URL.revokeObjectURL(banner.previewUrl))
    bannersRef.current = []
    setBanners([])
  }

  async function handleBackground(file: File | undefined) {
    abortRef.current?.abort()
    generationRef.current += 1
    setBackground(null)
    setBackgroundError('')
    clearBanners()
    if (!file) return

    try {
      await validateBackground(file)
      setBackground(file)
    } catch (error) {
      setBackgroundError(errorMessage(error))
    }
  }

  async function generate() {
    if (!background) {
      setStatus('error')
      setMessage('Upload a valid 1024×1024px conference background first.')
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    const generation = generationRef.current + 1
    generationRef.current = generation
    abortRef.current = controller
    clearBanners()
    setWarnings([])
    setStatus('loading')
    setMessage('Fetching sessions and rendering banners…')

    const generated: GeneratedBanner[] = []
    const discardGenerated = () => {
      generated.forEach((banner) => URL.revokeObjectURL(banner.previewUrl))
    }

    try {
      const schedule = await fetchSessionizeSchedule(apiInput, controller.signal)
      const planned = planBanners(schedule.sessions)

      for (const plan of planned.banners) {
        const rendered = await renderBanner(plan, background)
        if (generationRef.current !== generation) {
          discardGenerated()
          return
        }
        generated.push({
          ...plan,
          ...rendered,
          previewUrl: URL.createObjectURL(rendered.blob),
        })
      }

      if (generationRef.current !== generation) {
        discardGenerated()
        return
      }
      bannersRef.current = generated
      setBanners(generated)
      setWarnings([
        ...schedule.warnings,
        ...planned.warnings,
        ...generated.flatMap((banner) =>
          banner.warnings.map((warning) => `${banner.filename}: ${warning}`),
        ),
      ])
      setStatus('success')
      setMessage(`Generated ${generated.length} banner${generated.length === 1 ? '' : 's'}.`)
    } catch (error) {
      discardGenerated()
      if (error instanceof DOMException && error.name === 'AbortError') return
      setStatus('error')
      setMessage(errorMessage(error))
    }
  }

  function handleBannerDownload(banner: GeneratedBanner) {
    try {
      downloadBanner(banner)
    } catch (error) {
      setStatus('error')
      setMessage(`Could not download ${banner.filename}: ${errorMessage(error)}`)
    }
  }

  async function handleZipDownload() {
    try {
      await downloadBannerZip(banners)
    } catch (error) {
      setStatus('error')
      setMessage(`Could not create the ZIP download: ${errorMessage(error)}`)
    }
  }

  return (
    <main>
      <header className="hero">
        <div className="eyebrow">MCP Community Connect</div>
        <h1>Speaker banner generator</h1>
        <p>
          Turn accepted Sessionize sessions into ready-to-share conference artwork. Everything
          stays in your browser.
        </p>
      </header>

      <section className="panel form-panel" aria-labelledby="generator-heading">
        <div className="section-heading">
          <span>01</span>
          <div>
            <h2 id="generator-heading">Add event sources</h2>
            <p>Use the public Sessionize view endpoint and your conference-provided background.</p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            <span>Sessionize API ID or public endpoint</span>
            <input
              type="text"
              value={apiInput}
              onChange={(event) => {
                setApiInput(event.target.value)
                if (status === 'error') setStatus('idle')
              }}
              disabled={status === 'loading'}
              placeholder="cnyq0f99 or https://sessionize.com/api/v2/cnyq0f99/view/All"
              autoComplete="off"
              aria-describedby="api-help"
            />
            <small id="api-help">This is a public API ID, not a secret API key.</small>
          </label>

          <label>
            <span>Conference background</span>
            <div className={`file-input ${backgroundError ? 'invalid' : ''}`}>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={status === 'loading'}
                onChange={(event) => void handleBackground(event.target.files?.[0])}
                aria-describedby="background-help background-error"
              />
              <strong>{background ? background.name : 'Choose a 1024×1024 image'}</strong>
              <small id="background-help">Branding, date, location, and sponsors stay baked in.</small>
            </div>
            {backgroundError && (
              <small id="background-error" className="field-error" role="alert">
                {backgroundError}
              </small>
            )}
          </label>
        </div>

        <button
          className="primary-button"
          type="button"
          onClick={() => void generate()}
          disabled={status === 'loading' || !apiInput.trim() || !background}
        >
          {status === 'loading' ? 'Generating…' : 'Generate banners'}
        </button>

        {message && (
          <div className={`status status-${status}`} role={status === 'error' ? 'alert' : 'status'}>
            <span aria-hidden="true">{status === 'success' ? '✓' : status === 'error' ? '!' : '•••'}</span>
            {message}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="warnings" role="status">
            <strong>Review {warnings.length} warning{warnings.length === 1 ? '' : 's'}</strong>
            <ul>
              {warnings.map((warning, index) => (
                <li key={`${warning}-${index}`}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="results" aria-labelledby="results-heading">
        <div className="results-header">
          <div className="section-heading">
            <span>02</span>
            <div>
              <h2 id="results-heading">Preview and download</h2>
              <p>Exports remain exactly 1024×1024px on every screen size.</p>
            </div>
          </div>
          {banners.length > 0 && (
            <button
              className="secondary-button"
              type="button"
              onClick={() => void handleZipDownload()}
            >
              Download all as ZIP
            </button>
          )}
        </div>

        {banners.length === 0 ? (
          <div className="empty-state">
            <div aria-hidden="true">1024</div>
            <h3>Your banners will appear here</h3>
            <p>Upload a background and connect a Sessionize public endpoint to begin.</p>
          </div>
        ) : (
          <div className="banner-grid">
            {banners.map((banner) => (
              <article className="banner-card" key={banner.id}>
                <img
                  src={banner.previewUrl}
                  alt={`${banner.session.title} banner featuring ${banner.speakers.map((speaker) => speaker.fullName).join(', ')}`}
                  width="1024"
                  height="1024"
                />
                <div className="banner-meta">
                  <div>
                    <span>{banner.kind === 'combined' ? 'Combined' : 'Speaker'}</span>
                    <h3>{banner.session.title}</h3>
                    <p>{banner.speakers.map((speaker) => speaker.fullName).join(', ')}</p>
                  </div>
                  <button type="button" onClick={() => handleBannerDownload(banner)}>
                    Download PNG
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer>
        Built for MCP Community Connect. Session and profile data is fetched directly from
        Sessionize and is never uploaded elsewhere.
      </footer>
    </main>
  )
}
