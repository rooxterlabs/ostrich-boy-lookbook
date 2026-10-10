import type { ProjectData, StoredImage } from '../../models/lookbook'
import { categoryEntryType, normalizeEntry } from '../../models/entry'
import { seedProject } from '../../data/seed'
import { getSupabaseClient } from '../supabase/client'
import { writeLookbook } from './editorApi'

const PROJECT_ID = seedProject.id
const BUCKET = 'lookbook-images'
export const lookbookChangeSource = crypto.randomUUID()

interface ImageRow {
  id: string
  entry_id: string
  storage_path: string
  name: string
  caption: string
  sort_order: number
  position_x: number | null
  position_y: number | null
  scale: number | null
  frame_ratio: 'landscape' | 'vertical' | null
}

const notifyChange = () => {
  const channel = new BroadcastChannel('lookbook-changes')
  channel.postMessage({ type: 'saved', source: lookbookChangeSource })
  channel.close()
}

const normalizeProject = (project: ProjectData) => {
  const categories = project.categories.map((category) => ({ ...category, entryType: categoryEntryType(category) }))
  return { ...project, categories, entries: project.entries.map((entry) => normalizeEntry(entry, categories.find((category) => entry.categoryIds.includes(category.id)), project.scenes)) }
}

const throwIfError = (message: string, error?: { message: string } | null) => {
  if (error) throw new Error(`${message} ${error.message}`)
}

async function uploadImage(image: StoredImage) {
  const body = new FormData()
  body.set('action', 'put-image')
  body.set('image', image.blob, image.name)
  body.set('metadata', JSON.stringify({
    id: image.id,
    entry_id: image.entryId,
    name: image.name,
    caption: image.caption,
    sort_order: image.order,
    position_x: image.positionX ?? null,
    position_y: image.positionY ?? null,
    scale: image.scale ?? null,
    frame_ratio: image.frameRatio ?? null,
  }))
  await writeLookbook(body)
}

export async function loadProject(): Promise<ProjectData> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('lookbook_projects').select('document').eq('id', PROJECT_ID).maybeSingle()
  throwIfError('Unable to load the Lookbook.', error)
  if (data?.document) return normalizeProject(data.document as ProjectData)

  return structuredClone(seedProject)
}

export async function saveProject(project: ProjectData) {
  await writeLookbook({ action: 'save-project', project })
  notifyChange()
}

export async function getImages(entryId?: string): Promise<StoredImage[]> {
  const supabase = getSupabaseClient()
  let query = supabase.from('lookbook_images').select('id,entry_id,storage_path,name,caption,sort_order,position_x,position_y,scale,frame_ratio').eq('project_id', PROJECT_ID)
  if (entryId) query = query.eq('entry_id', entryId)
  const { data, error } = await query.order('sort_order')
  throwIfError('Unable to load Lookbook images.', error)

  return Promise.all(((data ?? []) as ImageRow[]).map(async (row) => {
    const { data: blob, error: downloadError } = await supabase.storage.from(BUCKET).download(row.storage_path)
    throwIfError(`Unable to download ${row.name}.`, downloadError)
    return {
      id: row.id,
      entryId: row.entry_id,
      name: row.name,
      caption: row.caption,
      order: row.sort_order,
      blob: blob!,
      storagePath: row.storage_path,
      positionX: row.position_x ?? undefined,
      positionY: row.position_y ?? undefined,
      scale: row.scale ?? undefined,
      frameRatio: row.frame_ratio ?? undefined,
    }
  }))
}

export async function putImage(image: StoredImage) {
  await uploadImage(image)
  notifyChange()
}

export async function deleteImage(id: string) {
  await writeLookbook({ action: 'delete-image', id })
  notifyChange()
}

async function deleteImagesForEntries(entryIds: string[]) {
  if (!entryIds.length) return
  await writeLookbook({ action: 'delete-entry-images', entryIds })
}

export async function replaceAllData(project: ProjectData, images: StoredImage[]) {
  await writeLookbook({ action: 'clear-images' })
  await saveProject(project)
  await Promise.all(images.map(uploadImage))
  notifyChange()
}

export async function saveProjectAndDeleteImages(project: ProjectData, entryIds: string[]) {
  await deleteImagesForEntries(entryIds)
  await saveProject(project)
}
