import type { ExecutionContext, ExceptionFilter } from 'truxie'
import { classifyError } from '../shared/error'

export class AppErrorFilter implements ExceptionFilter {
  catch(error: unknown, ctx: ExecutionContext): unknown {
    const classified = classifyError(error)

    // Store statusCode in context metadata so the adapter can read it
    ctx.setData('__statusCode', classified.statusCode)

    return {
      success: false,
      message: classified.message,
      status: classified.status ?? null,
    }
  }
}
