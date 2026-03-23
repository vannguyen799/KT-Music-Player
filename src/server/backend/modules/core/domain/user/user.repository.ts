import { Injectable } from 'truxie'
import { BaseRepository } from '$backend/shared/base.repository'
import { toPlain } from '$backend/shared/toPlain'
import { User } from './user.model'
import type { IUser } from './user.types'

@Injectable()
export class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(User)
  }

  async findByUsername(username: string): Promise<IUser | null> {
    const doc = await this.model.findOne({ username }).lean()
    return doc ? toPlain<IUser>(doc) : null
  }

  async findByIdWithPassword(id: string): Promise<IUser | null> {
    const doc = await this.model.findById(id).select('+password').lean()
    return doc ? toPlain<IUser>(doc) : null
  }

  async findByUsernameWithPassword(username: string): Promise<IUser | null> {
    const doc = await this.model.findOne({ username }).select('+password').lean()
    return doc ? toPlain<IUser>(doc) : null
  }

  async addFavorite(userId: string, fileIds: string[]): Promise<IUser | null> {
    const doc = await this.model.findByIdAndUpdate(
      userId,
      { $addToSet: { favorite: { $each: fileIds } } },
      { returnDocument: 'after' },
    ).lean()
    return doc ? toPlain<IUser>(doc) : null
  }

  async removeFavorite(userId: string, fileIds: string[]): Promise<IUser | null> {
    const doc = await this.model.findByIdAndUpdate(
      userId,
      { $pull: { favorite: { $in: fileIds } } },
      { returnDocument: 'after' },
    ).lean()
    return doc ? toPlain<IUser>(doc) : null
  }

  // Playlist operations (embedded in user document)

  async getPlaylists(userId: string): Promise<IUser['playlists']> {
    const doc = await this.model.findById(userId).select('playlists').lean()
    return doc?.playlists ?? []
  }

  async addPlaylist(userId: string, playlist: IUser['playlists'][number]): Promise<IUser | null> {
    const doc = await this.model.findByIdAndUpdate(
      userId,
      { $push: { playlists: playlist } },
      { returnDocument: 'after' },
    ).lean()
    return doc ? toPlain<IUser>(doc) : null
  }

  async updatePlaylist(userId: string, playlistName: string, updates: Partial<IUser['playlists'][number]>): Promise<IUser | null> {
    const setFields: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(updates)) {
      if (key !== 'name') setFields[`playlists.$.${key}`] = val
    }
    const doc = await this.model.findOneAndUpdate(
      { _id: userId, 'playlists.name': playlistName },
      { $set: setFields },
      { returnDocument: 'after' },
    ).lean()
    return doc ? toPlain<IUser>(doc) : null
  }

  async changePassword(userId: string, newPassword: string): Promise<void> {
    const doc = await this.model.findById(userId).select('+password')
    if (!doc) return
    doc.password = newPassword
    await doc.save()
  }

  async removePlaylist(userId: string, playlistName: string): Promise<IUser | null> {
    const doc = await this.model.findByIdAndUpdate(
      userId,
      { $pull: { playlists: { name: playlistName } } },
      { returnDocument: 'after' },
    ).lean()
    return doc ? toPlain<IUser>(doc) : null
  }
}
