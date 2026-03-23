import type { Model } from 'mongoose'
import { toPlain, toPlainArray } from './toPlain'

/**
 * Abstract base repository for Mongoose-backed entities.
 * All queries use .lean() and return plain objects via toPlain().
 */
export abstract class BaseRepository<T extends { id: string }> {
  constructor(protected readonly model: Model<any>) {}

  async findById(id: string): Promise<T | null> {
    const doc = await this.model.findById(id).lean()
    return doc ? toPlain<T>(doc) : null
  }

  async findAll(filter: Record<string, unknown> = {}): Promise<T[]> {
    const docs = await this.model.find(filter).lean()
    return toPlainArray<T>(docs)
  }

  async create(data: Partial<T>): Promise<T> {
    const doc = await this.model.create(data)
    return toPlain<T>(doc.toObject())
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const doc = await this.model
      .findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after', runValidators: true })
      .lean()
    return doc ? toPlain<T>(doc) : null
  }

  async delete(id: string): Promise<T | null> {
    const doc = await this.model.findByIdAndDelete(id).lean()
    return doc ? toPlain<T>(doc) : null
  }

  async count(filter: Record<string, unknown> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec()
  }

  protected searchFilter(search: string, fields: string[]): Record<string, unknown> {
    if (!search) return {}
    const regex = { $regex: search, $options: 'i' }
    return { $or: fields.map((f) => ({ [f]: regex })) }
  }
}
