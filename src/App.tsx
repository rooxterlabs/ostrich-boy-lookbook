import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ListEditorDialog, type ListSavePayload } from './components/ListEditorDialog'
import type { GalleryChanges } from './components/ImageGallery'
import { Header } from './components/Header'
import { LookbookNavigation } from './components/LookbookNavigation'
import { ModeSwitchDialog } from './components/ModeSwitchDialog'
import { authenticateEditor, endEditorSession } from './features/auth/auth'
import { getSupabaseClient } from './features/supabase/client'
import { deleteImage, getImages, loadProject, putImage, saveProject, saveProjectAndDeleteImages } from './features/storage/supabaseDatabase'
import { categoryEntryType, newEntry } from './models/entry'
import type { Category, LookbookEntry, ProjectData, Role, StoredImage } from './models/lookbook'
import { EntryPage } from './pages/EntryPage'
import { FolderManagerPage } from './pages/FolderManagerPage'
import { FolderPage } from './pages/FolderPage'
import { MasterItemListPage } from './pages/MasterItemListPage'
import { MasterSceneListPage } from './pages/MasterSceneListPage'
import { MovieInfoPage } from './pages/MovieInfoPage'

type Route = { page: 'items' | 'scenes' | 'folders' | 'movie-info' } | { page: 'folder'; id: string } | { page: 'entry'; id: string }

// Update this label when releasing a new lookbook version.
const APP_VERSION = 'v01.13'

const DEFAULT_ENTRY_ID = ''
const DEFAULT_CATEGORY_ID = ''
const RETIRED_SEED_CATEGORY_IDS = new Set(['category-props', 'category-costumes', 'category-hair-makeup', 'category-production-design', 'category-references'])

export default function App() {
  const [role, setRoleState] = useState<Role>('viewer')
  const [editing, setEditing] = useState<'category' | 'entry'>()
  const [enteringEditor, setEnteringEditor] = useState(false)
  const [switchingToView, setSwitchingToView] = useState(false)
  const [project, setProject] = useState<ProjectData>()
  const [images, setImages] = useState<StoredImage[]>([])
  const [route, setRoute] = useState<Route>({ page: 'entry', id: DEFAULT_ENTRY_ID })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const projectRef = useRef<ProjectData | undefined>(undefined)

  useEffect(() => { projectRef.current = project }, [project])
  useEffect(() => {
    const { data: { subscription } } = getSupabaseClient().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setRoleState('viewer')
        setEditing(undefined)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const refreshImages = useCallback(async () => setImages(await getImages()), [])
  useEffect(() => { loadProject().then(async (data) => [data, await getImages()] as const).then(([data, storedImages]) => { setProject(data); setImages(storedImages); setError('') }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load the lookbook.')).finally(() => setLoading(false)) }, [])
  useEffect(() => {
    const channel = new BroadcastChannel('lookbook-changes')
    channel.onmessage = () => {
      loadProject().then(async (data) => { setProject(data); setImages(await getImages()) }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to refresh the lookbook.'))
    }
    return () => channel.close()
  }, [])
  const setRole = (next: Role) => setRoleState(next)
  const persist = async (next: ProjectData) => { const stamped = { ...next, updatedAt: new Date().toISOString() }; setProject(stamped); try { await saveProject(stamped); setError('') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save changes.') } }
  const visibleCategories = useMemo(() => project ? project.categories.filter((category) => !RETIRED_SEED_CATEGORY_IDS.has(category.id) && !category.archived && (role === 'editor' || category.status === 'approved')).sort((a, b) => a.order - b.order) : [], [project, role])
  const visibleEntries = useMemo(() => project ? project.entries.filter((entry) => !entry.archived && (role === 'editor' || entry.status === 'approved')) : [], [project, role])
  const visibleScenes = useMemo(() => project ? project.scenes.filter((scene) => role === 'editor' || scene.status === 'approved') : [], [project, role])
  useEffect(() => {
    if (route.page !== 'entry' || route.id) return
    const firstCategory = visibleCategories.find((category) => !category.parentId) ?? visibleCategories[0]
    if (!firstCategory) return
    const firstEntry = visibleEntries.find((candidate) => candidate.categoryIds.includes(firstCategory.id))
    setRoute(firstEntry ? { page: 'entry', id: firstEntry.id } : { page: 'folder', id: firstCategory.id })
  }, [role, route, visibleCategories, visibleEntries])

  if (loading) return <main className="state-page"><div className="loading-mark" /><p>Loading lookbook…</p></main>
  if (!project) return <main className="state-page"><h1>Lookbook unavailable</h1><p>{error || 'Browser storage could not be opened.'}</p><button className="button" onClick={() => location.reload()}>Try again</button></main>

  const folder = route.page === 'folder' ? visibleCategories.find((category) => category.id === route.id) : undefined
  const entry = route.page === 'entry' ? visibleEntries.find((candidate) => candidate.id === route.id) : undefined
  const home = () => setRoute(visibleCategories[0] ? { page: 'folder', id: visibleCategories[0].id } : { page: 'entry', id: '' })
  const activeEntry = route.page === 'entry' ? visibleEntries.find((candidate) => candidate.id === route.id) : undefined
  const activeCategoryId = route.page === 'movie-info' ? '' : route.page === 'folder' ? route.id : activeEntry?.categoryIds.find((id) => visibleCategories.some((category) => category.id === id)) ?? visibleCategories[0]?.id ?? DEFAULT_CATEGORY_ID
  const canViewerAccessCurrentRoute = route.page === 'folders'
    ? false
    : route.page === 'folder'
      ? project.categories.some((category) => category.id === route.id && category.status === 'approved' && !category.archived && !RETIRED_SEED_CATEGORY_IDS.has(category.id))
      : route.page === 'entry'
        ? project.entries.some((candidate) => candidate.id === route.id && candidate.status === 'approved' && !candidate.archived)
        : true
  const switchMode = () => {
    if (role === 'viewer') { setEnteringEditor(true); return }
    setEditing(undefined)
    if (!canViewerAccessCurrentRoute) home()
    setSwitchingToView(true)
    void endEditorSession().finally(() => { setRole('viewer'); setSwitchingToView(false) })
  }
  const navigateCategory = (id: string) => {
    const firstEntry = visibleEntries.find((candidate) => candidate.categoryIds.includes(id))
    setRoute(firstEntry ? { page: 'entry', id: firstEntry.id } : { page: 'folder', id })
  }
  const batchSaveList = async (payload: ListSavePayload) => {
    if (role !== 'editor' || !editing) return
    let next = structuredClone(project)
    const allRemovedEntries: string[] = []

    // 1. Deletes
    for (const id of payload.deletedIds) {
      if (editing === 'category') {
        const removed = new Set([id])
        let size = 0
        while (size !== removed.size) { size = removed.size; next.categories.forEach((item) => { if (item.parentId && removed.has(item.parentId)) removed.add(item.id) }) }
        const removedEntries = next.entries.filter((item) => item.categoryIds.some((cid) => removed.has(cid))).map((item) => item.id)
        allRemovedEntries.push(...removedEntries)
        next.categories = next.categories.filter((item) => !removed.has(item.id))
        next.entries = next.entries.filter((item) => !removedEntries.includes(item.id)).map((item) => ({ ...item, linkedEntryIds: item.linkedEntryIds.filter((lid) => !removedEntries.includes(lid)) }))
        next.scenes = next.scenes.map((scene) => ({ ...scene, characterIds: scene.characterIds.filter((cid) => !removedEntries.includes(cid)), locationIds: scene.locationIds.filter((lid) => !removedEntries.includes(lid)) }))
      } else {
        allRemovedEntries.push(id)
        next.entries = next.entries.filter((item) => item.id !== id).map((item) => ({ ...item, linkedEntryIds: item.linkedEntryIds.filter((lid) => lid !== id) }))
        next.scenes = next.scenes.map((scene) => ({ ...scene, characterIds: scene.characterIds.filter((cid) => cid !== id), locationIds: scene.locationIds.filter((lid) => lid !== id) }))
      }
    }

    // 2. Adds — create new items for entries with temp IDs
    const newIdMap = new Map<string, string>()
    for (const item of payload.items) {
      if (!item.id.startsWith('__new-')) continue
      if (editing === 'category') {
        const created: Category = { id: `category-${crypto.randomUUID()}`, name: item.name, entryType: categoryEntryType({ id: '', name: item.name, order: 0, archived: false, status: 'approved' }), order: next.categories.length, archived: false, status: 'approved' }
        next.categories = [...next.categories, created]
        newIdMap.set(item.id, created.id)
      } else {
        const category = next.categories.find((c) => c.id === activeCategoryId)
        if (!category) continue
        const created = newEntry(item.name, category)
        next.entries = [...next.entries, created]
        newIdMap.set(item.id, created.id)
      }
    }

    // 3. Renames — update names for existing items whose names changed
    for (const item of payload.items) {
      if (item.id.startsWith('__new-')) continue
      if (editing === 'category') {
        const existing = next.categories.find((c) => c.id === item.id)
        if (existing && existing.name !== item.name) next.categories = next.categories.map((c) => c.id === item.id ? { ...c, name: item.name } : c)
      } else {
        const existing = next.entries.find((e) => e.id === item.id)
        if (existing && existing.title !== item.name) next.entries = next.entries.map((e) => e.id === item.id ? { ...e, title: item.name, updatedAt: new Date().toISOString() } : e)
      }
    }

    // 4. Reorder to match the payload order
    const desiredOrder = payload.items.map((item) => newIdMap.get(item.id) ?? item.id)
    if (editing === 'category') {
      const orderMap = new Map(desiredOrder.map((id, i) => [id, i]))
      next.categories = next.categories.map((c) => ({ ...c, order: orderMap.has(c.id) ? orderMap.get(c.id)! : c.order }))
    } else {
      const inCategory = new Set(desiredOrder)
      const before: typeof next.entries = []
      const inCatEntries: typeof next.entries = []
      const after: typeof next.entries = []
      let foundFirst = false
      let pastLast = false
      for (const entry of next.entries) {
        if (inCategory.has(entry.id)) { foundFirst = true; inCatEntries.push(entry) }
        else if (!foundFirst) before.push(entry)
        else { pastLast = true; after.push(entry) }
      }
      // Also capture any entries that weren't in the original array position range
      if (!pastLast && !foundFirst) {
        // No entries matched — just append new ones at the end
        for (const entry of next.entries) { if (inCategory.has(entry.id)) inCatEntries.push(entry); else before.push(entry) }
      }
      const sorted = desiredOrder.map((id) => inCatEntries.find((e) => e.id === id)).filter(Boolean) as typeof next.entries
      next.entries = [...before, ...sorted, ...after]
    }

    next = { ...next, updatedAt: new Date().toISOString() }
    await saveProjectAndDeleteImages(next, allRemovedEntries)
    setProject(next)
    if (allRemovedEntries.length) await refreshImages()
    if (payload.deletedIds.length) {
      const category = next.categories.find((item) => item.id === activeCategoryId) ?? [...next.categories].sort((a, b) => a.order - b.order)[0]
      if ((route.page === 'entry' && allRemovedEntries.includes(route.id)) || (route.page === 'folder' && !next.categories.some((item) => item.id === route.id))) setRoute(category ? { page: 'folder', id: category.id } : { page: 'entry', id: '' })
    }
  }
  const content = (() => {
    if (route.page === 'movie-info') return <MovieInfoPage />
    if (route.page === 'folder' && folder) return <FolderPage folder={folder} childFolders={visibleCategories.filter((category) => category.parentId === folder.id)} entries={visibleEntries.filter((candidate) => candidate.categoryIds.includes(folder.id))} images={images} role={role} onHome={home} onFolder={(id) => setRoute({ page: 'folder', id })} onEntry={(id) => setRoute({ page: 'entry', id })} onCreate={(title, type) => { const created = newEntry(title, folder, type); void persist({ ...project, entries: [...project.entries, created] }); setRoute({ page: 'entry', id: created.id }) }} />
    if (route.page === 'entry' && entry) {
      const entryFolder = visibleCategories.find((category) => entry.categoryIds.includes(category.id))
      const entryImages = images.filter((image) => image.entryId === entry.id).sort((a, b) => a.order - b.order)
      const updateEntry = async (next: LookbookEntry) => {
        const currentProject = projectRef.current ?? project
        const stamped = { ...currentProject, entries: currentProject.entries.map((candidate) => candidate.id === next.id ? next : candidate), updatedAt: new Date().toISOString() }
        await saveProject(stamped)
        projectRef.current = stamped
        setProject(stamped)
      }
      const deleteEntry = async () => {
        const next = { ...project,
          entries: project.entries.filter((candidate) => candidate.id !== entry.id).map((candidate) => ({ ...candidate, linkedEntryIds: candidate.linkedEntryIds.filter((id) => id !== entry.id) })),
          scenes: project.scenes.map((scene) => ({ ...scene, characterIds: scene.characterIds.filter((id) => id !== entry.id), locationIds: scene.locationIds.filter((id) => id !== entry.id) })),
          updatedAt: new Date().toISOString(),
        }
        await saveProjectAndDeleteImages(next, [entry.id])
        setProject(next)
        await refreshImages()
        setRoute(entryFolder ? { page: 'folder', id: entryFolder.id } : { page: 'entry', id: '' })
      }
      const saveEntry = async (next: LookbookEntry, gallery: GalleryChanges) => {
        // Keep draft image IDs stable so a failed save can be retried without duplicating uploads.
        const ordered = gallery.images.map((image, order) => ({ ...image, entryId: entry.id, order }))
        for (const image of ordered) {
          if (gallery.upserts.some((changed) => changed.id === image.id) || image.order !== gallery.images.find((candidate) => candidate.id === image.id)?.order) await putImage(image)
        }
        for (const id of gallery.deletedIds) await deleteImage(id)
        await updateEntry({ ...next, imageIds: ordered.map((image) => image.id), primaryImageId: ordered.some((image) => image.id === next.primaryImageId) ? next.primaryImageId : ordered[0]?.id })
        setImages((current) => [...current.filter((image) => image.entryId !== entry.id), ...ordered])
      }
      return <EntryPage key={entry.id} entry={entry} folder={entryFolder} scenes={visibleScenes} images={entryImages} role={role} onSave={saveEntry} onDelete={deleteEntry} />
    }
    if (route.page === 'items') return <MasterItemListPage entries={visibleEntries} onHome={home} onEntry={(id) => setRoute({ page: 'entry', id })} />
    if (route.page === 'scenes') return <MasterSceneListPage scenes={visibleScenes} entries={visibleEntries} role={role} onHome={home} onChange={(scenes) => void persist({ ...project, scenes })} />
    if (route.page === 'folders' && role === 'editor') return <FolderManagerPage categories={project.categories} onHome={home} onChange={(categories: Category[]) => void persist({ ...project, categories })} />
    return <main className="page-shell"><div className="empty-state"><h1>{visibleCategories.length ? 'Select a category' : 'Your lookbook is empty.'}</h1><p>{role === 'editor' ? 'Use EDIT to add and manage your categories and entries.' : 'New material will appear here when it is added.'}</p></div></main>
  })()

  return <div className="app-shell"><Header role={role} onMovieInfo={() => setRoute({ page: 'movie-info' })} onHome={home} onSwitchMode={switchMode} switchingMode={switchingToView} /><LookbookNavigation categories={visibleCategories.filter((category) => !category.parentId)} entries={visibleEntries} activeCategoryId={activeCategoryId} activeEntryId={activeEntry?.id} role={role} onCategory={navigateCategory} onEntry={(id) => setRoute({ page: 'entry', id })} onEditCategories={() => setEditing('category')} onEditEntries={() => setEditing('entry')} />{error && <div className="error-banner" role="alert">{error}</div>}{content}<footer><span>{APP_VERSION}</span></footer>{editing && role === 'editor' && <ListEditorDialog noun={editing} categoryName={editing === 'entry' ? (visibleCategories.find((c) => c.id === activeCategoryId)?.name ?? undefined) : undefined} items={editing === 'category' ? [...project.categories].sort((a, b) => a.order - b.order).map((item) => ({ id: item.id, name: item.name })) : project.entries.filter((item) => item.categoryIds.includes(activeCategoryId)).map((item) => ({ id: item.id, name: item.title }))} onSave={batchSaveList} onClose={() => setEditing(undefined)} />}{enteringEditor && <ModeSwitchDialog onCancel={() => setEnteringEditor(false)} onSubmit={async (password) => { if (!await authenticateEditor(password)) return false; setRole('editor'); setEnteringEditor(false); return true }} />}</div>
}
