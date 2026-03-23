import { Injectable } from 'truxie'
import { BaseRepository } from '$backend/shared/base.repository'
import { toPlain, toPlainArray } from '$backend/shared/toPlain'
import { Song } from './song.model'
import type { ISong } from './song.types'

/**
 * Converts Mongoose Map fields to plain objects after .lean().
 * Mongoose lean() returns Map instances for Map schema fields.
 */
function normalizeSong(doc: any): ISong {
  const plain = toPlain<ISong>(doc)
  if (plain.title instanceof Map) plain.title = Object.fromEntries(plain.title)
  if (plain.artist instanceof Map) plain.artist = Object.fromEntries(plain.artist)
  if (plain.lyrics instanceof Map) plain.lyrics = Object.fromEntries(plain.lyrics)
  return plain
}

@Injectable()
export class SongRepository extends BaseRepository<ISong> {
  constructor() {
    super(Song)
  }

  async findByCategory(category: string): Promise<ISong[]> {
    const docs = await this.model.find({ sheet: category }).lean()
    return docs.map(normalizeSong)
  }

  async findByCategories(categories: string[]): Promise<ISong[]> {
    const docs = await this.model.find({ sheet: { $in: categories } }).lean()
    return docs.map(normalizeSong)
  }

  async findByCategoryId(categoryId: string): Promise<ISong[]> {
    const docs = await this.model.find({ categories: categoryId }).lean()
    return docs.map(normalizeSong)
  }

  async findByCategoryIdPaginated(
    categoryId: string,
    page: number,
    limit: number,
    search?: string,
    includeDisabled = false,
  ): Promise<{ songs: ISong[]; total: number }> {
    const filter: Record<string, unknown> = { categories: categoryId }
    if (!includeDisabled) filter.disabled = { $ne: true }
    if (search) {
      const regex = { $regex: search, $options: 'i' }
      filter.$or = [
        { 'title.origin': regex },
        { 'title.vi': regex },
        { 'title.en': regex },
        { 'title.zh': regex },
        { 'title.ja': regex },
        { 'title.ko': regex },
        { 'artist.origin': regex },
        { 'artist.vi': regex },
        { 'artist.en': regex },
        { 'artist.zh': regex },
        { filename: regex },
      ]
    }
    const [docs, total] = await Promise.all([
      this.model.find(filter).skip((page - 1) * limit).limit(limit).lean(),
      this.model.countDocuments(filter),
    ])
    return { songs: docs.map(normalizeSong), total }
  }

  async findAllPaginated(
    page: number,
    limit: number,
    includeDisabled = false,
    excludeCategories: string[] = [],
  ): Promise<{ songs: ISong[]; total: number }> {
    const filter: Record<string, unknown> = {}
    if (!includeDisabled) filter.disabled = { $ne: true }
    if (excludeCategories.length > 0) filter.categories = { $nin: excludeCategories }
    const [docs, total] = await Promise.all([
      this.model.find(filter).skip((page - 1) * limit).limit(limit).lean(),
      this.model.countDocuments(filter),
    ])
    return { songs: docs.map(normalizeSong), total }
  }

  async searchPaginated(
    search: string,
    page: number,
    limit: number,
    includeDisabled = false,
    excludeCategories: string[] = [],
  ): Promise<{ songs: ISong[]; total: number }> {
    const regex = { $regex: search, $options: 'i' }
    const filter: Record<string, unknown> = {
      $or: [
        { 'title.origin': regex },
        { 'title.vi': regex },
        { 'title.en': regex },
        { 'title.zh': regex },
        { 'title.ja': regex },
        { 'title.ko': regex },
        { 'artist.origin': regex },
        { 'artist.vi': regex },
        { 'artist.en': regex },
        { 'artist.zh': regex },
        { filename: regex },
      ],
    }
    if (!includeDisabled) filter.disabled = { $ne: true }
    if (excludeCategories.length > 0) filter.categories = { $nin: excludeCategories }
    const [docs, total] = await Promise.all([
      this.model.find(filter).skip((page - 1) * limit).limit(limit).lean(),
      this.model.countDocuments(filter),
    ])
    return { songs: docs.map(normalizeSong), total }
  }

  async findByCategoryIds(categoryIds: string[]): Promise<ISong[]> {
    const docs = await this.model.find({ categories: { $in: categoryIds } }).lean()
    return docs.map(normalizeSong)
  }

  async findByFileId(fileId: string): Promise<ISong | null> {
    const doc = await this.model.findOne({ fileId }).lean()
    return doc ? normalizeSong(doc) : null
  }

  async getAllCategories(): Promise<string[]> {
    return this.model.distinct('sheet').exec()
  }

  async incrementListens(fileId: string): Promise<void> {
    await this.model.updateOne({ fileId }, { $inc: { listens: 1 } })
  }

  async updateByFileId(fileId: string, updates: Partial<ISong>): Promise<ISong | null> {
    const doc = await this.model.findOneAndUpdate(
      { fileId },
      { $set: updates },
      { returnDocument: 'after' },
    ).lean()
    return doc ? normalizeSong(doc) : null
  }

  async deleteByFileId(fileId: string): Promise<boolean> {
    const result = await this.model.deleteOne({ fileId })
    return (result.deletedCount ?? 0) > 0
  }

  /**
   * Upsert songs for a category — used by the scan service.
   * Inserts new songs (by fileId) and updates existing ones.
   */
  async upsertMany(songs: ISong[]): Promise<{ upserted: number; modified: number }> {
    if (songs.length === 0) return { upserted: 0, modified: 0 }

    const ops = songs.map((song) => ({
      updateOne: {
        filter: { fileId: song.fileId },
        update: {
          $set: {
            title: song.title,
            artist: song.artist,
            lyrics: song.lyrics,
            sheet: song.sheet,
            status: song.status,
            listens: song.listens,
            ext: song.ext,
            filename: song.filename,
          },
          ...(song.categories?.length
            ? { $addToSet: { categories: { $each: song.categories } } }
            : {}),
        },
        upsert: true,
      },
    }))

    const result = await this.model.bulkWrite(ops)
    return {
      upserted: result.upsertedCount ?? 0,
      modified: result.modifiedCount ?? 0,
    }
  }

  /**
   * Find songs that match any of the given title/artist pairs.
   * Used for duplicate detection during upload.
   */
  async findDuplicates(
    checks: Array<{ title: Record<string, string>; artist: Record<string, string> }>,
  ): Promise<Array<{ index: number; matches: ISong[] }>> {
    const results: Array<{ index: number; matches: ISong[] }> = []

    for (let i = 0; i < checks.length; i++) {
      const { title, artist } = checks[i]!
      const conditions: Record<string, unknown>[] = []

      // Match on any title language variant (case-insensitive)
      for (const [lang, val] of Object.entries(title)) {
        if (val?.trim()) {
          conditions.push({ [`title.${lang}`]: { $regex: `^${val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } })
        }
      }

      if (conditions.length === 0) continue

      // If artist is provided, require at least one artist match too
      const artistConditions: Record<string, unknown>[] = []
      for (const [lang, val] of Object.entries(artist)) {
        if (val?.trim()) {
          artistConditions.push({ [`artist.${lang}`]: { $regex: `^${val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } })
        }
      }

      let filter: Record<string, unknown>
      if (artistConditions.length > 0) {
        filter = { $and: [{ $or: conditions }, { $or: artistConditions }] }
      } else {
        filter = { $or: conditions }
      }

      const docs = await this.model.find(filter).limit(5).lean()
      if (docs.length > 0) {
        results.push({ index: i, matches: docs.map(normalizeSong) })
      }
    }

    return results
  }

  /**
   * Remove songs by fileId that are no longer in Drive.
   */
  async removeByFileIds(fileIds: string[]): Promise<number> {
    if (fileIds.length === 0) return 0
    const result = await this.model.deleteMany({ fileId: { $in: fileIds } })
    return result.deletedCount ?? 0
  }

  /**
   * Mark songs as "danger" (missing from Drive).
   */
  async markDanger(fileIds: string[]): Promise<void> {
    if (fileIds.length === 0) return
    await this.model.updateMany(
      { fileId: { $in: fileIds } },
      { $set: { status: 'danger' } },
    )
  }
}
