import { Injectable } from 'truxie'
import { env } from '$env/dynamic/private'
import crypto from 'node:crypto'

const TOKEN_TTL = 3600 // 1 hour

@Injectable()
export class AudioService {
  private getSecret(): string {
    const secret = env.STREAM_SIGNING_SECRET || env.JWT_SECRET
    if (!secret) throw new Error('STREAM_SIGNING_SECRET or JWT_SECRET not configured')
    return secret
  }

  /**
   * Sign a short-lived, file-scoped token.
   * The worker verifies this HMAC before streaming.
   */
  signStreamToken(fileId: string): { token: string; expires_in: number } {
    const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL
    const payload = `${fileId}.${exp}`
    const sig = crypto.createHmac('sha256', this.getSecret()).update(payload).digest('hex')
    const token = `${payload}.${sig}`
    return { token, expires_in: TOKEN_TTL }
  }
}
