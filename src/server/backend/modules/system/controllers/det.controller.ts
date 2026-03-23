import { Inject, Controller, Post, UnauthorizedError, Body, Headers, Ip, UserAgent, Cookie } from 'truxie'
import { verifyToken } from '$backend/shared/auth'
import { sendSuccess } from '$backend/shared/response'
import { isEventTrackerInitialized, batchTrackSchema } from '@vannguyen799/dispute-evidence-tracker'
import { TrackerService } from '$backend/modules/infra/tracker'
import { DET_DEVICE_COOKIE } from '$lib/utils/tracking-constants'

@Inject(TrackerService)
@Controller('det')
export class DETController {
  constructor(private readonly trackerService: TrackerService) {}

  @Post('/events')
  async trackEvents(
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: unknown,
    @Ip() ip: string,
    @UserAgent() userAgent: string,
    @Cookie(DET_DEVICE_COOKIE) cookieDeviceId: string | undefined,
  ) {
    if (!isEventTrackerInitialized()) {
      return sendSuccess({ tracked: 0, failed: 0 }, 'Tracker not initialized — events skipped')
    }

    // Dual auth: header first, fall back to body token for sendBeacon
    let decoded: ReturnType<typeof verifyToken> | null = null

    const rawBody = body as Record<string, unknown>
    const bodyToken = typeof rawBody?.token === 'string' ? rawBody.token : undefined

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      if (token) {
        decoded = verifyToken(token)
      }
    } else if (bodyToken) {
      decoded = verifyToken(bodyToken)
    } else {
      throw new UnauthorizedError('Not authorized, no token provided')
    }

    // Strip token from body before schema validation
    if (bodyToken && rawBody) {
      delete rawBody.token
    }

    const parsed = batchTrackSchema.parse(body)

    const events = parsed.events.map(evt => ({
      ...evt,
      source: 'client' as const,
      ip: ip || evt.ip || '',
      userAgent,
      deviceId: evt.deviceId || cookieDeviceId || undefined,
    }))

    const result = await this.trackerService.tracker.tracking.trackBatch(events)

    return sendSuccess({ tracked: result.tracked, failed: result.failed }, `Tracked ${result.tracked} events`)
  }
}
