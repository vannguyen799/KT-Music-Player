import { Injectable, Inject } from 'truxie'
import { GoogleDriveClient } from '$backend/shared/google-drive.client'
import { SongRepository } from '../domain/song/song.repository'
import { CategoryRepository } from '../domain/category/category.repository'
import { parseFilename, mimeToExt, isAudioMimeType, buildFilename } from '../domain/song/filename-parser'
import type { ISong } from '../domain/song/song.types'
import type { ICategory } from '../domain/category/category.types'
import crypto from 'node:crypto'

export type SongScanStatus = 'new' | 'existing' | 'danger'
export type ScanMode = 'full' | 'new'

export interface ScannedSong extends ISong {
  _scanStatus: SongScanStatus
  _driveFilename: string
}

export interface ScanPreview {
  category: ICategory
  songs: ScannedSong[]
  summary: { total: number; new: number; existing: number; danger: number }
}

export interface SaveResult {
  category: string
  saved: number
  removed: number
}

@Injectable()
@Inject(GoogleDriveClient, SongRepository, CategoryRepository)
export class ScanService {
  constructor(
    private readonly driveClient: GoogleDriveClient,
    private readonly songRepo: SongRepository,
    private readonly categoryRepo: CategoryRepository,
  ) {}

  /**
   * Preview: scan Drive folder, diff against MongoDB, return annotated list.
   * Auto-creates or finds the category by folderId.
   * Does NOT write songs to DB.
   */
  async preview(folderId: string, defaultName: string, parentCategoryId: string | null = null, mode: ScanMode = 'new'): Promise<ScanPreview> {
    // Upsert category by folderId
    const category = await this.categoryRepo.upsertByFolderId(folderId, {
      name: defaultName,
      folderId,
      parentId: parentCategoryId,
    })

    const driveFiles = await this.driveClient.listAudioFiles(folderId)
    const existingSongs = await this.songRepo.findByCategoryId(category.id)
    const existingByFileId = new Map(existingSongs.map((s) => [s.fileId, s]))
    const matchedFileIds = new Set<string>()

    const songs: ScannedSong[] = []

    for (const file of driveFiles) {
      if (!file.id || !file.name) continue
      if (!isAudioMimeType(file.mimeType ?? '')) continue

      const existing = existingByFileId.get(file.id)

      if (existing) {
        matchedFileIds.add(file.id)
        songs.push({ ...existing, _scanStatus: 'existing', _driveFilename: file.name })
      } else {
        const parsed = parseFilename(file.name)
        const ext = parsed.ext || mimeToExt(file.mimeType ?? '')

        songs.push({
          id: crypto.randomUUID(),
          fileId: file.id,
          title: parsed.title,
          artist: parsed.artist,
          lyrics: {},
          sheet: category.name,
          categories: [category.id],
          status: '',
          listens: 0,
          ext,
          filename: buildFilename(parsed.title, parsed.artist, ext),
          _scanStatus: 'new',
          _driveFilename: file.name,
        })
      }
    }

    // Songs in DB under this category but missing from Drive
    for (const existing of existingSongs) {
      if (!matchedFileIds.has(existing.fileId)) {
        songs.push({ ...existing, status: 'danger', _scanStatus: 'danger', _driveFilename: '' })
      }
    }

    const filtered = mode === 'new' ? songs.filter((s) => s._scanStatus === 'new') : songs

    const summary = {
      total: filtered.length,
      new: filtered.filter((s) => s._scanStatus === 'new').length,
      existing: filtered.filter((s) => s._scanStatus === 'existing').length,
      danger: filtered.filter((s) => s._scanStatus === 'danger').length,
    }

    return { category, songs: filtered, summary }
  }

  /**
   * Save user-edited songs to MongoDB.
   * Songs get the category ID added to their categories array.
   */
  async save(categoryId: string, songs: ScannedSong[]): Promise<SaveResult> {
    const category = await this.categoryRepo.findById(categoryId)
    const categoryName = category?.name ?? ''

    const toSave = songs
      .filter((s) => s._scanStatus !== 'danger')
      .map(({ _scanStatus, _driveFilename, ...song }) => ({
        ...song,
        sheet: categoryName,
        categories: [...new Set([...(song.categories || []), categoryId])],
        filename: buildFilename(song.title, song.artist, song.ext),
      }))

    const dangerFileIds = songs
      .filter((s) => s._scanStatus === 'danger')
      .map((s) => s.fileId)

    // Upsert valid songs
    await this.songRepo.upsertMany(toSave)

    // Mark danger songs (missing from Drive)
    await this.songRepo.markDanger(dangerFileIds)

    return { category: categoryName, saved: toSave.length, removed: dangerFileIds.length }
  }

  /**
   * Recursively scan all folders under root.
   * Each folder containing audio files becomes a category.
   * Subfolder categories are linked via parentId.
   */
  async previewAll(rootFolderId: string, skipUnderscored = true, mode: ScanMode = 'new'): Promise<ScanPreview[]> {
    const results: ScanPreview[] = []
    await this.scanFolderRecursive(rootFolderId, '', null, results, skipUnderscored, mode)
    return results
  }

  private async scanFolderRecursive(
    folderId: string,
    parentPath: string,
    parentCategoryId: string | null,
    results: ScanPreview[],
    skipUnderscored: boolean,
    mode: ScanMode = 'new',
  ): Promise<void> {
    const [audioFiles, subfolders] = await Promise.all([
      this.driveClient.listAudioFiles(folderId),
      this.driveClient.listFilesInFolder(folderId, 'application/vnd.google-apps.folder'),
    ])

    let currentCategoryId = parentCategoryId

    // If this folder has audio files, treat it as a category
    if (audioFiles.length > 0 && parentPath) {
      const preview = await this.preview(folderId, parentPath, parentCategoryId, mode)
      if (preview.songs.length > 0) results.push(preview)
      currentCategoryId = preview.category.id
    }

    // Recurse into subfolders
    for (const folder of subfolders) {
      if (!folder.id || !folder.name) continue
      if (skipUnderscored && folder.name.startsWith('_')) continue
      const path = parentPath ? `${parentPath}/${folder.name}` : folder.name
      await this.scanFolderRecursive(folder.id, path, currentCategoryId, results, skipUnderscored, mode)
    }
  }
}
