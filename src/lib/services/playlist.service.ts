import { api } from './api'
import type { Playlist } from '$lib/types/user'

export async function getPlaylists(): Promise<Playlist[]> {
  return api.get<Playlist[]>('/api/playlists')
}

export async function addPlaylist(playlist: Playlist): Promise<Playlist[]> {
  return api.post<Playlist[]>('/api/playlists', playlist)
}

export async function updatePlaylist(name: string, updates: Partial<Playlist>): Promise<Playlist[]> {
  return api.put<Playlist[]>(`/api/playlists/${encodeURIComponent(name)}`, updates)
}

export async function removePlaylist(name: string): Promise<Playlist[]> {
  return api.del<Playlist[]>(`/api/playlists/${encodeURIComponent(name)}`)
}
