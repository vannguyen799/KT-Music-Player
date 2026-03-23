import mongoose from 'mongoose'
import { MONGODB_URI } from '$env/static/private'

let connected = false

export async function connectDatabase(): Promise<void> {
  if (connected) return

  const uri = MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not configured')

  await mongoose.connect(uri)
  connected = true
  console.log('MongoDB connected')
}

export { mongoose }
