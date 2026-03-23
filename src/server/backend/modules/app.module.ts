import { Module } from 'truxie'
import { env } from '$env/dynamic/private'
import { CoreModule } from './core/core.module'
import { MusicModule } from './music/music.module'
import { PlaylistModule } from './playlist/playlist.module'
import { TrackerModule } from './infra/tracker'
import { SystemModule } from './system/system.module'

@Module({
  imports: [
    TrackerModule.forRoot({
      encryptionKey: env.DET_ENCRYPTION_KEY || '',
    }),
    CoreModule.forRoot({
      jwtSecret: env.JWT_SECRET || '',
    }),
    MusicModule.forRoot({
      audioFolderId: env.DRIVE_AUDIO_FOLDER_ID || '',
    }),
    PlaylistModule,
    SystemModule,
  ],
})
export class AppModule {}
