export interface LyricLine {
  time: number // seconds
  text: string
}

/**
 * Parse LRC format lyrics into timed lines.
 * Format: [mm:ss.xx] text
 */
export function parseLRC(lrc: string): LyricLine[] {
  if (!lrc) return []

  const lines: LyricLine[] = []
  // Support common LRC variations:
  // [mm:ss.xx], [m:ss.xx], [mm:ss], [m:ss], [mm:ss:xx], [mm:ss.x], [mm:ss.xxx]
  const regex = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\](.*)/

  for (const rawLine of lrc.split('\n')) {
    const match = rawLine.match(regex)
    if (match) {
      const minutes = parseInt(match[1]!, 10)
      const seconds = parseInt(match[2]!, 10)
      const msStr = match[3] || '0'
      const ms = parseInt(msStr.padEnd(3, '0'), 10)
      const time = minutes * 60 + seconds + ms / 1000
      const text = match[4]?.trim() || ''
      lines.push({ time, text })
    }
  }

  return lines.sort((a, b) => a.time - b.time)
}

/**
 * Get the current lyric line index for a given time.
 */
export function getCurrentLineIndex(lines: LyricLine[], time: number): number {
  if (lines.length === 0) return -1

  for (let i = lines.length - 1; i >= 0; i--) {
    if (time >= lines[i]!.time) return i
  }

  return -1
}
