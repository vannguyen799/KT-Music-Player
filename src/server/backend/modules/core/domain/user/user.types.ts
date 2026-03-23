export interface IPlaylist {
  name: string
  notes: string
  hidden: boolean
  songList: string[]
}

export interface IPlayerConfig {
  volume: number
  speed: number
  loopMode: 'none' | 'all' | 'one'
  isRandom: boolean
  playerPosition: 'bottom' | 'top'
  showLyrics: boolean
}

export interface IUser {
  id: string
  username: string
  password: string
  role: number
  favorite: string[]
  playlists: IPlaylist[]
  playerConfig?: IPlayerConfig
  lastAccess: string
  createdAt: string
}

export interface CreateUserInput {
  username: string
  password: string
  role?: number
}

export interface PublicUser {
  id: string
  username: string
  role: number
  favorite: string[]
  playerConfig?: IPlayerConfig
}

export const ROLE = {
  ADMIN: 0,
  USER: 1,
  STAFF: 2,
  GUEST: 3,
} as const
