import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  folderId: { type: String, required: true, unique: true, index: true },
  parentId: { type: String, default: null, index: true },
  disabled: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret: Record<string, unknown>) {
      ret.id = (ret._id as object).toString()
      delete ret._id
      delete ret.__v
    },
  },
})

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema)
