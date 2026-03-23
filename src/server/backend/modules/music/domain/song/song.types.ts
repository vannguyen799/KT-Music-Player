/**
 * Language-keyed map for multi-language text.
 * Keys are ISO 639-1 codes: 'origin' for the original language,
 * 'vi' for Vietnamese, 'en' for English, 'zh' for Chinese, 'ja' for Japanese, etc.
 */
export type LangCode = 'origin' | 'vi' | 'en' | 'zh' | 'ja' | 'ko' | (string & {})

export type LocalizedText = Partial<Record<LangCode, string>>

export interface ISong {
  id: string
  fileId: string

  /** Multi-language song title — { origin: "原曲名", vi: "Tên tiếng Việt", en: "English Title" } */
  title: LocalizedText

  /** Multi-language artist name — { origin: "歌手", vi: "Ca sĩ", en: "Artist" } */
  artist: LocalizedText

  /** Multi-language synced lyrics (LRC format) — { origin: "[00:01.00]...", vi: "[00:01.00]..." } */
  lyrics: LocalizedText

  sheet: string
  categories: string[]
  status: string
  disabled?: boolean
  note?: string
  listens: number
  ext: string
  filename: string

  /** Google Drive thumbnail URL */
  thumbnailLink?: string

  /** Audio metadata — populated by analysis tool */
  sampleRate?: number    // Hz, e.g. 44100, 48000, 96000
  bitDepth?: number      // bits per sample, e.g. 16, 24, 32
  channels?: number      // e.g. 1 (mono), 2 (stereo)
  bitRate?: number       // kbps, e.g. 320, 1411
  duration?: number      // seconds
  codec?: string         // e.g. 'flac', 'aac', 'mp3', 'opus'
}

export const CHINESE_SHEETS = ['Chinese', 'LanXinyu', 'XuLanxin', 'Dengshenmejun', 'AYueYue', 'RenRan']
