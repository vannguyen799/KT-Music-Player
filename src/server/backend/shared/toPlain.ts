/**
 * Convert a Mongoose lean document to a plain object:
 * - Renames _id → id
 * - Removes __v
 * - Recursively processes subdocument arrays with _id
 */
export function toPlain<T>(doc: any): T {
  if (!doc || typeof doc !== 'object') return doc

  const { _id, __v, ...rest } = doc
  const result: any = { ...rest }

  if (_id) {
    result.id = _id.toString()
  }

  // Recursively process arrays that might contain subdocuments
  for (const key of Object.keys(result)) {
    if (Array.isArray(result[key])) {
      result[key] = result[key].map((item: any) => {
        if (item && typeof item === 'object' && item._id) {
          return toPlain(item)
        }
        return item
      })
    }
  }

  return result as T
}

export function toPlainArray<T>(docs: any[]): T[] {
  return docs.map((d) => toPlain<T>(d))
}
