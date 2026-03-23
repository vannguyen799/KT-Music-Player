/**
 * Device Fingerprint Utility
 *
 * Generates a stable device identifier by hashing hardware signals via Web Crypto API.
 * Resolution order: localStorage → cookie `det_did` → regenerate from hardware.
 */

import { getClientCookie, setClientCookie } from './client-cookies'
import { DET_DEVICE_COOKIE, DET_DEVICE_MAX_AGE } from './tracking-constants'

const STORAGE_KEY = DET_DEVICE_COOKIE

async function hashSignals(signals: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(signals)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function collectSignals(): string {
  const parts: (string | number)[] = [
    screen.width,
    screen.height,
    screen.colorDepth,
    navigator.hardwareConcurrency || 0,
    (navigator as any).deviceMemory || 0,
    navigator.platform,
    navigator.language,
  ]

  try {
    parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone)
  } catch {
    parts.push('unknown')
  }

  return parts.join('|')
}

function persist(deviceId: string) {
  try {
    localStorage.setItem(STORAGE_KEY, deviceId)
  } catch {
    // localStorage may be unavailable
  }
  setClientCookie(DET_DEVICE_COOKIE, deviceId, DET_DEVICE_MAX_AGE)
}

/**
 * Get or generate the device fingerprint.
 * Returns a hex SHA-256 hash string.
 */
export async function getDeviceId(): Promise<string> {
  // 1. Try localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setClientCookie(DET_DEVICE_COOKIE, stored, DET_DEVICE_MAX_AGE)
      return stored
    }
  } catch {
    // localStorage unavailable
  }

  // 2. Try cookie
  const fromCookie = getClientCookie(DET_DEVICE_COOKIE)
  if (fromCookie) {
    try {
      localStorage.setItem(STORAGE_KEY, fromCookie)
    } catch {
      // ignore
    }
    return fromCookie
  }

  // 3. Generate from hardware signals
  const signals = collectSignals()
  const deviceId = await hashSignals(signals)
  persist(deviceId)
  return deviceId
}
