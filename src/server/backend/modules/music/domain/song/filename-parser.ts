import type { LocalizedText } from './song.types'

const SPLITTER = 'ǁ'
const AUDIO_EXTS = ['flac', 'wav', 'mp3', 'ape', 'm4a', 'mp4', 'ogg']

const MIME_TO_EXT: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
  'audio/ogg': 'ogg',
  'audio/ape': 'ape',
  'audio/x-ape': 'ape',
}

export function mimeToExt(mime: string): string {
  if (!mime) return ''
  return MIME_TO_EXT[mime.toLowerCase()] ?? ''
}

export function isAudioMimeType(mime: string): boolean {
  if (!mime) return false
  const lower = mime.toLowerCase()
  return lower.startsWith('audio/') || lower.includes('flac')
}

interface ParsedFilename {
  title: LocalizedText
  artist: LocalizedText
  ext: string
}

/**
 * Remove file extension and return [nameWithoutExt, ext].
 */
function removeExt(filename: string): [string, string] {
  let ext = ''
  for (const e of AUDIO_EXTS) {
    if (filename.toLowerCase().endsWith(`.${e}`)) {
      ext = e
      filename = filename.slice(0, -(e.length + 1))
      break
    }
  }
  filename = filename.replace(/\+/g, ' ')
  return [filename.trim(), ext]
}

function containsOnce(str: string, sub: string): boolean {
  const i = str.indexOf(sub)
  return i !== -1 && str.indexOf(sub, i + 1) === -1
}

/**
 * Parse a Drive audio filename into multi-language title/artist.
 *
 * Supported formats:
 * 1. "ViArtist - ViTitle ǁ OriginArtist - OriginTitle.ext"  (or | or triple-space)
 * 2. "Artist - Title.ext"
 * 3. "Title.ext"  (no separator)
 *
 * Migrated from MusicApp-AngularJS SongInfo.try / fromFileName / fromUploadFilename
 */
export function parseFilename(rawFilename: string): ParsedFilename {
  const [filename, ext] = removeExt(rawFilename)

  // Try multi-lang format: "viArtist - viTitle SEPARATOR originArtist - originTitle"
  for (const sep of [SPLITTER, '|', '   ']) {
    if (filename.includes(sep)) {
      const result = tryMultiLang(filename, sep, ext)
      if (result) return result
    }
  }

  // Simple format: "Artist - Title" or "Artist-Title"
  return parseSimple(filename, ext)
}

function tryMultiLang(filename: string, separator: string, ext: string): ParsedFilename | null {
  if (!containsOnce(filename, separator)) return null

  const parts = filename.split(separator)
  if (parts.length !== 2) return null

  const viParts = parts[0]!.split(' - ')
  const originParts = parts[1]!.split(' - ')

  const viArtist = (viParts[0] ?? '').trim()
  const viTitle = (viParts[1] ?? '').trim()
  const originArtist = (originParts[0] ?? '').trim()
  const originTitle = (originParts[1] ?? '').trim()

  return {
    title: buildLocalized(originTitle, viTitle),
    artist: buildLocalized(originArtist, viArtist),
    ext,
  }
}

function parseSimple(filename: string, ext: string): ParsedFilename {
  // Try "Artist - Title"
  if (filename.includes(' - ')) {
    const parts = filename.split(' - ')
    return {
      title: { origin: (parts[1] ?? '').trim() },
      artist: { origin: (parts[0] ?? '').trim() },
      ext,
    }
  }

  // Try "Artist-Title" (single dash, only if exactly one)
  if (containsOnce(filename, '-')) {
    const parts = filename.split('-')
    return {
      title: { origin: (parts[1] ?? '').trim() },
      artist: { origin: (parts[0] ?? '').trim() },
      ext,
    }
  }

  // No separator — treat whole name as title
  return {
    title: { origin: filename.trim() },
    artist: {},
    ext,
  }
}

function buildLocalized(origin: string, vi: string): LocalizedText {
  const result: LocalizedText = {}
  if (origin) result.origin = origin
  if (vi && vi !== origin) result.vi = vi
  return result
}

/**
 * Generate a standardized filename from song data.
 */
export function buildFilename(
  title: LocalizedText,
  artist: LocalizedText,
  ext: string,
): string {
  const originTitle = title.origin ?? Object.values(title).find(Boolean) ?? ''
  const originArtist = artist.origin ?? Object.values(artist).find(Boolean) ?? ''
  const viTitle = title.vi ?? ''
  const viArtist = artist.vi ?? ''

  let name: string
  if (viTitle && viTitle !== originTitle) {
    name = `${viArtist} - ${viTitle} ${SPLITTER} ${originArtist} - ${originTitle}`
  } else {
    name = originArtist ? `${originArtist} - ${originTitle}` : originTitle
  }

  // Clean up leading separators
  if (name.startsWith(' - ')) name = name.slice(3)
  if (name.startsWith('- ')) name = name.slice(2)

  return ext ? `${name.trim()}.${ext}` : name.trim()
}
