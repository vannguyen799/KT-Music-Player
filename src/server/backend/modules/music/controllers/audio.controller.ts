import { Inject, Controller, Get, NoGuard, Param } from 'truxie'
import { AudioService } from '../services/audio.service'
import { sendSuccess } from '$backend/shared/response'

@Inject(AudioService)
@Controller('audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Get('/stream-token/:fileId')
  @NoGuard()
  async getStreamToken(@Param('fileId') fileId: string) {
    const tokenInfo = this.audioService.signStreamToken(fileId)
    return sendSuccess(tokenInfo)
  }
}
