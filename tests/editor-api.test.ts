import { assert as ok, assertEquals, fail } from '@std/assert'
import { createClient } from '@supabase/supabase-js'
import { EDITOR_PASSWORD } from '../src/config/auth.ts'
import { createEditorHandler } from '../supabase/functions/lookbook-editor/handler.ts'

const project = { id: 'ostrich-boy', title: 'Lookbook', updatedAt: '2026-10-10T00:00:00Z', entries: [{ id: 'oskar' }], categories: [], scenes: [] }
const png = new Uint8Array([137, 80, 78, 71])
const assert: typeof ok & { equal: typeof assertEquals; deepEqual: typeof assertEquals; fail: typeof fail } = Object.assign(ok, { equal: assertEquals, deepEqual: assertEquals, fail })

function fixture() {
  const projects = new Map<string, Record<string, unknown>>([['ostrich-boy', { id: 'ostrich-boy', document: structuredClone(project) }], ['other-project', { id: 'other-project', document: { title: 'Untouched' } }]])
  const images = new Map<string, Record<string, unknown>>([['foreign-image', { id: 'foreign-image', project_id: 'other-project', entry_id: 'foreign', storage_path: 'other-project/foreign/image' }]])
  const files = new Map<string, Uint8Array>([['other-project/foreign/image', png]])
  const calls: { method: string; path: string }[] = []
  let failImageInsert = false
  const json = (value: unknown, status = 200) => Response.json(value, { status })
  const mockFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    const path = decodeURIComponent(url.pathname)
    calls.push({ method: request.method, path })
    assert(!path.startsWith('/auth/'), 'There must be no Supabase Auth traffic')
    if (path.startsWith('/rest/v1/')) {
      const table = path.split('/').at(-1)
      assert(table === 'lookbook_projects' || table === 'lookbook_images')
      const rows = table === 'lookbook_projects' ? projects : images
      const matches = (row: Record<string, unknown>) => [...url.searchParams].every(([key, value]) => {
        if (value.startsWith('eq.')) return String(row[key]) === value.slice(3)
        if (value.startsWith('in.(')) return value.slice(4, -1).split(',').map(value => value.replaceAll('"', '')).includes(String(row[key]))
        return true
      })
      if (request.method === 'GET') return json([...rows.values()].filter(matches))
      if (request.method === 'POST') {
        const row = await request.json()
        if (failImageInsert && table === 'lookbook_images') return json({ code: 'FAIL', message: 'Internal details' }, 500)
        if (table === 'lookbook_images' && rows.has(row.id)) return json({ code: '23505', message: 'Duplicate ID' }, 409)
        rows.set(row.id, row)
      } else {
        assert.equal(url.searchParams.get('project_id'), 'eq.ostrich-boy', 'Every image update/delete must be project-scoped')
        for (const [id, row] of rows) {
          if (!matches(row)) continue
          if (request.method === 'DELETE') rows.delete(id)
          else if (request.method === 'PATCH') rows.set(id, { ...row, ...await request.json() })
          else assert.fail(`Unexpected ${request.method}`)
        }
      }
      return new Response(null, { status: 204 })
    }
    if (path.startsWith('/storage/v1/object/lookbook-images')) {
      if (request.method === 'DELETE') {
        const body = await request.json()
        for (const prefix of body.prefixes) { assert(prefix.startsWith('ostrich-boy/')); files.delete(prefix) }
        return json([])
      }
      assert.equal(request.method, 'POST')
      const objectPath = path.slice('/storage/v1/object/lookbook-images/'.length)
      assert(objectPath.startsWith('ostrich-boy/'))
      files.set(objectPath, new Uint8Array(await request.arrayBuffer()))
      return json({ Key: objectPath })
    }
    return assert.fail(`Unexpected ${path}`)
  }
  const client = createClient('https://fixture.invalid', 'fixture-server-key', { global: { fetch: mockFetch }, auth: { persistSession: false, autoRefreshToken: false } })
  const handler = createEditorHandler(() => client)
  const send = (body: Record<string, unknown> | FormData, password: string | null = EDITOR_PASSWORD) => handler(new Request('https://fixture.invalid/functions/v1/lookbook-editor', {
    method: 'POST', headers: { ...(password !== null ? { 'x-lookbook-editor-password': password } : {}), ...(!(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) }, body: body instanceof FormData ? body : JSON.stringify(body),
  }))
  const upload = (details: Record<string, unknown> = {}, type = 'image/png') => {
    const form = new FormData()
    form.set('action', 'put-image')
    form.set('metadata', JSON.stringify({ id: 'new-image', entry_id: 'oskar', name: 'photo.png', caption: 'Caption', sort_order: 0, position_x: null, position_y: null, scale: null, frame_ratio: 'vertical', ...details }))
    form.set('image', new File([png], 'photo.png', { type }))
    return form
  }
  return { send, upload, calls, projects, images, files, failImageInsert: () => { failImageInsert = true } }
}

Deno.test('Anonymous and incorrect-password requests cannot reach database or Storage', async () => {
  const f = fixture()
  assert.equal((await f.send({ action: 'save-project', project }, null)).status, 403)
  assert.equal((await f.send({ action: 'clear-images' }, 'incorrect')).status, 403)
  assert.equal((await f.send(f.upload(), 'incorrect')).status, 403)
  assert.deepEqual(f.calls, [])
})

Deno.test('Editor saves target project only; unknown actions and foreign project IDs are rejected', async () => {
  const f = fixture()
  assert.equal((await f.send({ action: 'save-project', project: { ...project, title: 'Edited' } })).status, 200)
  assert.equal((f.projects.get('ostrich-boy')!.document as typeof project).title, 'Edited')
  assert.equal((await f.send({ action: 'save-project', project: { ...project, id: 'other-project' } })).status, 400)
  assert.equal((await f.send({ action: 'arbitrary-sql', table: 'auth.users' })).status, 400)
  assert.deepEqual(f.projects.get('other-project'), { id: 'other-project', document: { title: 'Untouched' } })
})

Deno.test('Image upload, replacement, caption/crop/order updates and deletion preserve foreign content', async () => {
  const f = fixture()
  assert.equal((await f.send(f.upload({ storage_path: 'other-project/steal', project_id: 'other-project' }))).status, 200)
  assert(f.files.has('ostrich-boy/oskar/new-image'))
  assert.equal(f.images.get('new-image')!.project_id, 'ostrich-boy')
  assert.equal((await f.send(f.upload({ caption: 'Updated', sort_order: 4, position_x: 30, position_y: 40, scale: 1.2, frame_ratio: 'landscape' }))).status, 200)
  assert.equal(f.images.get('new-image')!.sort_order, 4)
  assert.equal(f.images.get('new-image')!.caption, 'Updated')
  assert.equal(f.images.get('new-image')!.position_x, 30)
  assert.equal(f.images.get('new-image')!.frame_ratio, 'landscape')
  assert.equal((await f.send({ action: 'delete-image', id: 'new-image' })).status, 200)
  assert(!f.images.has('new-image'))
  assert(!f.files.has('ostrich-boy/oskar/new-image'))
  assert(f.images.has('foreign-image'))
  assert(f.files.has('other-project/foreign/image'))
})

Deno.test('Entry deletion and restore cleanup are limited to Lookbook images', async () => {
  const f = fixture()
  await f.send(f.upload({ id: 'entry-image-one' }))
  await f.send(f.upload({ id: 'entry-image-two' }))
  assert.equal((await f.send({ action: 'delete-entry-images', entryIds: ['oskar'] })).status, 200)
  assert.deepEqual([...f.images.keys()], ['foreign-image'])
  await f.send(f.upload())
  assert.equal((await f.send({ action: 'clear-images' })).status, 200)
  assert.deepEqual([...f.images.keys()], ['foreign-image'])
  assert.deepEqual([...f.files.keys()], ['other-project/foreign/image'])
})

Deno.test('Invalid files, traversal paths, nonexistent entries and foreign image IDs are rejected before writes', async () => {
  const f = fixture()
  for (const body of [f.upload({}, 'text/plain'), f.upload({ entry_id: '../outside' }), f.upload({ entry_id: 'missing' }), f.upload({ id: 'foreign-image' }), f.upload({ sort_order: -1 }), f.upload({ position_x: 'bad' })]) {
    assert.equal((await f.send(body)).status, 400)
  }
  assert.equal((await f.send({ action: 'delete-image', id: 'foreign-image' })).status, 200)
  assert(f.calls.every(call => call.method === 'GET'))
  assert.deepEqual([...f.images.keys()], ['foreign-image'])
})

Deno.test('New files are cleaned up when metadata insertion fails; errors stay generic', async () => {
  const f = fixture()
  f.failImageInsert()
  const response = await f.send(f.upload())
  assert.equal(response.status, 500)
  assert.equal((await response.json()).error, 'Unable to save Lookbook changes. Please try again.')
  assert(!f.files.has('ostrich-boy/oskar/new-image'))
})
