import { Inject, Controller, Get, RouteGuards, Param } from 'truxie'
import { AdminGuard } from '$backend/guards/auth.guard'
import { AudioService } from '../services/audio.service'
import { sendSuccess } from '$backend/shared/response'

@Inject(AudioService)
@Controller('audio')
@RouteGuards(AdminGuard)
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Get('/stream-token/:fileId')
  async getStreamToken(@Param('fileId') fileId: string) {
    const tokenInfo = this.audioService.signStreamToken(fileId)
    return sendSuccess(tokenInfo)
  }
}
