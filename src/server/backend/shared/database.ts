import mongoose from 'mongoose'
import { env } from '$env/dynamic/private'

let connected = false

export async function connectDatabase(): Promise<void> {
  if (connected) return

  const uri = env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not configured')

  await mongoose.connect(uri)
  connected = true
  console.log('MongoDB connected')
}

export { mongoose }
