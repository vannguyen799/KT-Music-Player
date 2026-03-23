import { Injectable, Inject, type OnModuleInit } from 'truxie'
import {
  createEventTracker,
  isEventTrackerInitialized,
  type DisputeEventType,
  type EventTrackerInstance,
} from '@vannguyen799/dispute-evidence-tracker'
import { TRACKER_OPTIONS, type TrackerConfig } from './tracker.config'

export interface TrackOptions {
  ip?: string
  userAgent?: string
  sessionId?: string
  deviceId?: string
  metadata?: Record<string, unknown>
}

type UsageEventType = 'usage.page.view' | 'usage.feature.access' | 'usage.download' | 'usage.api.call' | 'usage.content.view'
type AuthEventType = 'auth.login.success' | 'auth.login.failed' | 'auth.register' | 'auth.logout'

@Injectable()
@Inject(TRACKER_OPTIONS)
export class TrackerService implements OnModuleInit {
  private _tracker: EventTrackerInstance | null = null
  private _initPromise: Promise<void> | null = null

  constructor(private readonly config: TrackerConfig) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureInitialized()
      console.log('[Tracker] initialized')
    } catch (err: unknown) {
      console.warn(`[Tracker] init deferred: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  get tracker(): EventTrackerInstance {
    if (this._tracker) return this._tracker
    throw new Error('Event Tracker not initialized')
  }

  get isInitialized(): boolean {
    return isEventTrackerInitialized()
  }

  async trackUsageEvent(userId: string, email: string, eventType: UsageEventType, opts?: TrackOptions): Promise<void> {
    return this.trackTypedEvent(eventType, userId, email, opts)
  }

  async trackAuthEvent(userId: string, email: string, eventType: AuthEventType, opts?: TrackOptions): Promise<void> {
    return this.trackTypedEvent(eventType, userId, email, opts)
  }

  private async trackTypedEvent(eventType: DisputeEventType, userId: string, email: string, opts?: TrackOptions): Promise<void> {
    if (!isEventTrackerInitialized()) return
    try {
      await this._tracker!.tracking.track({
        userId, email, eventType, source: 'server',
        ip: opts?.ip, userAgent: opts?.userAgent,
        sessionId: opts?.sessionId, deviceId: opts?.deviceId,
        metadata: opts?.metadata,
      })
    } catch (err: unknown) {
      console.error(`[Tracker] track ${eventType} error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this._tracker) return
    if (this._initPromise) return this._initPromise
    this._initPromise = this.doInitialize().catch((err) => {
      this._initPromise = null
      throw err
    })
    return this._initPromise
  }

  private async doInitialize(): Promise<void> {
    if (isEventTrackerInitialized() && this._tracker) return

    const { encryptionKey } = this.config

    if (!encryptionKey) {
      console.warn('[Tracker] Missing encryptionKey — skipping initialization')
      this._initPromise = null
      return
    }

    const mongoose = await import('mongoose')

    this._tracker = await createEventTracker({
      connection: mongoose.default,
      encryptionKey,
      encryptRawData: false,
    })
    console.log('[Tracker] Event Tracker initialized')
  }
}
