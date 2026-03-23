import { parseBlob } from 'music-metadata-browser'
import { env } from '$env/dynamic/public'
import { api } from '$lib/services/api'

async function ensureBuffer() {
  if (typeof globalThis.Buffer === 'undefined') {
    const { Buffer } = await import('buffer')
    globalThis.Buffer = Buffer as unknown as typeof globalThis.Buffer
  }
}

export interface AudioMetadata {
  title?: string
  artist?: string
  album?: string
  duration?: number
  coverUrl?: string
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>()

async function getStreamToken(fileId: string): Promise<string> {
  const cached = tokenCache.get(fileId)
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token
  }

  const res = await api.get<{ token: string; expires_in: number }>(`/audio/stream-token/${fileId}`)
  tokenCache.set(fileId, {
    token: res.token,
    expiresAt: Date.now() + res.expires_in * 1000,
  })
  return res.token
}

const WORKER_URL = env.PUBLIC_STREAM_WORKER_URL

function useWorker(): boolean {
  return location.protocol === 'https:' && !!WORKER_URL
}

/**
 * Get a streaming URL for audio playback.
 * Uses Cloudflare Worker on HTTPS with env set, otherwise falls back to local proxy.
 */
export async function getStreamingUrl(fileId: string): Promise<string> {
  if (useWorker()) {
    const token = await getStreamToken(fileId)
    return `${WORKER_URL}/drive-stream?fileId=${encodeURIComponent(fileId)}&token=${encodeURIComponent(token)}`
  }
  return `/api/audio/stream/${fileId}`
}

/**
 * Read audio metadata (ID3/Vorbis/FLAC tags) by fetching only the header bytes.
 * Returns cover art as a blob URL, title, artist, album, duration.
 */
export async function getAudioMetadata(fileId: string): Promise<AudioMetadata> {
  const url = await getStreamingUrl(fileId)

  // Fetch only first 1MB — enough for metadata headers and embedded cover art
  const res = await fetch(url, {
    headers: {
      Range: 'bytes=0-1048575',
    },
  })

  if (!res.ok && res.status !== 206) {
    console.warn(`[audio-meta] fetch failed for ${fileId}: status=${res.status}`)
    return {}
  }

  try {
    const buf = await res.arrayBuffer()
    console.log(`[audio-meta] fetched ${buf.byteLength} bytes for ${fileId}`)
    await ensureBuffer()
    const metadata = await parseBlob(new Blob([buf]))
    const { common } = metadata
    console.log(`[audio-meta] parsed metadata:`, {
      title: common.title,
      artist: common.artist,
      album: common.album,
      hasPicture: !!(common.picture && common.picture.length > 0),
      pictureCount: common.picture?.length ?? 0,
      format: metadata.format.container,
      duration: metadata.format.duration,
    })

    let coverUrl: string | undefined
    if (common.picture && common.picture.length > 0) {
      const pic = common.picture[0]!
      console.log(`[audio-meta] cover art found: format=${pic.format}, size=${pic.data.length} bytes`)
      const blob = new Blob([new Uint8Array(pic.data)], { type: pic.format })
      coverUrl = URL.createObjectURL(blob)
    } else {
      console.log(`[audio-meta] no cover art embedded in file ${fileId}`)
    }

    return {
      title: common.title,
      artist: common.artist,
      album: common.album,
      duration: metadata.format.duration,
      coverUrl,
    }
  } catch (err) {
    console.error(`[audio-meta] parse error for ${fileId}:`, err)
    return {}
  }
}

/**
 * Revoke a previously created cover art object URL to free memory
 */
export function revokeCoverUrl(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}
