import { Injectable, Inject, ValidationError, NotFoundError } from 'truxie'
import { UserRepository } from '$backend/modules/core/domain/user/user.repository'
import type { IPlaylist } from '$backend/modules/core/domain/user/user.types'

@Injectable()
@Inject(UserRepository)
export class PlaylistService {
  constructor(private readonly userRepo: UserRepository) {}

  private validate(playlist: IPlaylist): void {
    if (!playlist.name || playlist.name.trim() === '') {
      throw new ValidationError('Playlist name is required')
    }
    if (!Array.isArray(playlist.songList)) {
      throw new ValidationError('songList must be an array')
    }
  }

  async getPlaylists(userId: string): Promise<IPlaylist[]> {
    return this.userRepo.getPlaylists(userId)
  }

  async addPlaylist(userId: string, playlist: IPlaylist): Promise<IPlaylist[]> {
    this.validate(playlist)

    // Check duplicate name
    const existing = await this.userRepo.getPlaylists(userId)
    if (existing.some((p) => p.name === playlist.name)) {
      throw new ValidationError('Duplicate playlist name')
    }

    const user = await this.userRepo.addPlaylist(userId, playlist)
    if (!user) throw new NotFoundError('User not found')
    return user.playlists
  }

  async updatePlaylist(userId: string, playlistName: string, updates: Partial<IPlaylist>): Promise<IPlaylist[]> {
    const user = await this.userRepo.updatePlaylist(userId, playlistName, updates)
    if (!user) throw new NotFoundError('Playlist not found')
    return user.playlists
  }

  async removePlaylist(userId: string, playlistName: string): Promise<IPlaylist[]> {
    const user = await this.userRepo.removePlaylist(userId, playlistName)
    if (!user) throw new NotFoundError('User not found')
    return user.playlists
  }
}
