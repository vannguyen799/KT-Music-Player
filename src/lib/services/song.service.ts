import { api, getAuthToken } from './api'
import type { Song } from '$lib/types/song'
import type { Category } from './admin.service'

export async function getCategories(): Promise<Category[]> {
  // Admin users get all categories (including disabled) via admin endpoint
  if (getAuthToken()) {
    try {
      return await api.get<Category[]>('/api/admin/music/categories')
    } catch {
      // Fallback to public endpoint if not admin
    }
  }
  return api.get<Category[]>('/api/categories')
}

export interface PaginatedSongs {
  songs: Song[]
  total: number
}

export async function getSongsByCategory(categoryId: string, page = 1, limit = 50, search = ''): Promise<PaginatedSongs> {
  let url = `/api/songs?category=${encodeURIComponent(categoryId)}&page=${page}&limit=${limit}`
  if (search) url += `&search=${encodeURIComponent(search)}`
  return api.get<PaginatedSongs>(url)
}

export async function getAllSongs(page = 1, limit = 50): Promise<PaginatedSongs> {
  return api.get<PaginatedSongs>(`/api/songs?page=${page}&limit=${limit}`)
}

export async function searchSongs(query: string, page = 1, limit = 50): Promise<PaginatedSongs> {
  return api.get<PaginatedSongs>(`/api/songs?search=${encodeURIComponent(query)}&page=${page}&limit=${limit}`)
}

export async function getShuffledSongsByCategory(categoryId: string): Promise<Song[]> {
  const result = await api.get<PaginatedSongs>(`/api/songs?category=${encodeURIComponent(categoryId)}&shuffle=true`)
  return result.songs
}

/** Fetch all songs for a category (all pages) */
export async function getAllSongsByCategory(categoryId: string): Promise<Song[]> {
  const limit = 100
  const first = await getSongsByCategory(categoryId, 1, limit)
  const all = [...first.songs]
  const totalPages = Math.ceil(first.total / limit)
  const promises: Promise<PaginatedSongs>[] = []
  for (let p = 2; p <= totalPages; p++) {
    promises.push(getSongsByCategory(categoryId, p, limit))
  }
  const results = await Promise.all(promises)
  for (const r of results) all.push(...r.songs)
  return all
}

/** Fetch all songs across all categories (all pages) */
export async function fetchAllSongs(): Promise<Song[]> {
  const limit = 100
  const first = await getAllSongs(1, limit)
  const all = [...first.songs]
  const totalPages = Math.ceil(first.total / limit)
  const promises: Promise<PaginatedSongs>[] = []
  for (let p = 2; p <= totalPages; p++) {
    promises.push(getAllSongs(p, limit))
  }
  const results = await Promise.all(promises)
  for (const r of results) all.push(...r.songs)
  return all
}

/** Fetch all file IDs for a category/search context (lightweight) */
export async function getSongFileIds(categoryId?: string, search?: string): Promise<string[]> {
  let url = '/api/songs/ids'
  const params: string[] = []
  if (categoryId) params.push(`category=${encodeURIComponent(categoryId)}`)
  if (search) params.push(`search=${encodeURIComponent(search)}`)
  if (params.length) url += '?' + params.join('&')
  return api.get<string[]>(url)
}

export async function getSongByFileId(fileId: string): Promise<Song | null> {
  return api.get<Song | null>(`/api/songs/file/${fileId}`)
}

export async function trackListen(fileId: string): Promise<void> {
  await api.post(`/api/songs/${fileId}/listen`)
}

export async function updateSong(fileId: string, updates: Partial<Song>): Promise<Song> {
  return api.put<Song>(`/api/songs/${fileId}`, updates)
}
