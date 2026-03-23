let authToken = ''

export function setAuthToken(token: string) {
  authToken = token
}

export function getAuthToken(): string {
  return authToken
}

async function request<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const res = await fetch(url, { ...opts, headers })
  const json = await res.json()

  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed: ${res.status}`)
  }

  return json.data as T
}

export const api = {
  get<T>(url: string): Promise<T> {
    return request<T>(url)
  },
  post<T>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
  },
  put<T>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined })
  },
  del<T>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined })
  },
}
