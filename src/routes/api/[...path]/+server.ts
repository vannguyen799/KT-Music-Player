import { app } from '$backend/app'
import { createSvelteKitDispatcher } from '@truxie/sveltekit'

const handler = createSvelteKitDispatcher({ app })

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
