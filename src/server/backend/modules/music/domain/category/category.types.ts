export interface ICategory {
  id: string
  name: string
  folderId: string
  parentId: string | null
  disabled: boolean
}
