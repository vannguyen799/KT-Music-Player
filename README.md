# KT Player

A personal music streaming app built with SvelteKit 5 and a Cloudflare Worker for audio delivery.

## Tech Stack

- **Frontend** — Svelte 5 with SvelteKit, TypeScript
- **Backend** — SvelteKit server routes + [Truxie](https://github.com/vannguyen799/truxie) modular backend (controllers, services, use-cases)
- **Database** — MongoDB (via Mongoose)
- **Storage** — Google Drive (audio files)
- **Streaming** — Cloudflare Worker (`worker/`) proxies audio with signed tokens
- **Auth** — JWT + bcrypt

## Features

- Browse and play songs organized by categories
- Audio streaming via Cloudflare Worker with token-signed URLs
- Lyrics display (LRC format)
- Playlist management
- Song metadata editing with pinyin support
- Admin panel for scanning Google Drive and managing categories
- Fullscreen player view
- Upload songs to Google Drive

## Project Structure

```
src/
  routes/              # SvelteKit pages & API routes
  lib/
    components/        # Svelte UI components
    services/          # Client-side API services
    stores/            # Svelte 5 runes stores (auth, player, music)
    player/            # LRC lyrics parser
    types/             # Shared TypeScript types
  server/backend/      # Server-side modular backend
    modules/
      core/            # Auth, users
      music/           # Songs, categories, scanning, audio
      playlist/        # Playlist management
    shared/            # DB, Google Drive client, error handling
worker/                # Cloudflare Worker for audio streaming
```

## Setup

### Prerequisites

- Node.js 18+
- pnpm
- MongoDB instance
- Google Cloud service account with Drive API enabled

### Installation

```bash
pnpm install
cd worker && pnpm install
```

### Configuration

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Path to Google service account JSON file |
| `DRIVE_AUDIO_FOLDER_ID` | Google Drive folder ID containing audio files |
| `PUBLIC_STREAM_WORKER_URL` | URL of the deployed Cloudflare Worker |
| `STREAM_SIGNING_SECRET` | Shared secret between backend and worker for token signing |

### Development

```bash
pnpm dev          # Start SvelteKit dev server on port 5200
cd worker && pnpm dev  # Start Cloudflare Worker locally
```

### Build & Deploy

```bash
pnpm build                   # Build SvelteKit app
cd worker && pnpm deploy     # Deploy Cloudflare Worker
```
