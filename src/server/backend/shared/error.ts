import { AppError } from 'truxie'
import { dev } from '$app/environment'

export interface ClassifiedError {
  statusCode: number
  message: string
  status?: string | null
}

export function classifyError(error: unknown): ClassifiedError {
  if (error instanceof AppError) {
    return { statusCode: error.statusCode, message: error.message, status: error.status }
  }

  // JWT errors
  if (error instanceof Error && error.name === 'JsonWebTokenError') {
    return { statusCode: 401, message: 'Invalid token' }
  }
  if (error instanceof Error && error.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Token expired' }
  }

  // Generic errors
  const rawMessage = error instanceof Error ? error.message : 'Internal server error'
  console.error('Unhandled error:', error)

  return {
    statusCode: 500,
    message: dev ? rawMessage : 'Internal server error',
  }
}
