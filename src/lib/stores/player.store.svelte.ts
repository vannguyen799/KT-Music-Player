import { localize, type Song } from '$lib/types/song'
import { getStreamingUrl, getAudioMetadata, revokeCoverUrl, type AudioMetadata } from '$lib/services/audio.service'
import { trackListen } from '$lib/services/song.service'
import { api } from '$lib/services/api'
import type { PlayerConfig } from '$lib/types/user'

export type LoopMode = 'none' | 'all' | 'one'

const PRELOAD_THRESHOLD = 0.75
const STORAGE_KEY = 'kt_player_config'

let currentSong = $state<Song | null>(null)
let isPlaying = $state(false)
let isLoading = $state(false)
let volume = $state(0.7)
let loopMode = $state<LoopMode>('all')
let isRandom = $state(false)
let duration = $state(0)
let currentTime = $state(0)
let queue = $state<Song[]>([])
let currentIndex = $state(-1)
let coverUrl = $state<string | null>(null)
let speed = $state(1)
let playerPosition = $state<'bottom' | 'top'>('bottom')
let showLyrics = $state(false)

let audio: HTMLAudioElement | null = null
let preloadedNext: { song: Song; url: string; metadata: AudioMetadata } | null = null
let preloadTriggered = false
let saveTimeout: ReturnType<typeof setTimeout> | null = null
let isLoggedIn = false

function getConfig(): PlayerConfig {
  return { volume, speed, loopMode, isRandom, playerPosition, showLyrics }
}

function applyConfig(cfg: PlayerConfig) {
  volume = cfg.volume ?? 0.7
  speed = cfg.speed ?? 1
  loopMode = cfg.loopMode ?? 'all'
  isRandom = cfg.isRandom ?? false
  playerPosition = cfg.playerPosition ?? 'bottom'
  showLyrics = cfg.showLyrics ?? false
  if (audio) {
    audio.volume = volume
    audio.playbackRate = speed
  }
}

function saveToLocalStorage() {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getConfig()))
}

function loadFromLocalStorage(): PlayerConfig | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveToLocalStorage()
    if (isLoggedIn) {
      api.put('/api/user/player-config', { playerConfig: getConfig() }).catch(() => {})
    }
  }, 500)
}

// Load from localStorage on init
const stored = loadFromLocalStorage()
if (stored) applyConfig(stored)

// Late-bound reference so createAudio can call playNext defined inside getPlayerStore
let onSongEnded: () => void = () => {}

function createAudio(): HTMLAudioElement {
  if (audio) return audio
  audio = new Audio()
  audio.volume = volume

  audio.addEventListener('timeupdate', () => {
    currentTime = audio!.currentTime

    // Preload next song at 75% playback
    if (
      !preloadTriggered &&
      audio!.duration > 0 &&
      currentTime / audio!.duration > PRELOAD_THRESHOLD
    ) {
      preloadTriggered = true
      prepareNext()
    }
  })

  audio.addEventListener('loadedmetadata', () => {
    duration = audio!.duration
  })

  audio.addEventListener('ended', () => {
    isPlaying = false
    onSongEnded()
  })

  audio.addEventListener('error', () => {
    isLoading = false
    isPlaying = false
  })

  return audio
}

function getNextIndex(): number | null {
  if (queue.length === 0) return null

  if (loopMode === 'one') return currentIndex

  // When isRandom, queue is already shuffled by backend — just play sequentially
  const nextIdx = currentIndex + 1
  if (nextIdx >= queue.length) {
    return loopMode === 'all' ? 0 : null
  }
  return nextIdx
}

async function prepareNext() {
  const nextIdx = getNextIndex()
  if (nextIdx === null) return

  const nextSong = queue[nextIdx]
  if (!nextSong || preloadedNext?.song.fileId === nextSong.fileId) return

  try {
    const url = await getStreamingUrl(nextSong.fileId)
    const metadata = await getAudioMetadata(nextSong.fileId)
    preloadedNext = { song: nextSong, url, metadata }
  } catch {
    // Preload is best-effort
  }
}

export function getPlayerStore() {
  // Bind the ended handler so createAudio can call playNext
  onSongEnded = () => playNext()

  async function playSong(song: Song) {
    const el = createAudio()
    isLoading = true
    isPlaying = false
    currentSong = song
    preloadTriggered = false

    // Revoke previous cover
    if (coverUrl) {
      revokeCoverUrl(coverUrl)
      coverUrl = null
    }

    try {
      let url: string
      let metadata: AudioMetadata

      // Use preloaded data if available
      if (preloadedNext && preloadedNext.song.fileId === song.fileId) {
        url = preloadedNext.url
        metadata = preloadedNext.metadata
        preloadedNext = null
      } else {
        url = await getStreamingUrl(song.fileId)
        metadata = await getAudioMetadata(song.fileId)
      }

      // Set streaming URL directly — browser handles range requests
      el.src = url
      el.playbackRate = speed
      await el.play()
      isPlaying = true
      isLoading = false

      // Apply metadata
      coverUrl = metadata.coverUrl ?? null

      // Track listen
      trackListen(song.fileId).catch(() => {})

      // MediaSession
      if ('mediaSession' in navigator) {
        const artworks: MediaImage[] = []
        if (coverUrl) {
          artworks.push({ src: coverUrl })
        }
        navigator.mediaSession.metadata = new MediaMetadata({
          title: metadata.title || localize(song.title),
          artist: metadata.artist || localize(song.artist),
          album: metadata.album || '',
          artwork: artworks,
        })
        navigator.mediaSession.setActionHandler('play', () => resume())
        navigator.mediaSession.setActionHandler('pause', () => pause())
        navigator.mediaSession.setActionHandler('previoustrack', () => playPrev())
        navigator.mediaSession.setActionHandler('nexttrack', () => playNext())
      }
    } catch (err) {
      console.error('Failed to play song:', err)
      isLoading = false
    }
  }

  function pause() {
    audio?.pause()
    isPlaying = false
  }

  function resume() {
    audio?.play()
    isPlaying = true
  }

  function togglePlay() {
    if (isPlaying) pause()
    else resume()
  }

  function seek(time: number) {
    if (audio) {
      audio.currentTime = time
      currentTime = time
    }
  }

  function setVolume(v: number) {
    volume = v
    if (audio) audio.volume = v
    scheduleSave()
  }

  function setSpeed(s: number) {
    speed = s
    if (audio) audio.playbackRate = s
    scheduleSave()
  }

  function shuffleRemaining() {
    if (queue.length <= 1) return
    const before = queue.slice(0, currentIndex + 1)
    const after = queue.slice(currentIndex + 1)
    for (let i = after.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [after[i], after[j]] = [after[j]!, after[i]!]
    }
    queue = [...before, ...after]
  }

  function setQueue(songs: Song[], startIndex = 0) {
    queue = songs
    currentIndex = startIndex
    const song = songs[startIndex]
    if (song) playSong(song)
  }

  function replaceQueue(songs: Song[], currentIdx = 0) {
    queue = songs
    currentIndex = currentIdx
  }

  function playNext() {
    if (queue.length === 0) return

    if (loopMode === 'one') {
      if (currentSong) playSong(currentSong)
      return
    }

    // When isRandom, queue is already shuffled by backend — play sequentially
    let nextIdx = currentIndex + 1
    if (nextIdx >= queue.length) {
      if (loopMode === 'all') nextIdx = 0
      else return
    }

    currentIndex = nextIdx
    const next = queue[nextIdx]
    if (next) playSong(next)
  }

  function playPrev() {
    if (queue.length === 0) return

    // If more than 3 seconds in, restart current song
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }

    let prevIdx = currentIndex - 1
    if (prevIdx < 0) prevIdx = queue.length - 1
    currentIndex = prevIdx
    const prev = queue[prevIdx]
    if (prev) playSong(prev)
  }

  function toggleLoop() {
    const modes: LoopMode[] = ['none', 'all', 'one']
    const i = modes.indexOf(loopMode)
    loopMode = modes[(i + 1) % modes.length]!
    scheduleSave()
  }

  function toggleRandom() {
    isRandom = !isRandom
    if (isRandom && queue.length > 0) {
      shuffleRemaining()
    }
    scheduleSave()
  }

  return {
    get currentSong() { return currentSong },
    get isPlaying() { return isPlaying },
    get isLoading() { return isLoading },
    get volume() { return volume },
    get loopMode() { return loopMode },
    get isRandom() { return isRandom },
    get duration() { return duration },
    get currentTime() { return currentTime },
    get queue() { return queue },
    get coverUrl() { return coverUrl },
    get speed() { return speed },
    get playerPosition() { return playerPosition },
    get showLyrics() { return showLyrics },
    togglePlayerPosition() {
      playerPosition = playerPosition === 'bottom' ? 'top' : 'bottom'
      scheduleSave()
    },
    setShowLyrics(v: boolean) {
      showLyrics = v
      scheduleSave()
    },
    restoreFromLocalStorage() {
      const cfg = loadFromLocalStorage()
      if (cfg) applyConfig(cfg)
    },
    loadConfig(cfg: PlayerConfig) {
      applyConfig(cfg)
      saveToLocalStorage()
    },
    setLoggedIn(v: boolean) { isLoggedIn = v },
    saveCurrentToServer() {
      api.put('/api/user/player-config', { playerConfig: getConfig() }).catch(() => {})
    },
    playSong,
    pause,
    resume,
    togglePlay,
    seek,
    setVolume,
    setSpeed,
    setQueue,
    replaceQueue,
    shuffleRemaining,
    playNext,
    playPrev,
    toggleLoop,
    toggleRandom,
    resetConfig() {
      applyConfig({ volume: 0.7, speed: 1, loopMode: 'all', isRandom: false, playerPosition: 'bottom', showLyrics: false })
      if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY)
    },
  }
}
