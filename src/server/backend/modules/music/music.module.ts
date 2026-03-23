import { Module } from 'truxie'
import { MUSIC_MODULE_OPTIONS, type MusicModuleConfig } from './music.config'
import { GoogleDriveClient } from '$backend/shared/google-drive.client'
import { SongRepository } from './domain/song/song.repository'
import { CategoryRepository } from './domain/category/category.repository'
import { SongService } from './domain/song/song.service'
import { AudioService } from './services/audio.service'
import { ScanService } from './services/scan.service'
import { SongController } from './controllers/song.controller'
import { CategoryController } from './controllers/category.controller'
import { AudioController } from './controllers/audio.controller'
import { AdminMusicController } from './controllers/admin.controller'

export { MUSIC_MODULE_OPTIONS }
export type { MusicModuleConfig }

@Module({})
export class MusicModule {
  static forRoot(config: MusicModuleConfig) {
    return {
      module: MusicModule,
      controllers: [SongController, CategoryController, AudioController, AdminMusicController],
      providers: [
        { provide: MUSIC_MODULE_OPTIONS, useValue: config },
        GoogleDriveClient,
        SongRepository,
        CategoryRepository,
        SongService,
        AudioService,
        ScanService,
      ],
      exports: [SongService, AudioService, ScanService, GoogleDriveClient, CategoryRepository],
    }
  }
}
