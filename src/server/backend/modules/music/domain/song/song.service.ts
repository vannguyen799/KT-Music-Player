import { Injectable, Inject } from 'truxie'
import { SongRepository } from './song.repository'
import { CategoryRepository } from '../category/category.repository'
import type { ISong, LocalizedText } from './song.types'

/** Join all values in a LocalizedText for text matching */
function anyText(lt: LocalizedText | undefined): string {
  if (!lt) return ''
  return Object.values(lt).filter(Boolean).join(' ')
}

@Injectable()
@Inject(SongRepository, CategoryRepository)
export class SongService {
  constructor(
    private readonly repo: SongRepository,
    private readonly categoryRepo: CategoryRepository,
  ) {}

  private async getDisabledCategoryIds(): Promise<string[]> {
    const all = await this.categoryRepo.findAll()
    return all.filter((c) => c.disabled).map((c) => c.id)
  }

  /**
   * Get songs by category ID with pagination.
   */
  async getSongs(categoryId: string, page = 1, limit = 50, search?: string): Promise<{ songs: ISong[]; total: number }> {
    return this.repo.findByCategoryIdPaginated(categoryId, page, limit, search)
  }

  async getShuffledSongs(categoryId: string): Promise<{ songs: ISong[]; total: number }> {
    return this.repo.findByCategoryShuffled(categoryId)
  }

  async getAll(page = 1, limit = 50): Promise<{ songs: ISong[]; total: number }> {
    const excludeCategories = await this.getDisabledCategoryIds()
    return this.repo.findAllPaginated(page, limit, false, excludeCategories)
  }

  async search(query: string, page = 1, limit = 50): Promise<{ songs: ISong[]; total: number }> {
    const excludeCategories = await this.getDisabledCategoryIds()
    return this.repo.searchPaginated(query, page, limit, false, excludeCategories)
  }

  /**
   * Legacy: get songs by sheet name with special aggregation logic.
   */
  async getSongsBySheet(sheet: string): Promise<ISong[]> {
    return this.repo.findByCategory(sheet)
  }

  async getAllCategories(): Promise<string[]> {
    return this.repo.getAllCategories()
  }

  async findByFileId(fileId: string): Promise<ISong | null> {
    return this.repo.findByFileId(fileId)
  }

  async addListens(fileId: string): Promise<void> {
    await this.repo.incrementListens(fileId)
  }

  async updateSong(fileId: string, updates: Partial<ISong>): Promise<ISong | null> {
    return this.repo.updateByFileId(fileId, updates)
  }
}
