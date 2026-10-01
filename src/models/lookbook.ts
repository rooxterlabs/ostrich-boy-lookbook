export type WorkflowStatus = 'draft' | 'submitted' | 'approved'
export type Role = 'locked' | 'viewer' | 'editor'
export type EntryType = 'character' | 'location' | 'general'

export interface Category {
  id: string
  name: string
  entryType?: EntryType
  parentId?: string
  order: number
  archived: boolean
  status: WorkflowStatus
}

export interface ProductionItem {
  id: string
  name: string
  category: string
  notes: string
}

export interface ItemGroup {
  id: string
  name: string
  bullets: { id: string; text: string }[]
}

export interface EntryScene {
  id: string
  number: string
  title: string
  location: string
  description: string
  mood: string
  symbolism: string
  conflict: string
  emotion: string
}

export interface LookbookEntry {
  id: string
  type: EntryType
  categoryIds: string[]
  title: string
  subtext?: string
  itemGroups?: ItemGroup[]
  sceneList?: EntryScene[]
  role: string
  age: string
  description: string
  fields: Record<string, string>
  notes: string
  status: WorkflowStatus
  sceneIds: string[]
  linkedEntryIds: string[]
  items: ProductionItem[]
  imageIds: string[]
  primaryImageId?: string
  archived: boolean
  updatedAt: string
}

export interface Scene {
  id: string
  number: number
  title: string
  characterIds: string[]
  locationIds: string[]
  notes: string
  status: WorkflowStatus
}

export interface ProjectData {
  id: string
  title: string
  categories: Category[]
  entries: LookbookEntry[]
  scenes: Scene[]
  updatedAt: string
}

export interface StoredImage {
  id: string
  entryId: string
  name: string
  caption: string
  order: number
  blob: Blob
  positionX?: number
  positionY?: number
  scale?: number
  frameRatio?: ImageFrameRatio
}

export type ImageFrameRatio = 'landscape' | 'vertical'
