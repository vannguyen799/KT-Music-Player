import { Inject, Controller, Get, Post, Put, RouteGuards, Body, Param, Query } from 'truxie'
import { Auth, AdminGuard, type AuthPayload } from '$backend/guards/auth.guard'
import { SongService } from '../domain/song'
import { sendSuccess } from '$backend/shared/response'

@Inject(SongService)
@Controller('songs')
@RouteGuards(AdminGuard)
export class SongController {
  constructor(private readonly songService: SongService) {}

  @Get('/')
  async getSongs(
    @Query('category') category: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
  ) {
    const p = Math.max(1, parseInt(page) || 1)
    const l = Math.min(100, Math.max(1, parseInt(limit) || 50))
    const q = search?.trim() || ''

    if (!category && !q) {
      const result = await this.songService.getAll(p, l)
      return sendSuccess(result)
    }

    if (!category && q) {
      const result = await this.songService.search(q, p, l)
      return sendSuccess(result)
    }

    const result = await this.songService.getSongs(category, p, l, q || undefined)
    return sendSuccess(result)
  }

  @Get('/file/:fileId')
  async getSong(@Param('fileId') fileId: string) {
    const song = await this.songService.findByFileId(fileId)
    return sendSuccess(song)
  }

  @Post('/:fileId/listen')
  async trackListen(@Param('fileId') fileId: string) {
    await this.songService.addListens(fileId)
    return sendSuccess(null, 'Listen tracked')
  }

  @Put('/:fileId')
  async updateSong(
    @Param('fileId') fileId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const song = await this.songService.updateSong(fileId, body as any)
    return sendSuccess(song, 'Song updated')
  }
}
