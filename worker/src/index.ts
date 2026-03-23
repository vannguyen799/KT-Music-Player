interface Env {
  STREAM_SIGNING_SECRET: string
  GOOGLE_SA_CLIENT_EMAIL: string
  GOOGLE_SA_PRIVATE_KEY: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(request),
      })
    }

    if (request.method !== 'GET') {
      return jsonError('Method not allowed', 405)
    }

    const url = new URL(request.url)

    // Match /drive-stream path
    if (url.pathname !== '/drive-stream') {
      return jsonError('Not found', 404)
    }

    const fileId = url.searchParams.get('fileId')
    const token = url.searchParams.get('token')

    if (!fileId || !token) {
      return jsonError('Missing fileId or token', 400)
    }

    // Verify HMAC token
    const verified = await verifyToken(token, fileId, env.STREAM_SIGNING_SECRET)
    if (!verified) {
      return jsonError('Invalid or expired token', 403)
    }

    try {
      // Get Google Drive access token using SA credentials
      const accessToken = await getGoogleAccessToken(env)

      const driveUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`

      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
      }

      // Forward Range header for seeking support
      const rangeHeader = request.headers.get('Range')
      if (rangeHeader) {
        headers['Range'] = rangeHeader
      }

      const driveRes = await fetch(driveUrl, { headers })

      if (!driveRes.ok && driveRes.status !== 206) {
        return jsonError('Failed to fetch media', driveRes.status)
      }

      const responseHeaders: Record<string, string> = {
        ...corsHeaders(request),
        'Content-Type': driveRes.headers.get('Content-Type') || 'audio/mpeg',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      }

      const contentLength = driveRes.headers.get('Content-Length')
      if (contentLength) responseHeaders['Content-Length'] = contentLength

      const contentRange = driveRes.headers.get('Content-Range')
      if (contentRange) responseHeaders['Content-Range'] = contentRange

      return new Response(driveRes.body, {
        status: driveRes.status,
        headers: responseHeaders,
      })
    } catch (err) {
      console.error('Stream error:', err)
      return jsonError('Internal server error', 500)
    }
  },
} satisfies ExportedHandler<Env>

// --- HMAC verification ---

async function verifyToken(token: string, fileId: string, secret: string): Promise<boolean> {
  const parts = token.split('.')
  if (parts.length !== 3) return false

  const [tokenFileId, expStr, sig] = parts
  if (tokenFileId !== fileId) return false

  const exp = parseInt(expStr!, 10)
  if (isNaN(exp) || exp < Math.floor(Date.now() / 1000)) return false

  const payload = `${tokenFileId}.${expStr}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const expectedSig = bufToHex(sigBuf)

  return expectedSig === sig
}

function bufToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// --- Google SA token via JWT ---

let cachedAccessToken: { token: string; expiresAt: number } | null = null

async function getGoogleAccessToken(env: Env): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token
  }

  const now = Math.floor(Date.now() / 1000)
  const jwtHeader = { alg: 'RS256', typ: 'JWT' }
  const jwtClaim = {
    iss: env.GOOGLE_SA_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const headerB64 = base64url(JSON.stringify(jwtHeader))
  const claimB64 = base64url(JSON.stringify(jwtClaim))
  const unsignedJwt = `${headerB64}.${claimB64}`

  const privateKey = await importPKCS8(env.GOOGLE_SA_PRIVATE_KEY)
  const sigBuf = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    new TextEncoder().encode(unsignedJwt),
  )
  const signedJwt = `${unsignedJwt}.${base64url(sigBuf)}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${signedJwt}`,
  })

  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status}`)
  }

  const data = (await res.json()) as { access_token: string; expires_in: number }
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return data.access_token
}

function base64url(input: string | ArrayBuffer): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function importPKCS8(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '')
  const binaryStr = atob(pemContents)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  return crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

// --- Helpers ---

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Range',
    'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
  }
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
