import type { Handle } from '@sveltejs/kit'
import { isEventTrackerInitialized } from '@vannguyen799/dispute-evidence-tracker'
import type { DisputeEventType } from '@vannguyen799/dispute-evidence-tracker'
import { verifyToken } from '$backend/shared/auth'
import { getEventEmitter } from '$backend/app'
import { TrackingEvent, type ApiFeatureMapping } from '$backend/shared/tracking-event'
import { DET_SESSION_COOKIE, DET_SESSION_MAX_AGE, DET_DEVICE_COOKIE } from '$lib/utils/tracking-constants'

// ── JWT extraction (best-effort, non-throwing) ──────────────────────────────

interface MiddlewareAuth {
  userId: string
  username: string
}

function tryExtractAuth(request: Request): MiddlewareAuth | null {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null

  const token = header.slice(7)
  if (!token) return null

  try {
    const decoded = verifyToken(token)
    return { userId: decoded.id, username: decoded.username }
  } catch {
    return null
  }
}

// ── API Route → Feature mapping ─────────────────────────────────────────────

function resolveApiFeature(path: string, method: string): ApiFeatureMapping | null {
  // ── Auth ──────────────────────────────────────────────────────
  if (path === '/api/auth/login' && method === 'POST')
    return { feature: 'auth', action: 'login', eventType: 'usage.feature.access' }
  if (path === '/api/auth/register' && method === 'POST')
    return { feature: 'auth', action: 'register', eventType: 'usage.feature.access' }

  // ── Songs ─────────────────────────────────────────────────────
  if (path === '/api/songs' && method === 'GET')
    return { feature: 'songs', action: 'list', eventType: 'usage.content.view' }
  if (path.match(/^\/api\/songs\/[^/]+$/) && method === 'GET')
    return { feature: 'songs', action: 'view', eventType: 'usage.content.view' }
  if (path.match(/^\/api\/songs\/[^/]+\/listen$/) && method === 'POST')
    return { feature: 'songs', action: 'listen', eventType: 'usage.feature.access' }
  if (path.match(/^\/api\/songs\/[^/]+$/) && method === 'PUT')
    return { feature: 'songs', action: 'update', eventType: 'usage.feature.access' }

  // ── Categories ────────────────────────────────────────────────
  if (path === '/api/categories' && method === 'GET')
    return { feature: 'categories', action: 'list', eventType: 'usage.content.view' }
  if (path.match(/^\/api\/categories\/[^/]+$/) && method === 'GET')
    return { feature: 'categories', action: 'view', eventType: 'usage.content.view' }

  // ── Playlists ─────────────────────────────────────────────────
  if (path === '/api/playlists' && method === 'GET')
    return { feature: 'playlists', action: 'list', eventType: 'usage.content.view' }
  if (path === '/api/playlists' && method === 'POST')
    return { feature: 'playlists', action: 'create', eventType: 'usage.feature.access' }
  if (path.match(/^\/api\/playlists\/[^/]+$/) && method === 'PUT')
    return { feature: 'playlists', action: 'update', eventType: 'usage.feature.access' }
  if (path.match(/^\/api\/playlists\/[^/]+$/) && method === 'DELETE')
    return { feature: 'playlists', action: 'delete', eventType: 'usage.feature.access' }

  // ── Favorites ─────────────────────────────────────────────────
  if (path === '/api/user/favorites' && method === 'POST')
    return { feature: 'favorites', action: 'add', eventType: 'usage.feature.access' }
  if (path === '/api/user/favorites' && method === 'DELETE')
    return { feature: 'favorites', action: 'remove', eventType: 'usage.feature.access' }

  // ── Audio ─────────────────────────────────────────────────────
  if (path.match(/^\/api\/audio\/stream\//) && method === 'GET')
    return { feature: 'audio', action: 'stream', eventType: 'usage.content.view' }
  if (path.match(/^\/api\/audio\/token\//) && method === 'GET')
    return { feature: 'audio', action: 'get_token', eventType: 'usage.feature.access' }

  // ── Admin ─────────────────────────────────────────────────────
  if (path.startsWith('/api/admin/') && method === 'POST')
    return { feature: 'admin', action: 'write', eventType: 'usage.feature.access' }
  if (path.startsWith('/api/admin/') && method === 'GET')
    return { feature: 'admin', action: 'read', eventType: 'usage.content.view' }

  return null
}

// ── Paths to skip ───────────────────────────────────────────────────────────

const SKIP_PATHS = [
  '/_app/',
  '/api/auth/me',
  '/api/det/',
  '/api/health',
]

function shouldSkip(path: string): boolean {
  return SKIP_PATHS.some(skip => path.startsWith(skip))
}

// ── Cookie helpers ──────────────────────────────────────────────────────────

function getCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined
  const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match?.[1] ? decodeURIComponent(match[1]) : undefined
}

// ── Handle ──────────────────────────────────────────────────────────────────

export const handle: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname

  // Run tracking in parallel with the response (fire-and-forget)
  if (isEventTrackerInitialized() && !shouldSkip(path)) {
    const auth = tryExtractAuth(event.request)

    if (auth) {
      const isApiCall = path.startsWith('/api/')
      let apiMapping: ApiFeatureMapping | null = null

      if (isApiCall) {
        apiMapping = resolveApiFeature(path, event.request.method)
        if (!apiMapping) {
          // Skip unmapped API routes
        } else {
          const cookieHeader = event.request.headers.get('cookie')
          let cookieSessionId = getCookieValue(cookieHeader, DET_SESSION_COOKIE)

          if (!cookieSessionId) {
            cookieSessionId = crypto.randomUUID()
            event.cookies.set(DET_SESSION_COOKIE, cookieSessionId, {
              path: '/',
              maxAge: DET_SESSION_MAX_AGE,
              sameSite: 'lax',
              httpOnly: false,
            })
          }

          const clientIp = event.getClientAddress?.() || event.request.headers.get('x-forwarded-for') || ''

          getEventEmitter().emitAsync(new TrackingEvent({
            userId: auth.userId,
            username: auth.username,
            ip: clientIp,
            userAgent: event.request.headers.get('user-agent') || '',
            path,
            method: event.request.method,
            cookieSessionId,
            cookieDeviceId: getCookieValue(cookieHeader, DET_DEVICE_COOKIE),
            apiMapping,
          }))
        }
      }
    }
  }

  return resolve(event)
}
