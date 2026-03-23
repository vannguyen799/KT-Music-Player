import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const playlistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  notes: { type: String, default: '' },
  hidden: { type: Boolean, default: false },
  songList: [{ type: String }],
}, { _id: false })

const playerConfigSchema = new mongoose.Schema({
  volume: { type: Number, default: 0.7 },
  speed: { type: Number, default: 1 },
  loopMode: { type: String, enum: ['none', 'all', 'one'], default: 'all' },
  isRandom: { type: Boolean, default: false },
  playerPosition: { type: String, enum: ['bottom', 'top'], default: 'bottom' },
  showLyrics: { type: Boolean, default: false },
}, { _id: false })

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: Number, default: 1 }, // 0=admin, 1=user, 2=staff, 3=guest
  favorite: [{ type: String }],
  playlists: [playlistSchema],
  playerConfig: { type: playerConfigSchema, default: undefined },
  lastAccess: { type: Date, default: Date.now },
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret: Record<string, unknown>) {
      ret.id = (ret._id as object).toString()
      delete ret._id
      delete ret.__v
      delete ret.password
    },
  },
})

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 10)
})

export const User = mongoose.models.User || mongoose.model('User', userSchema)
