import { Module } from 'truxie'
import { DETController } from './controllers/det.controller'
import { TrackingListenerService } from './services/tracking-listener.service'

@Module({
  controllers: [DETController],
  providers: [TrackingListenerService],
})
export class SystemModule {}
