import { api, setAuthToken } from './api'
import type { User, LoginResponse } from '$lib/types/user'

const STORAGE_KEY = 'kt_player_auth'

export interface StoredAuth {
  token: string
  user: User
}

export function restoreAuth(): StoredAuth | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredAuth
    setAuthToken(parsed.token)
    return parsed
  } catch {
    return null
  }
}

function saveAuth(data: StoredAuth): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  setAuthToken(data.token)
}

function clearAuth(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
  setAuthToken('')
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const result = await api.post<LoginResponse>('/api/auth/login', { username, password })
  saveAuth({ token: result.token, user: result.user })
  return result
}

export async function register(username: string, password: string): Promise<LoginResponse> {
  const result = await api.post<LoginResponse>('/api/auth/register', { username, password })
  saveAuth({ token: result.token, user: result.user })
  return result
}

export async function getMe(): Promise<{ user: User }> {
  return api.get<{ user: User }>('/api/auth/me')
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await api.post('/api/auth/change-password', { oldPassword, newPassword })
}

export function logout(): void {
  clearAuth()
}
