import { Module } from 'truxie'
import { PlaylistService } from './domain/playlist.service'
import { PlaylistController } from './controllers/playlist.controller'

@Module({
  controllers: [PlaylistController],
  providers: [PlaylistService],
  exports: [PlaylistService],
})
export class PlaylistModule {}
