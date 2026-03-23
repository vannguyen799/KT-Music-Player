import { Inject, Controller, Get, Post, Put, Delete, RouteGuards, Body, Param } from 'truxie'
import { Auth, AuthGuard, type AuthPayload } from '$backend/guards/auth.guard'
import { PlaylistService } from '../domain/playlist.service'
import { sendSuccess } from '$backend/shared/response'
import type { IPlaylist } from '$backend/modules/core/domain/user/user.types'

@Inject(PlaylistService)
@Controller('playlists')
@RouteGuards(AuthGuard)
export class PlaylistController {
  constructor(private readonly playlistService: PlaylistService) {}

  @Get('/')
  async getAll(@Auth() auth: AuthPayload) {
    const playlists = await this.playlistService.getPlaylists(auth.id)
    return sendSuccess(playlists)
  }

  @Post('/')
  async create(
    @Auth() auth: AuthPayload,
    @Body() body: IPlaylist,
  ) {
    const playlists = await this.playlistService.addPlaylist(auth.id, body)
    return sendSuccess(playlists, 'Playlist created')
  }

  @Put('/:name')
  async update(
    @Auth() auth: AuthPayload,
    @Param('name') name: string,
    @Body() body: Partial<IPlaylist>,
  ) {
    const playlists = await this.playlistService.updatePlaylist(auth.id, decodeURIComponent(name), body)
    return sendSuccess(playlists, 'Playlist updated')
  }

  @Delete('/:name')
  async remove(
    @Auth() auth: AuthPayload,
    @Param('name') name: string,
  ) {
    const playlists = await this.playlistService.removePlaylist(auth.id, decodeURIComponent(name))
    return sendSuccess(playlists, 'Playlist removed')
  }
}
