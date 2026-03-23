/**
 * Language-keyed map for multi-language text.
 * 'origin' = original language, then ISO 639-1 codes: 'vi', 'en', 'zh', 'ja', 'ko', etc.
 */
export type LangCode = 'origin' | 'vi' | 'en' | 'zh' | 'ja' | 'ko' | (string & {})

export type LocalizedText = Partial<Record<LangCode, string>>

export interface Song {
  id: string
  fileId: string
  title: LocalizedText
  artist: LocalizedText
  lyrics: LocalizedText
  sheet: string
  categories: string[]
  status: string
  disabled?: boolean
  note?: string
  listens: number
  thumbnailLink?: string
  ext: string
  filename: string
  sampleRate?: number
  bitDepth?: number
  channels?: number
  bitRate?: number
  duration?: number
  codec?: string
}

/** User's preferred display language order (first match wins) */
let displayLangs: LangCode[] = ['vi', 'origin']

export function setDisplayLangs(langs: LangCode[]) {
  displayLangs = langs
}

/** Resolve a LocalizedText to a display string using the preferred language order */
export function localize(text: LocalizedText | undefined, langs = displayLangs): string {
  if (!text) return ''
  for (const lang of langs) {
    const val = text[lang]
    if (val && val.trim()) return val
  }
  // Fallback: return first available value
  const values = Object.values(text).filter(Boolean)
  return values[0] ?? ''
}

/** Get display title — shows preferred lang, with origin in parentheses if different */
export function getDisplayTitle(song: Song): string {
  const preferred = localize(song.title)
  const origin = song.title.origin ?? ''
  if (origin && preferred !== origin) {
    return `${preferred} (${origin})`
  }
  return preferred
}

/** Get display artist — shows preferred lang, with origin in parentheses if different */
export function getDisplayArtist(song: Song): string {
  const preferred = localize(song.artist)
  const origin = song.artist.origin ?? ''
  if (origin && preferred !== origin) {
    return `${preferred} (${origin})`
  }
  return preferred
}

/** Get the best available lyrics text in preferred language order */
export function getDisplayLyrics(song: Song, langs = displayLangs): string {
  return localize(song.lyrics, langs)
}

/** Check if a song has synced LRC lyrics in any language */
export function hasLyricsForLang(song: Song, lang: LangCode): boolean {
  const lrc = song.lyrics[lang]
  return !!lrc && lrc.includes('[') && lrc.includes(']')
}

/** Get all language codes that have lyrics */
export function getAvailableLyricLangs(song: Song): LangCode[] {
  return Object.entries(song.lyrics || {})
    .filter(([, val]) => val && val.includes('['))
    .map(([key]) => key as LangCode)
}
