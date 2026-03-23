import type { RequestHandler } from '@sveltejs/kit'
import { google } from 'googleapis'
import { env } from '$env/dynamic/private'
import fs from 'node:fs'
import path from 'node:path'

let cachedAuth: InstanceType<typeof google.auth.JWT> | null = null

function getAuth() {
  if (cachedAuth) return cachedAuth

  const saJson = env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!saJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured')

  const credentials = saJson.trimStart().startsWith('{')
    ? JSON.parse(saJson)
    : JSON.parse(fs.readFileSync(path.isAbsolute(saJson) ? saJson : path.resolve(saJson), 'utf-8'))

  cachedAuth = new google.auth.JWT(
    credentials.client_email,
    undefined,
    credentials.private_key,
    ['https://www.googleapis.com/auth/drive.readonly'],
  )
  return cachedAuth
}

export const GET: RequestHandler = async ({ params, request }) => {
  const { fileId } = params
  if (!fileId) {
    return new Response('Missing fileId', { status: 400 })
  }

  try {
    const auth = getAuth()
    const tokenRes = await auth.authorize()
    const accessToken = tokenRes.access_token!

    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`

    // Forward range header from browser for seeking support
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    }
    const rangeHeader = request.headers.get('Range')
    if (rangeHeader) {
      headers['Range'] = rangeHeader
    }

    const driveRes = await fetch(driveUrl, { headers })

    if (!driveRes.ok && driveRes.status !== 206) {
      return new Response('Failed to fetch audio', { status: driveRes.status })
    }

    // Build response headers
    const responseHeaders: Record<string, string> = {
      'Content-Type': driveRes.headers.get('Content-Type') || 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
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
    console.error('Audio stream error:', err)
    return new Response('Internal server error', { status: 500 })
  }
}
