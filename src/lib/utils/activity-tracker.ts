import type { DisputeEventType } from '@vannguyen799/dispute-evidence-tracker'
import { getClientCookie, setClientCookie, clearClientCookie } from './client-cookies'
import { DET_SESSION_COOKIE, DET_SESSION_MAX_AGE } from './tracking-constants'
import { getAuthToken } from '$lib/services/api'

// ── Types ──────────────────────────────────────────────────────

interface TrackerEvent {
  userId: string
  email: string
  eventType: DisputeEventType
  source: 'client'
  timestamp: Date
  sessionId: string
  deviceId?: string
  ip?: string
  metadata?: Record<string, unknown>
}

// ── Singleton State ────────────────────────────────────────────

let initialized = false
let sessionId = ''
let deviceId = ''
let flushTimer: ReturnType<typeof setInterval> | null = null
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let buffer: TrackerEvent[] = []
let scrollMilestones = new Set<number>()
let pageEnteredAt = 0
let activeTime = 0
let lastActivityAt = 0
let interactionCount = 0
let currentPath = ''
let clientIp = ''
let cleanupFns: Array<() => void> = []

// User info set during init
let _userId = ''
let _username = ''

const BUFFER_MAX = 500
const FLUSH_THRESHOLD = 50
const FLUSH_INTERVAL_MS = 30_000
const HEARTBEAT_INTERVAL_MS = 60_000
const IDLE_TIMEOUT_MS = 5 * 60_000

// ── Debounce helper ─────────────────────────────────────────────

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: any[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as unknown as T
}

// ── Core ───────────────────────────────────────────────────────

function pushEvent(eventType: DisputeEventType, metadata?: Record<string, unknown>) {
  if (!_userId || !_username || !initialized) return

  buffer.push({
    userId: _userId,
    email: _username,
    eventType,
    source: 'client',
    timestamp: new Date(),
    sessionId,
    ...(deviceId && { deviceId }),
    ...(clientIp && { ip: clientIp }),
    metadata,
  })

  if (buffer.length > BUFFER_MAX) {
    buffer = buffer.slice(buffer.length - BUFFER_MAX)
  }

  if (buffer.length >= FLUSH_THRESHOLD) {
    flush()
  }
}

async function flush() {
  if (buffer.length === 0) return

  const events = buffer.splice(0, buffer.length)
  const token = getAuthToken()
  if (!token) return

  try {
    await fetch('/api/det/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ events }),
    })
  } catch {
    // Re-add events on failure (drop if buffer is too large)
    if (buffer.length + events.length <= BUFFER_MAX) {
      buffer.unshift(...events)
    }
  }
}

function flushBeacon() {
  if (buffer.length === 0) return

  const events = buffer.splice(0, buffer.length)
  const token = getAuthToken()
  if (!token) return

  const payload = JSON.stringify({ events, token })

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/det/events', new Blob([payload], { type: 'application/json' }))
  }
}

// ── Listeners ──────────────────────────────────────────────────

function onActivity() {
  lastActivityAt = Date.now()
  interactionCount++
}

function onDocumentClick(e: MouseEvent) {
  onActivity()

  const target = e.target as HTMLElement | null
  if (!target) return

  const tracked = target.closest('[data-track]') as HTMLElement | null
  const button = target.closest('button') as HTMLButtonElement | null
  const link = target.closest('a') as HTMLAnchorElement | null
  const el = tracked || button || link
  if (!el) return

  const text = (el.textContent || '').trim().slice(0, 100)
  const metadata: Record<string, unknown> = {
    target: tracked?.dataset.track || el.tagName.toLowerCase(),
    text,
    path: window.location.pathname,
  }

  if (link?.href) metadata.href = link.href
  if (tracked?.dataset.trackSection) metadata.section = tracked.dataset.trackSection

  pushEvent('usage.click', metadata)
}

function onScroll() {
  const scrollTop = window.scrollY
  const docHeight = document.documentElement.scrollHeight - window.innerHeight
  if (docHeight <= 0) return

  const pct = Math.round((scrollTop / docHeight) * 100)

  for (const milestone of [25, 50, 75, 100]) {
    if (pct >= milestone && !scrollMilestones.has(milestone)) {
      scrollMilestones.add(milestone)
      pushEvent('usage.scroll.depth', {
        depth: milestone,
        path: window.location.pathname,
      })
    }
  }

  onActivity()
}

function onVisibilityChange() {
  const state = document.visibilityState
  pushEvent('usage.tab.visibility', {
    state,
    path: window.location.pathname,
  })

  if (state === 'hidden') {
    const now = Date.now()
    activeTime += now - (lastActivityAt || pageEnteredAt)
    const duration = now - pageEnteredAt

    pushEvent('usage.page.duration', {
      path: window.location.pathname,
      duration: Math.round(duration / 1000),
      activeTime: Math.round(activeTime / 1000),
    })

    flushBeacon()
  }
}

function onBeforeUnload() {
  const now = Date.now()
  const duration = now - pageEnteredAt
  activeTime += now - (lastActivityAt || pageEnteredAt)

  pushEvent('usage.page.duration', {
    path: window.location.pathname,
    duration: Math.round(duration / 1000),
    activeTime: Math.round(activeTime / 1000),
  })

  flushBeacon()
}

function startHeartbeat() {
  heartbeatTimer = setInterval(() => {
    const idleTime = Date.now() - lastActivityAt
    if (idleTime > IDLE_TIMEOUT_MS) return

    pushEvent('usage.session.heartbeat', {
      path: window.location.pathname,
      idleTime: Math.round(idleTime / 1000),
      interactions: interactionCount,
    })
  }, HEARTBEAT_INTERVAL_MS)
}

// ── Lifecycle ──────────────────────────────────────────────────

function resetPageState() {
  scrollMilestones = new Set()
  pageEnteredAt = Date.now()
  activeTime = 0
  lastActivityAt = Date.now()
  interactionCount = 0
  currentPath = window.location.pathname
}

export function initActivityTracker(userId: string, username: string) {
  if (initialized) return
  initialized = true
  _userId = userId
  _username = username

  // Session ID: read from cookie or generate new
  const existingSid = getClientCookie(DET_SESSION_COOKIE)
  if (existingSid) {
    sessionId = existingSid
  } else {
    sessionId = crypto.randomUUID()
  }
  setClientCookie(DET_SESSION_COOKIE, sessionId, DET_SESSION_MAX_AGE)

  resetPageState()

  // Device ID: fire-and-forget async
  import('./device-fingerprint').then(m => m.getDeviceId()).then((id) => { deviceId = id }).catch(() => {})

  // Fetch client IP (fire-and-forget)
  fetch('https://api.ipify.org?format=json')
    .then(r => r.json())
    .then((data: { ip: string }) => { clientIp = data.ip })
    .catch(() => {})

  // Click listener
  document.addEventListener('click', onDocumentClick, { passive: true })
  cleanupFns.push(() => document.removeEventListener('click', onDocumentClick))

  // Scroll listener (debounced)
  const debouncedScroll = debounce(onScroll, 200)
  window.addEventListener('scroll', debouncedScroll, { passive: true })
  cleanupFns.push(() => window.removeEventListener('scroll', debouncedScroll))

  // Visibility change
  document.addEventListener('visibilitychange', onVisibilityChange)
  cleanupFns.push(() => document.removeEventListener('visibilitychange', onVisibilityChange))

  // Before unload
  window.addEventListener('beforeunload', onBeforeUnload)
  cleanupFns.push(() => window.removeEventListener('beforeunload', onBeforeUnload))

  // Flush timer
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS)

  // Heartbeat
  startHeartbeat()

  // Activity listeners for idle detection
  const activityEvents = ['mousemove', 'keydown', 'touchstart'] as const
  for (const evt of activityEvents) {
    const handler = debounce(onActivity, 1000)
    window.addEventListener(evt, handler, { passive: true })
    cleanupFns.push(() => window.removeEventListener(evt, handler))
  }
}

export async function destroyActivityTracker() {
  if (!initialized) return
  initialized = false

  await flush()

  if (flushTimer) { clearInterval(flushTimer); flushTimer = null }
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }

  for (const cleanup of cleanupFns) cleanup()
  cleanupFns = []

  clearClientCookie(DET_SESSION_COOKIE)
  sessionId = ''
  _userId = ''
  _username = ''

  buffer = []
}

/**
 * Track SvelteKit navigation (call from afterNavigate).
 */
export function trackNavigation(from: string, to: string) {
  if (!initialized) return
  resetPageState()
  if (from && from !== to) {
    pushEvent('usage.navigation', { from, to })
  }
}

/**
 * Push a custom event into the tracking buffer.
 */
export function trackClientEvent(eventType: DisputeEventType, metadata?: Record<string, unknown>) {
  pushEvent(eventType, metadata)
}
