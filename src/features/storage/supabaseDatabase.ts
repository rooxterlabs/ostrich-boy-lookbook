import type { ProjectData, StoredImage } from '../../models/lookbook'
import { categoryEntryType, normalizeEntry } from '../../models/entry'
import { seedProject } from '../../data/seed'
import { getSupabaseClient } from '../supabase/client'

const PROJECT_ID = seedProject.id
const BUCKET = 'lookbook-images'

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
  channel.postMessage('saved')
  channel.close()
}

const normalizeProject = (project: ProjectData) => {
  const categories = project.categories.map((category) => ({ ...category, entryType: categoryEntryType(category) }))
  return { ...project, categories, entries: project.entries.map((entry) => normalizeEntry(entry, categories.find((category) => entry.categoryIds.includes(category.id)), project.scenes)) }
}

const throwIfError = (message: string, error?: { message: string } | null) => {
  if (error) throw new Error(`${message} ${error.message}`)
}

const imagePath = (image: StoredImage) => {
  const safeName = image.name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'image'
  return `${PROJECT_ID}/${image.entryId}/${image.id}-${safeName}`
}

async function uploadImage(image: StoredImage) {
  const supabase = getSupabaseClient()
  const path = imagePath(image)
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, image.blob, { contentType: image.blob.type || undefined, upsert: true })
  throwIfError('Unable to upload an image.', uploadError)
  const { error: metadataError } = await supabase.from('lookbook_images').upsert({
    id: image.id,
    project_id: PROJECT_ID,
    entry_id: image.entryId,
    storage_path: path,
    name: image.name,
    caption: image.caption,
    sort_order: image.order,
    position_x: image.positionX ?? null,
    position_y: image.positionY ?? null,
    scale: image.scale ?? null,
    frame_ratio: image.frameRatio ?? null,
  })
  throwIfError('Unable to save image details.', metadataError)
}

export async function loadProject(): Promise<ProjectData> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('lookbook_projects').select('document').eq('id', PROJECT_ID).maybeSingle()
  throwIfError('Unable to load the Lookbook.', error)
  if (data?.document) return normalizeProject(data.document as ProjectData)

  return structuredClone(seedProject)
}

export async function saveProject(project: ProjectData) {
  const { error } = await getSupabaseClient().from('lookbook_projects').upsert({
    id: project.id,
    title: project.title,
    document: project,
    updated_at: project.updatedAt,
  })
  throwIfError('Unable to save Lookbook changes.', error)
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
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('lookbook_images').select('storage_path').eq('id', id).maybeSingle()
  throwIfError('Unable to find the image.', error)
  if (data?.storage_path) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([data.storage_path])
    throwIfError('Unable to remove the image file.', storageError)
  }
  const { error: deleteError } = await supabase.from('lookbook_images').delete().eq('id', id)
  throwIfError('Unable to remove the image details.', deleteError)
  notifyChange()
}

async function deleteImagesForEntries(entryIds: string[]) {
  if (!entryIds.length) return
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('lookbook_images').select('storage_path').in('entry_id', entryIds)
  throwIfError('Unable to find entry images.', error)
  const paths = (data ?? []).map((row) => row.storage_path)
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths)
    throwIfError('Unable to remove entry image files.', storageError)
  }
  const { error: deleteError } = await supabase.from('lookbook_images').delete().in('entry_id', entryIds)
  throwIfError('Unable to remove entry image details.', deleteError)
}

export async function replaceAllData(project: ProjectData, images: StoredImage[]) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('lookbook_images').select('storage_path').eq('project_id', PROJECT_ID)
  throwIfError('Unable to prepare the restore.', error)
  const paths = (data ?? []).map((row) => row.storage_path)
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths)
    throwIfError('Unable to replace image files.', storageError)
  }
  const { error: deleteError } = await supabase.from('lookbook_images').delete().eq('project_id', PROJECT_ID)
  throwIfError('Unable to replace image details.', deleteError)
  await saveProject(project)
  await Promise.all(images.map(uploadImage))
  notifyChange()
}

export async function saveProjectAndDeleteImages(project: ProjectData, entryIds: string[]) {
  await deleteImagesForEntries(entryIds)
  await saveProject(project)
}
