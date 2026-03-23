import { Injectable, Inject, OnEvent } from 'truxie'
import { isEventTrackerInitialized } from '@vannguyen799/dispute-evidence-tracker'
import { TrackerService } from '$backend/modules/infra/tracker'
import { UserService } from '$backend/modules/core/domain/user/user.service'
import type { TrackingEvent } from '$backend/shared/tracking-event'

@Injectable()
@Inject(TrackerService, UserService)
export class TrackingListenerService {
  constructor(
    private readonly trackerService: TrackerService,
    private readonly userService: UserService,
  ) {}

  @OnEvent('activity.tracking')
  async handleTracking(event: TrackingEvent): Promise<void> {
    if (!isEventTrackerInitialized() || !this.trackerService.isInitialized) return

    const { userId, username, ip, userAgent, path, cookieSessionId, cookieDeviceId, apiMapping } = event.payload
    const tracker = this.trackerService.tracker

    try {
      // Update lastAccess (fire-and-forget)
      this.userService.updateLastAccess(userId).catch(() => {})

      // Get or start session
      let session = await tracker.sessions.getActive(username)
      if (!session) {
        session = await tracker.sessions.start({
          email: username,
          sessionId: cookieSessionId || undefined,
          deviceId: cookieDeviceId || undefined,
          ip,
          userAgent,
        })
      }

      if (apiMapping) {
        await tracker.tracking.track({
          userId,
          email: username,
          eventType: apiMapping.eventType,
          source: 'server',
          sessionId: session.sessionId,
          deviceId: cookieDeviceId || undefined,
          ip,
          userAgent,
          metadata: {
            feature: apiMapping.feature,
            action: apiMapping.action,
            method: event.payload.method,
            path,
          },
        })
      } else {
        await tracker.tracking.track({
          userId,
          email: username,
          eventType: 'usage.page.view',
          source: 'server',
          sessionId: session.sessionId,
          deviceId: cookieDeviceId || undefined,
          ip,
          userAgent,
          metadata: { path },
        })

        await tracker.sessions.update(session.sessionId, { pageViews: 1 })
      }
    } catch (err: unknown) {
      console.error(`[TrackingListener] Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}
