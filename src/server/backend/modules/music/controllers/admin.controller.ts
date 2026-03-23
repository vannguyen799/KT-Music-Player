import { Inject, Controller, Post, Get, RouteGuards, Body, Query, FormData, type FormDataPart } from 'truxie'
import { env } from '$env/dynamic/private'
import { AdminGuard } from '$backend/guards/auth.guard'
import { ScanService, type ScanMode } from '../services/scan.service'
import { SongService } from '../domain/song/song.service'
import { SongRepository } from '../domain/song/song.repository'
import { CategoryRepository } from '../domain/category/category.repository'
import { GoogleDriveClient } from '$backend/shared/google-drive.client'
import { sendSuccess } from '$backend/shared/response'
import { parseFilename, mimeToExt, isAudioMimeType, buildFilename } from '../domain/song/filename-parser'

@Inject(ScanService, SongService, SongRepository, GoogleDriveClient, CategoryRepository)
@Controller('admin/music')
@RouteGuards(AdminGuard)
export class AdminMusicController {
  constructor(
    private readonly scanService: ScanService,
    private readonly songService: SongService,
    private readonly songRepo: SongRepository,
    private readonly driveClient: GoogleDriveClient,
    private readonly categoryRepo: CategoryRepository,
  ) {}

  @Get('/folders')
  async listFolders(@Query('parentId') parentId: string) {
    const id = parentId || env.DRIVE_AUDIO_FOLDER_ID || ''
    const folders = await this.driveClient.listFilesInFolder(
      id,
      'application/vnd.google-apps.folder',
    )
    return sendSuccess(folders.map((f) => ({ id: f.id, name: f.name })))
  }

  @Post('/preview')
  async preview(@Body() body: { folderId: string; category: string; mode?: ScanMode }) {
    const mode = body.mode ?? 'new'
    const result = await this.scanService.preview(body.folderId, body.category, null, mode)
    return sendSuccess(result)
  }

  @Post('/save')
  async save(@Body() body: { categoryId: string; songs: any[] }) {
    const result = await this.scanService.save(body.categoryId, body.songs)
    return sendSuccess(result, `Saved ${result.saved} songs to ${result.category}`)
  }

  @Post('/preview-all')
  async previewAll(@Body() body: { rootFolderId?: string; skipUnderscored?: boolean; mode?: ScanMode }) {
    const rootId = body.rootFolderId || env.DRIVE_AUDIO_FOLDER_ID || ''
    const skipUnderscored = body.skipUnderscored ?? true
    const mode = body.mode ?? 'new'
    const results = await this.scanService.previewAll(rootId, skipUnderscored, mode)
    return sendSuccess(results)
  }

  @Get('/categories')
  async listCategories() {
    const categories = await this.categoryRepo.findAll()
    return sendSuccess(categories)
  }

  @Post('/categories/update')
  async updateCategory(@Body() body: { id: string; name: string; parentId?: string | null }) {
    const { id, ...data } = body
    const updated = await this.categoryRepo.update(id, data)
    return sendSuccess(updated)
  }

  @Post('/categories/delete')
  async deleteCategory(@Body() body: { id: string }) {
    const deleted = await this.categoryRepo.delete(body.id)
    return sendSuccess(deleted)
  }

  @Post('/categories/toggle')
  async toggleCategory(@Body() body: { id: string; disabled: boolean }) {
    const updated = await this.categoryRepo.update(body.id, { disabled: body.disabled })
    return sendSuccess(updated)
  }

  @Post('/songs/toggle')
  async toggleSong(@Body() body: { fileId: string; disabled: boolean }) {
    const song = await this.songRepo.updateByFileId(body.fileId, { disabled: body.disabled })
    if (!song) throw new Error('Song not found')
    return sendSuccess(song, song.disabled ? 'Song disabled' : 'Song enabled')
  }

  @Post('/songs/delete')
  async deleteSong(@Body() body: { fileId: string; deleteFromDrive?: boolean }) {
    const song = await this.songRepo.findByFileId(body.fileId)
    if (!song) throw new Error('Song not found')

    if (body.deleteFromDrive !== false) {
      try {
        await this.driveClient.deleteFile(body.fileId)
      } catch (err: any) {
        if (err?.code !== 404) throw err
      }
    }

    await this.songRepo.deleteByFileId(body.fileId)
    return sendSuccess(null, 'Song deleted')
  }

  /**
   * POST /api/admin/music/check-duplicates
   * Check if songs with matching title/artist already exist in DB.
   */
  @Post('/check-duplicates')
  async checkDuplicates(@Body() body: { songs: Array<{ title: Record<string, string>; artist: Record<string, string> }> }) {
    const results = await this.songRepo.findDuplicates(body.songs)
    return sendSuccess(results)
  }

  /**
   * POST /api/admin/music/upload
   * Upload audio files to a category's Drive folder + upsert in DB.
   * Accepts multipart/form-data with:
   *   - files: audio files
   *   - meta: JSON string with { categoryId, songs: [{ filename, title, artist, lyrics }] }
   */
  @Post('/upload')
  async upload(@FormData() parts: FormDataPart[]) {
    const metaPart = parts.find((p) => p.name === 'meta')
    if (!metaPart) throw new Error('Missing meta field')

    const meta = JSON.parse(metaPart.data.toString('utf-8')) as {
      categoryId: string
      songs: Array<{
        filename: string
        title: Record<string, string>
        artist: Record<string, string>
        lyrics: Record<string, string>
      }>
    }

    const category = await this.categoryRepo.findById(meta.categoryId)
    if (!category) throw new Error('Category not found')

    const fileParts = parts.filter((p) => p.name === 'files' && p.filename)
    const songMetaMap = new Map(meta.songs.map((s) => [s.filename, s]))
    const results: Array<{ filename: string; fileId: string }> = []

    for (const filePart of fileParts) {
      const originalName = filePart.filename!
      const mimeType = filePart.type || 'audio/mpeg'
      const songMeta = songMetaMap.get(originalName)

      const title = songMeta?.title ?? parseFilename(originalName).title
      const artist = songMeta?.artist ?? parseFilename(originalName).artist
      const lyrics = songMeta?.lyrics ?? {}
      const ext = mimeToExt(mimeType) || originalName.split('.').pop() || ''
      const uploadName = buildFilename(title, artist, ext)

      // Upload to Drive
      const driveFile = await this.driveClient.uploadFile(
        category.folderId,
        uploadName,
        mimeType,
        filePart.data,
      )

      if (!driveFile.id) continue

      // Upsert song in DB
      await this.songRepo.upsertMany([{
        id: '',
        fileId: driveFile.id,
        title,
        artist,
        lyrics,
        sheet: category.name,
        categories: [category.id],
        status: '',
        listens: 0,
        ext,
        filename: uploadName,
      }])

      results.push({ filename: uploadName, fileId: driveFile.id })
    }

    return sendSuccess(
      { uploaded: results.length, files: results },
      `Uploaded ${results.length} files to ${category.name}`,
    )
  }
}
