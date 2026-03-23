import { Injectable } from 'truxie'
import { BaseRepository } from '$backend/shared/base.repository'
import { toPlain } from '$backend/shared/toPlain'
import { Category } from './category.model'
import type { ICategory } from './category.types'

@Injectable()
export class CategoryRepository extends BaseRepository<ICategory> {
  constructor() {
    super(Category)
  }

  async findByFolderId(folderId: string): Promise<ICategory | null> {
    const doc = await this.model.findOne({ folderId }).lean()
    return doc ? toPlain<ICategory>(doc) : null
  }

  async findByFolderIds(folderIds: string[]): Promise<ICategory[]> {
    const docs = await this.model.find({ folderId: { $in: folderIds } }).lean()
    return docs.map((d: any) => toPlain<ICategory>(d))
  }

  async findByParentId(parentId: string | null): Promise<ICategory[]> {
    const docs = await this.model.find({ parentId }).lean()
    return docs.map((d: any) => toPlain<ICategory>(d))
  }

  async upsertByFolderId(folderId: string, data: Partial<ICategory>): Promise<ICategory> {
    const setOnInsert: Record<string, any> = { name: data.name, folderId }
    if (data.name && data.name.startsWith('_')) {
      setOnInsert.disabled = true
    }
    const doc = await this.model.findOneAndUpdate(
      { folderId },
      {
        $set: { parentId: data.parentId ?? null },
        $setOnInsert: setOnInsert,
      },
      { upsert: true, returnDocument: 'after' },
    ).lean()
    return toPlain<ICategory>(doc)
  }
}
