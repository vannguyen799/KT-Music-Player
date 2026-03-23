import { Module } from 'truxie'
import { env } from '$env/dynamic/private'
import { CoreModule } from './core/core.module'
import { MusicModule } from './music/music.module'
import { PlaylistModule } from './playlist/playlist.module'

@Module({
  imports: [
    CoreModule.forRoot({
      jwtSecret: env.JWT_SECRET || '',
    }),
    MusicModule.forRoot({
      audioFolderId: env.DRIVE_AUDIO_FOLDER_ID || '',
    }),
    PlaylistModule,
  ],
})
export class AppModule {}
