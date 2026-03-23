import mongoose from 'mongoose'

/**
 * LocalizedText is stored as a Map<string, string> in MongoDB.
 * Keys: 'origin', 'vi', 'en', 'zh', 'ja', 'ko', etc.
 */
const songSchema = new mongoose.Schema({
  fileId: { type: String, required: true, unique: true, index: true },
  title: { type: Map, of: String, default: {} },
  artist: { type: Map, of: String, default: {} },
  lyrics: { type: Map, of: String, default: {} },
  sheet: { type: String, default: '', index: true },
  categories: { type: [String], default: [], index: true },
  status: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  note: { type: String, default: '' },
  listens: { type: Number, default: 0 },
  ext: { type: String, default: '' },
  filename: { type: String, default: '' },
  sampleRate: { type: Number },
  bitDepth: { type: Number },
  channels: { type: Number },
  bitRate: { type: Number },
  duration: { type: Number },
  codec: { type: String },
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret: Record<string, unknown>) {
      ret.id = (ret._id as object).toString()
      delete ret._id
      delete ret.__v
      // Convert Map to plain object for JSON response
      if (ret.title instanceof Map) ret.title = Object.fromEntries(ret.title)
      if (ret.artist instanceof Map) ret.artist = Object.fromEntries(ret.artist)
      if (ret.lyrics instanceof Map) ret.lyrics = Object.fromEntries(ret.lyrics)
    },
  },
})

export const Song = mongoose.models.Song || mongoose.model('Song', songSchema)
