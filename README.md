# MCP Community Connect speaker banner generator

A static, browser-only tool for creating 1024×1024 conference speaker banners from a
[Sessionize](https://sessionize.com/) public schedule and a conference-provided background.

The generator uses a fixed MCP Community Connect layout: session title on the left, speaker
headshot and details on the right. Event date, location, sponsor logos, and other event branding
remain part of the uploaded background.

## Use the generator

1. In Sessionize, find the event's public API endpoint. Enter either its API ID (for example,
   `cnyq0f99`) or the complete public endpoint
   (`https://sessionize.com/api/v2/cnyq0f99/view/All`).
2. Upload the event's 1024×1024 background image.
3. Select **Generate banners**.
4. Download an individual PNG or all generated banners in one ZIP.

The Sessionize value is a **public API ID or public endpoint**, not an API key or secret. The
application fetches accepted, non-service sessions and matches each session's speaker IDs with
the speaker profiles in the same response.

For sessions with multiple speakers, the generator produces:

- one combined banner with a fixed speaker collage (up to four speakers); and
- one individual banner for each speaker.

Sessions with more than four speakers still receive individual banners and show a warning that a
combined banner cannot fit cleanly in the fixed layout. Missing or inaccessible profile photos are
replaced with a visible placeholder. Text that cannot fit at the minimum supported font size is
also surfaced as a warning instead of being silently clipped.

All image processing and ZIP creation happens locally in the browser. There is no backend,
authentication, database, or upload service.

## Local development

Requires Node.js 22 or later.

```bash
npm ci
npm run dev
```

Vite prints the local development URL. Other available commands:

```bash
npm test
npm run typecheck
npm run build
```

The production output is written to `dist/`.

## Architecture

- `src/sessionize.ts` validates public endpoint input and normalizes the Sessionize response.
- `src/bannerPlan.ts` creates deterministic combined and individual banner plans.
- `src/textFit.ts` wraps and shrinks text within fixed bounding boxes.
- `src/renderer.ts` loads bundled DM Sans fonts and renders exact 1024×1024 canvases.
- `src/downloads.ts` handles individual PNG and bulk ZIP downloads.

DM Sans Regular and Bold are bundled through `@fontsource/dm-sans`, so text measurement and
exports do not depend on a third-party font CDN.

## GitHub Pages

The Vite base path is configured as `/mcp-community-connect-speaker-banner/`. The
`.github/workflows/pages.yml` workflow runs tests and a production build for pull requests. A push
to `main` repeats validation and deploys `dist/` to GitHub Pages.

In the repository settings, set **Settings → Pages → Build and deployment → Source** to
**GitHub Actions**. The deployed site will be available at:

`https://codewithsimon.github.io/mcp-community-connect-speaker-banner/`
