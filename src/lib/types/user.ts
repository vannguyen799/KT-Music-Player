export interface PlayerConfig {
  volume: number
  speed: number
  loopMode: 'none' | 'all' | 'one'
  isRandom: boolean
  playerPosition: 'bottom' | 'top'
  showLyrics: boolean
}

export interface User {
  id: string
  username: string
  role: number
  favorite: string[]
  playerConfig?: PlayerConfig
}

export interface Playlist {
  name: string
  notes: string
  hidden: boolean
  songList: string[]
}

export interface LoginResponse {
  token: string
  user: User
}
