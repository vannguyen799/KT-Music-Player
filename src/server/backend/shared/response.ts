export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
}

export function sendSuccess<T>(data?: T, message?: string): ApiResponse<T> {
  const body: ApiResponse<T> = { success: true }
  if (data !== undefined && data !== null) body.data = data
  if (message) body.message = message
  return body
}
