import { api } from './api'

export interface DriveFolder {
  id: string
  name: string
}

export interface Category {
  id: string
  name: string
  folderId: string
  parentId: string | null
  disabled: boolean
}

export interface ScannedSong {
  id: string
  fileId: string
  title: Record<string, string>
  artist: Record<string, string>
  lyrics: Record<string, string>
  sheet: string
  categories: string[]
  status: string
  listens: number
  ext: string
  filename: string
  _scanStatus: 'new' | 'existing' | 'danger'
  _driveFilename: string
}

export interface ScanPreview {
  category: Category
  songs: ScannedSong[]
  summary: { total: number; new: number; existing: number; danger: number }
}

export async function listFolders(parentId?: string): Promise<DriveFolder[]> {
  const q = parentId ? `?parentId=${encodeURIComponent(parentId)}` : ''
  return api.get<DriveFolder[]>(`/api/admin/music/folders${q}`)
}

export type ScanMode = 'full' | 'new'

export async function previewScan(folderId: string, category: string, mode: ScanMode = 'new'): Promise<ScanPreview> {
  return api.post<ScanPreview>('/api/admin/music/preview', { folderId, category, mode })
}

export async function previewAllScan(rootFolderId?: string, skipUnderscored = true, mode: ScanMode = 'new'): Promise<ScanPreview[]> {
  return api.post<ScanPreview[]>('/api/admin/music/preview-all', { rootFolderId, skipUnderscored, mode })
}

export async function saveScan(categoryId: string, songs: ScannedSong[]): Promise<{ category: string; saved: number }> {
  return api.post('/api/admin/music/save', { categoryId, songs })
}

export async function getCategories(): Promise<Category[]> {
  return api.get<Category[]>('/api/admin/music/categories')
}

export async function updateCategory(id: string, data: { name?: string; parentId?: string | null }): Promise<Category> {
  return api.post<Category>('/api/admin/music/categories/update', { id, ...data })
}

export async function deleteCategory(id: string): Promise<void> {
  await api.post('/api/admin/music/categories/delete', { id })
}

export async function toggleCategory(id: string, disabled: boolean): Promise<Category> {
  return api.post<Category>('/api/admin/music/categories/toggle', { id, disabled })
}

export async function toggleSong(fileId: string, disabled: boolean): Promise<any> {
  return api.post('/api/admin/music/songs/toggle', { fileId, disabled })
}

export async function deleteSong(fileId: string, deleteFromDrive = true): Promise<void> {
  await api.post('/api/admin/music/songs/delete', { fileId, deleteFromDrive })
}

export interface DuplicateMatch {
  index: number
  matches: Array<{
    id: string
    fileId: string
    title: Record<string, string>
    artist: Record<string, string>
    categories: string[]
    filename: string
  }>
}

export async function checkDuplicates(
  songs: Array<{ title: Record<string, string>; artist: Record<string, string> }>,
): Promise<DuplicateMatch[]> {
  return api.post<DuplicateMatch[]>('/api/admin/music/check-duplicates', { songs })
}

export interface UploadSongMeta {
  filename: string
  title: Record<string, string>
  artist: Record<string, string>
  lyrics: Record<string, string>
}

export async function uploadSongs(
  categoryId: string,
  files: File[],
  songsMeta: UploadSongMeta[],
): Promise<{ uploaded: number; files: Array<{ filename: string; fileId: string }> }> {
  const formData = new FormData()
  formData.append('meta', JSON.stringify({ categoryId, songs: songsMeta }))
  for (const file of files) {
    formData.append('files', file, file.name)
  }

  const token = (await import('./api')).getAuthToken()
  const res = await fetch('/api/admin/music/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  const json = await res.json()
  if (!res.ok || json.success === false) {
    throw new Error(json.message || 'Upload failed')
  }
  return json.data
}
