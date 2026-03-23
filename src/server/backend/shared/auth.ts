import jwt, { type SignOptions } from 'jsonwebtoken'
import { UnauthorizedError } from 'truxie'
import { env } from '$env/dynamic/private'

export interface AuthPayload {
  id: string
  username: string
  role: number
}

function getSecret(): string {
  const secret = env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured')
  return secret
}

export function signToken(payload: AuthPayload, expiresIn = '365d'): string {
  return jwt.sign(payload, getSecret(), { expiresIn } as SignOptions)
}

export function verifyToken(token: string): AuthPayload {
  try {
    return jwt.verify(token, getSecret()) as AuthPayload
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token has expired')
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token')
    }
    throw new UnauthorizedError('Authentication failed')
  }
}
