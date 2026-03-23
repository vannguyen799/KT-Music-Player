import { Inject, Controller, Post, Delete, Get, Put, RouteGuards, Body } from 'truxie'
import { Auth, AuthGuard, type AuthPayload } from '$backend/guards/auth.guard'
import { UserService } from '../domain/user'
import { sendSuccess } from '$backend/shared/response'
import type { IPlayerConfig } from '../domain/user/user.types'

@Inject(UserService)
@Controller('user')
@RouteGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/favorites')
  async getFavorites(@Auth() auth: AuthPayload) {
    const user = await this.userService.findById(auth.id)
    return sendSuccess({ favorites: user.favorite || [] })
  }

  @Post('/favorite')
  async addFavorite(
    @Auth() auth: AuthPayload,
    @Body() body: { fileIds: string[] },
  ) {
    await this.userService.addFavorite(auth.id, body.fileIds)
    return sendSuccess(null, 'Favorites updated')
  }

  @Delete('/favorite')
  async removeFavorite(
    @Auth() auth: AuthPayload,
    @Body() body: { fileIds: string[] },
  ) {
    await this.userService.removeFavorite(auth.id, body.fileIds)
    return sendSuccess(null, 'Favorites updated')
  }

  @Get('/player-config')
  async getPlayerConfig(@Auth() auth: AuthPayload) {
    const user = await this.userService.findById(auth.id)
    return sendSuccess({ playerConfig: user.playerConfig ?? null })
  }

  @Put('/player-config')
  async updatePlayerConfig(
    @Auth() auth: AuthPayload,
    @Body() body: { playerConfig: IPlayerConfig },
  ) {
    await this.userService.updatePlayerConfig(auth.id, body.playerConfig)
    return sendSuccess(null, 'Player config updated')
  }
}
