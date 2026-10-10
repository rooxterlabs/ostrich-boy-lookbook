import type { SupabaseClient } from '@supabase/supabase-js'
import { EDITOR_PASSWORD } from '../../../src/config/auth.ts'

const PROJECT_ID = 'ostrich-boy'
const BUCKET = 'lookbook-images'
const MAX_IMAGE_SIZE = 20 * 1024 * 1024
const MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'])
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, content-type, x-lookbook-editor-password',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
}

class InvalidRequest extends Error {}

const requireValue = (condition: unknown, message: string) => {
  if (!condition) throw new InvalidRequest(message)
}

function record(value: unknown): Record<string, unknown> {
  requireValue(value && typeof value === 'object' && !Array.isArray(value), 'Invalid request.')
  return value as Record<string, unknown>
}

function identifier(value: unknown): string {
  requireValue(typeof value === 'string' && /^[a-zA-Z0-9_-]{1,200}$/.test(value), 'Invalid identifier.')
  return value as string
}

function nullableNumber(value: unknown): number | null {
  requireValue(value == null || (typeof value === 'number' && Number.isFinite(value)), 'Invalid image transform.')
  return value == null ? null : value as number
}

function check(error: { message: string } | null) {
  if (error) throw new Error('The database or image operation failed.')
}

function scopedPath(path: string) {
  requireValue(path.startsWith(`${PROJECT_ID}/`) && !path.split('/').some(part => part === '.' || part === '..'), 'Invalid image path.')
  return path
}

async function putImage(client: SupabaseClient, form: FormData) {
  const metadata = record(JSON.parse(String(form.get('metadata'))))
  const image = form.get('image')
  const id = identifier(metadata.id)
  const entryId = identifier(metadata.entry_id)
  requireValue(image instanceof File && image.size > 0 && image.size <= MAX_IMAGE_SIZE && MIME_TYPES.has(image.type), 'Choose a supported image under 20 MB.')
  requireValue(typeof metadata.name === 'string' && typeof metadata.caption === 'string', 'Invalid image details.')
  requireValue(Number.isInteger(metadata.sort_order) && Number(metadata.sort_order) >= 0, 'Invalid image order.')
  requireValue(metadata.frame_ratio == null || metadata.frame_ratio === 'landscape' || metadata.frame_ratio === 'vertical', 'Invalid image frame.')

  const { data: project, error: projectError } = await client.from('lookbook_projects').select('document').eq('id', PROJECT_ID).maybeSingle()
  check(projectError)
  requireValue(project?.document?.entries?.some((entry: { id: string }) => entry.id === entryId), 'The image entry was not found.')
  const { data: existing, error: imageError } = await client.from('lookbook_images').select('project_id,entry_id,storage_path').eq('id', id).maybeSingle()
  check(imageError)
  requireValue(!existing || (existing.project_id === PROJECT_ID && existing.entry_id === entryId), 'The image belongs to another entry or project.')
  // Existing paths come from the database, never from caller-supplied paths.
  const path = scopedPath(existing?.storage_path ?? `${PROJECT_ID}/${entryId}/${id}`)
  const details = {
    id, project_id: PROJECT_ID, entry_id: entryId, storage_path: path,
    name: metadata.name, caption: metadata.caption, sort_order: metadata.sort_order,
    position_x: nullableNumber(metadata.position_x), position_y: nullableNumber(metadata.position_y),
    scale: nullableNumber(metadata.scale), frame_ratio: metadata.frame_ratio ?? null,
  }
  const file = image as File
  const { error: uploadError } = await client.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: true })
  check(uploadError)
  const { error: metadataError } = existing
    ? await client.from('lookbook_images').update(details).eq('project_id', PROJECT_ID).eq('id', id)
    : await client.from('lookbook_images').insert(details)
  if (metadataError && !existing) await client.storage.from(BUCKET).remove([path])
  check(metadataError)
}

async function removeImages(client: SupabaseClient, filter: { id?: string; entryIds?: string[] }) {
  // Scope every metadata operation to this project and every file to this bucket.
  const rows: { id: string; storage_path: string }[] = []
  for (let offset = 0; ; offset += 1000) {
    let query = client.from('lookbook_images').select('id,storage_path').eq('project_id', PROJECT_ID)
    if (filter.id) query = query.eq('id', filter.id)
    if (filter.entryIds) query = query.in('entry_id', filter.entryIds)
    const { data, error } = await query.order('id').range(offset, offset + 999)
    check(error)
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  const paths = rows.map(row => scopedPath(row.storage_path))
  for (let offset = 0; offset < rows.length; offset += 100) {
    const { error: storageError } = await client.storage.from(BUCKET).remove(paths.slice(offset, offset + 100))
    check(storageError)
    const { error: deleteError } = await client.from('lookbook_images').delete().eq('project_id', PROJECT_ID).in('id', rows.slice(offset, offset + 100).map(row => row.id))
    check(deleteError)
  }
}

export function createEditorHandler(getClient: () => SupabaseClient) {
  return async (request: Request): Promise<Response> => {
    const reply = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: cors })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405)
    if (request.headers.get('x-lookbook-editor-password') !== EDITOR_PASSWORD) return reply({ error: 'Incorrect password' }, 403)
    if (Number(request.headers.get('content-length')) > MAX_IMAGE_SIZE + 1024 * 1024) return reply({ error: 'Request is too large.' }, 413)
    try {
      const multipart = request.headers.get('content-type')?.startsWith('multipart/form-data')
      const form = multipart ? await request.formData() : undefined
      const body = form ? { action: form.get('action') } : record(await request.json())
      requireValue(['save-project', 'put-image', 'delete-image', 'delete-entry-images', 'clear-images'].includes(String(body.action)), 'Unknown operation.')
      if (body.action === 'save-project') {
        const project = record(body.project)
        requireValue(project.id === PROJECT_ID && typeof project.title === 'string' && typeof project.updatedAt === 'string' && !Number.isNaN(Date.parse(project.updatedAt)) && Array.isArray(project.entries) && Array.isArray(project.categories) && Array.isArray(project.scenes), 'Invalid Lookbook project.')
        const { error } = await getClient().from('lookbook_projects').upsert({ id: PROJECT_ID, title: project.title, document: project, updated_at: project.updatedAt })
        check(error)
      } else if (body.action === 'put-image') {
        requireValue(form, 'An image upload is required.')
        await putImage(getClient(), form!)
      } else if (body.action === 'delete-image') {
        await removeImages(getClient(), { id: identifier(body.id) })
      } else if (body.action === 'delete-entry-images') {
        requireValue(Array.isArray(body.entryIds) && body.entryIds.length > 0 && body.entryIds.length <= 1000, 'Invalid entry list.')
        await removeImages(getClient(), { entryIds: (body.entryIds as unknown[]).map(identifier) })
      } else {
        await removeImages(getClient(), {})
      }
      return reply({ ok: true })
    } catch (error) {
      if (error instanceof InvalidRequest || error instanceof SyntaxError) return reply({ error: error instanceof InvalidRequest ? error.message : 'Invalid request.' }, 400)
      return reply({ error: 'Unable to save Lookbook changes. Please try again.' }, 500)
    }
  }
}
