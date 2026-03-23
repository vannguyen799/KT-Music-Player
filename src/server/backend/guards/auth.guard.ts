import type { ICanActivateGuard, ExecutionContext } from 'truxie'
import { UnauthorizedError, ForbiddenError, defineAuth } from 'truxie'
import { verifyToken, type AuthPayload } from '../shared/auth'

export type { AuthPayload }
export const Auth = defineAuth<AuthPayload>()

const ROLE = { ADMIN: 0, USER: 1, STAFF: 2, GUEST: 3 } as const

function extractBearer(ctx: ExecutionContext): string {
  // SvelteKit RequestEvent — access request headers via the native request
  const event = ctx.getNativeRequest() as any
  let authHeader = ''

  if (event?.request?.headers?.get) {
    // SvelteKit RequestEvent
    authHeader = event.request.headers.get('authorization') ?? ''
  } else if (event?.node?.req?.headers) {
    // H3/Nitro fallback
    authHeader = (event.node.req.headers.authorization as string) ?? ''
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Not authorized, no token provided')
  }
  const token = authHeader.slice(7).trim()
  if (!token) throw new UnauthorizedError('Not authorized, no token provided')
  return token
}

export class AuthGuard implements ICanActivateGuard {
  canActivate(ctx: ExecutionContext): boolean {
    const token = extractBearer(ctx)
    const decoded = verifyToken(token)
    ctx.setAuth(decoded)
    return true
  }
}

export class AdminGuard implements ICanActivateGuard {
  canActivate(ctx: ExecutionContext): boolean {
    const token = extractBearer(ctx)
    const decoded = verifyToken(token)
    if (decoded.role !== ROLE.ADMIN) {
      throw new ForbiddenError('Requires admin role')
    }
    ctx.setAuth(decoded)
    return true
  }
}
