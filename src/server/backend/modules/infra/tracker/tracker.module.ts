import { Global, Module } from 'truxie'
import { TRACKER_OPTIONS, type TrackerConfig } from './tracker.config'
import { TrackerService } from './tracker.service'

export { TRACKER_OPTIONS }
export type { TrackerConfig }

@Global()
@Module({})
export class TrackerModule {
  static forRoot(config: TrackerConfig) {
    return {
      module: TrackerModule,
      global: true,
      providers: [
        { provide: TRACKER_OPTIONS, useValue: config },
        TrackerService,
      ],
      exports: [TrackerService],
    }
  }
}
