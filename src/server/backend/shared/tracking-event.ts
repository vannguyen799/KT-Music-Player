import { DomainEvent } from 'truxie'
import type { DisputeEventType } from '@vannguyen799/dispute-evidence-tracker'

export interface ApiFeatureMapping {
  feature: string
  action: string
  eventType: DisputeEventType
}

export interface TrackingPayload {
  userId: string
  username: string
  ip: string
  userAgent: string
  path: string
  method: string
  cookieSessionId?: string
  cookieDeviceId?: string
  apiMapping: ApiFeatureMapping | null
}

export class TrackingEvent extends DomainEvent<TrackingPayload> {
  readonly type = 'activity.tracking'
}
