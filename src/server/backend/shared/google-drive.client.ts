import { google, type drive_v3 } from 'googleapis'
import { Injectable } from 'truxie'
import { env } from '$env/dynamic/private'
import { Readable } from 'node:stream'
import fs from 'node:fs'
import path from 'node:path'

let driveInstance: drive_v3.Drive | null = null
let cachedToken: { access_token: string; expiry: number } | null = null

function loadCredentials(): Record<string, any> {
  const saJson = env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!saJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured')

  // If it looks like a file path (doesn't start with '{'), read the file
  if (!saJson.trimStart().startsWith('{')) {
    const filePath = path.isAbsolute(saJson) ? saJson : path.resolve(saJson)
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  }

  return JSON.parse(saJson)
}

function getDrive(): drive_v3.Drive {
  if (driveInstance) return driveInstance

  const credentials = loadCredentials()
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  })

  driveInstance = google.drive({ version: 'v3', auth })
  return driveInstance
}

/**
 * Google Drive client — used ONLY for audio file operations.
 * All data storage (songs, users) is in MongoDB.
 */
@Injectable()
export class GoogleDriveClient {
  get drive(): drive_v3.Drive {
    return getDrive()
  }

  /** List sub-folders in a folder */
  async listFilesInFolder(folderId: string, mimeType?: string): Promise<drive_v3.Schema$File[]> {
    let q = `'${folderId}' in parents and trashed = false`
    if (mimeType) q += ` and mimeType = '${mimeType}'`

    const files: drive_v3.Schema$File[] = []
    let pageToken: string | undefined

    do {
      const res = await this.drive.files.list({
        q,
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime)',
        pageSize: 1000,
        pageToken,
      })
      if (res.data.files) files.push(...res.data.files)
      pageToken = res.data.nextPageToken ?? undefined
    } while (pageToken)

    return files
  }

  /** List audio files in a folder */
  async listAudioFiles(folderId: string): Promise<drive_v3.Schema$File[]> {
    const q = `'${folderId}' in parents and trashed = false and (mimeType contains 'audio/')`
    const files: drive_v3.Schema$File[] = []
    let pageToken: string | undefined

    do {
      const res = await this.drive.files.list({
        q,
        fields: 'nextPageToken, files(id, name, mimeType, size, thumbnailLink)',
        pageSize: 1000,
        pageToken,
      })
      if (res.data.files) files.push(...res.data.files)
      pageToken = res.data.nextPageToken ?? undefined
    } while (pageToken)

    return files
  }

  /**
   * Upload a file to a Drive folder.
   * File is owned by the folder owner (not the service account).
   */
  async uploadFile(
    folderId: string,
    filename: string,
    mimeType: string,
    data: Buffer,
  ): Promise<drive_v3.Schema$File> {
    const res = await this.drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: Readable.from(data),
      },
      fields: 'id, name, mimeType, size',
      supportsAllDrives: true,
    })
    return res.data
  }

  /** Delete a file from Google Drive */
  async deleteFile(fileId: string): Promise<void> {
    await this.drive.files.delete({ fileId, supportsAllDrives: true })
  }

  /**
   * Get a service account access token for frontend to stream
   * audio directly from Google Drive API.
   */
  async getServiceAccountToken(): Promise<{ access_token: string; expires_in: number }> {
    if (cachedToken && cachedToken.expiry > Date.now() + 60_000) {
      return {
        access_token: cachedToken.access_token,
        expires_in: Math.floor((cachedToken.expiry - Date.now()) / 1000),
      }
    }

    const credentials = loadCredentials()
    const jwtClient = new google.auth.JWT(
      credentials.client_email,
      undefined,
      credentials.private_key,
      ['https://www.googleapis.com/auth/drive.readonly'],
    )

    const tokenRes = await jwtClient.authorize()
    const accessToken = tokenRes.access_token!
    const expiryDate = tokenRes.expiry_date || Date.now() + 3600_000

    cachedToken = { access_token: accessToken, expiry: expiryDate }

    return {
      access_token: accessToken,
      expires_in: Math.floor((expiryDate - Date.now()) / 1000),
    }
  }
}
