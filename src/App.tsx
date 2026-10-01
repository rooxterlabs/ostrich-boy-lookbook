import { useCallback, useEffect, useMemo, useState } from 'react'
import { ListEditorDialog, type ListAction } from './components/ListEditorDialog'
import type { GalleryUpload } from './components/ImageGallery'
import { Header } from './components/Header'
import { LookbookNavigation } from './components/LookbookNavigation'
import { ModeSwitchDialog } from './components/ModeSwitchDialog'
import { authenticateEditor, authenticateViewer, readSessionRole } from './features/auth/auth'
import { deleteImage, getImages, loadProject, putImage, saveProject, saveProjectAndDeleteImages } from './features/storage/supabaseDatabase'
import { categoryEntryType, newEntry } from './models/entry'
import type { Category, LookbookEntry, ProjectData, Role, StoredImage } from './models/lookbook'
import { EntryPage } from './pages/EntryPage'
import { FolderManagerPage } from './pages/FolderManagerPage'
import { FolderPage } from './pages/FolderPage'
import { LoginPage } from './pages/LoginPage'
import { MasterItemListPage } from './pages/MasterItemListPage'
import { MasterSceneListPage } from './pages/MasterSceneListPage'

type Route = { page: 'items' | 'scenes' | 'folders' } | { page: 'folder'; id: string } | { page: 'entry'; id: string }

const DEFAULT_ENTRY_ID = ''
const DEFAULT_CATEGORY_ID = ''
const RETIRED_SEED_CATEGORY_IDS = new Set(['category-props', 'category-costumes', 'category-hair-makeup', 'category-production-design', 'category-references'])

export default function App() {
  const [role, setRoleState] = useState<Role>(readSessionRole)
  const [editing, setEditing] = useState<'category' | 'entry'>()
  const [switchingTo, setSwitchingTo] = useState<'viewer' | 'editor'>()
  const [project, setProject] = useState<ProjectData>()
  const [images, setImages] = useState<StoredImage[]>([])
  const [route, setRoute] = useState<Route>({ page: 'entry', id: DEFAULT_ENTRY_ID })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refreshImages = useCallback(async () => setImages(await getImages()), [])
  useEffect(() => { if (role === 'locked') { setLoading(false); return } setLoading(true); loadProject().then(async (data) => [data, await getImages()] as const).then(([data, storedImages]) => { setProject(data); setImages(storedImages); setError('') }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load the lookbook.')).finally(() => setLoading(false)) }, [role])
  useEffect(() => {
    if (role === 'locked') return
    const channel = new BroadcastChannel('lookbook-changes')
    channel.onmessage = () => {
      loadProject().then(async (data) => { setProject(data); setImages(await getImages()) }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to refresh the lookbook.'))
    }
    return () => channel.close()
  }, [role])
  const setRole = (next: Role) => setRoleState(next)
  const persist = async (next: ProjectData) => { const stamped = { ...next, updatedAt: new Date().toISOString() }; setProject(stamped); try { await saveProject(stamped); setError('') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save changes.') } }
  const visibleCategories = useMemo(() => project ? project.categories.filter((category) => !RETIRED_SEED_CATEGORY_IDS.has(category.id) && !category.archived && (role === 'editor' || category.status === 'approved')).sort((a, b) => a.order - b.order) : [], [project, role])
  const visibleEntries = useMemo(() => project ? project.entries.filter((entry) => !entry.archived && (role === 'editor' || entry.status === 'approved')) : [], [project, role])
  const visibleScenes = useMemo(() => project ? project.scenes.filter((scene) => role === 'editor' || scene.status === 'approved') : [], [project, role])

  if (role === 'locked') return <LoginPage title="OSTRICH BOY — PRODUCTION LOOKBOOK" label="Viewer password" onSubmit={async (password) => { if (!await authenticateViewer(password)) return false; setRole('viewer'); return true }} />
  if (loading) return <main className="state-page"><div className="loading-mark" /><p>Loading lookbook…</p></main>
  if (!project) return <main className="state-page"><h1>Lookbook unavailable</h1><p>{error || 'Browser storage could not be opened.'}</p><button className="button" onClick={() => location.reload()}>Try again</button></main>

  const folder = route.page === 'folder' ? visibleCategories.find((category) => category.id === route.id) : undefined
  const entry = route.page === 'entry' ? visibleEntries.find((candidate) => candidate.id === route.id) : undefined
  const home = () => setRoute(visibleCategories[0] ? { page: 'folder', id: visibleCategories[0].id } : { page: 'entry', id: '' })
  const activeEntry = route.page === 'entry' ? visibleEntries.find((candidate) => candidate.id === route.id) : undefined
  const activeCategoryId = route.page === 'folder' ? route.id : activeEntry?.categoryIds.find((id) => visibleCategories.some((category) => category.id === id)) ?? visibleCategories[0]?.id ?? DEFAULT_CATEGORY_ID
  const canViewerAccessCurrentRoute = route.page === 'folders'
    ? false
    : route.page === 'folder'
      ? project.categories.some((category) => category.id === route.id && category.status === 'approved' && !category.archived && !RETIRED_SEED_CATEGORY_IDS.has(category.id))
      : route.page === 'entry'
        ? project.entries.some((candidate) => candidate.id === route.id && candidate.status === 'approved' && !candidate.archived)
        : true
  const navigateCategory = (id: string) => {
    const firstEntry = visibleEntries.find((candidate) => candidate.categoryIds.includes(id))
    setRoute(firstEntry ? { page: 'entry', id: firstEntry.id } : { page: 'folder', id })
  }
  const createCategory = async (name: string) => {
    const created: Category = { id: `category-${crypto.randomUUID()}`, name, entryType: categoryEntryType({ id: '', name, order: 0, archived: false, status: 'approved' }), order: project.categories.length, archived: false, status: 'approved' }
    await saveProject({ ...project, categories: [...project.categories, created] }); setProject({ ...project, categories: [...project.categories, created] })
    setRoute({ page: 'folder', id: created.id })
  }
  const createEntry = async (title: string) => {
    const category = visibleCategories.find((candidate) => candidate.id === activeCategoryId)
    if (!category) return
    const created = newEntry(title, category)
    await saveProject({ ...project, entries: [...project.entries, created] }); setProject({ ...project, entries: [...project.entries, created] })
    setRoute({ page: 'entry', id: created.id })
  }
  const editList = async (action: ListAction) => {
    if (role !== 'editor' || !editing) return
    if (action.kind === 'add') { await (editing === 'category' ? createCategory(action.name) : createEntry(action.name)); return }
    let next = structuredClone(project)
    let removedEntries: string[] = []
    if (action.kind === 'rename') {
      if (editing === 'category') next.categories = next.categories.map((item) => item.id === action.id ? { ...item, name: action.name } : item)
      else next.entries = next.entries.map((item) => item.id === action.id ? { ...item, title: action.name, updatedAt: new Date().toISOString() } : item)
    } else if (action.kind === 'move') {
      if (editing === 'category') {
        const ordered = [...next.categories].sort((a, b) => a.order - b.order)
        const index = ordered.findIndex((item) => item.id === action.id)
        const target = index + action.direction
        if (index < 0 || !ordered[target]) return
        ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
        next.categories = ordered.map((item, order) => ({ ...item, order }))
      } else {
        const ordered = next.entries.filter((item) => item.categoryIds.includes(activeCategoryId))
        const index = ordered.findIndex((item) => item.id === action.id)
        const other = ordered[index + action.direction]
        if (!other) return
        const first = next.entries.findIndex((item) => item.id === action.id)
        const second = next.entries.findIndex((item) => item.id === other.id)
        ;[next.entries[first], next.entries[second]] = [next.entries[second], next.entries[first]]
      }
    } else {
      if (editing === 'category') {
        const removed = new Set([action.id])
        let size = 0
        while (size !== removed.size) { size = removed.size; next.categories.forEach((item) => { if (item.parentId && removed.has(item.parentId)) removed.add(item.id) }) }
        removedEntries = next.entries.filter((item) => item.categoryIds.some((id) => removed.has(id))).map((item) => item.id)
        next.categories = next.categories.filter((item) => !removed.has(item.id))
      } else removedEntries = [action.id]
      next.entries = next.entries.filter((item) => !removedEntries.includes(item.id)).map((item) => ({ ...item, linkedEntryIds: item.linkedEntryIds.filter((id) => !removedEntries.includes(id)) }))
      next.scenes = next.scenes.map((scene) => ({ ...scene, characterIds: scene.characterIds.filter((id) => !removedEntries.includes(id)), locationIds: scene.locationIds.filter((id) => !removedEntries.includes(id)) }))
    }
    next = { ...next, updatedAt: new Date().toISOString() }
    await saveProjectAndDeleteImages(next, removedEntries)
    setProject(next)
    if (removedEntries.length) await refreshImages()
    if (action.kind === 'delete') {
      const category = next.categories.find((item) => item.id === activeCategoryId) ?? [...next.categories].sort((a, b) => a.order - b.order)[0]
      if ((route.page === 'entry' && removedEntries.includes(route.id)) || (route.page === 'folder' && !next.categories.some((item) => item.id === route.id))) setRoute(category ? { page: 'folder', id: category.id } : { page: 'entry', id: '' })
    }
  }
  const content = (() => {
    if (route.page === 'folder' && folder) return <FolderPage folder={folder} childFolders={visibleCategories.filter((category) => category.parentId === folder.id)} entries={visibleEntries.filter((candidate) => candidate.categoryIds.includes(folder.id))} images={images} role={role} onHome={home} onFolder={(id) => setRoute({ page: 'folder', id })} onEntry={(id) => setRoute({ page: 'entry', id })} onCreate={(title, type) => { const created = newEntry(title, folder, type); void persist({ ...project, entries: [...project.entries, created] }); setRoute({ page: 'entry', id: created.id }) }} />
    if (route.page === 'entry' && entry) {
      const entryFolder = visibleCategories.find((category) => entry.categoryIds.includes(category.id))
      const entryImages = images.filter((image) => image.entryId === entry.id).sort((a, b) => a.order - b.order)
      const updateEntry = async (next: LookbookEntry) => {
        const stamped = { ...project, entries: project.entries.map((candidate) => candidate.id === next.id ? next : candidate), updatedAt: new Date().toISOString() }
        await saveProject(stamped)
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
      return <EntryPage key={entry.id} entry={entry} folder={entryFolder} scenes={visibleScenes} images={entryImages} role={role} onSave={(next) => updateEntry({ ...next, imageIds: entry.imageIds, primaryImageId: entry.primaryImageId })} onDelete={deleteEntry} onUpload={async (uploads: GalleryUpload[]) => { const added = await Promise.all(uploads.map(async (upload, index) => { const image: StoredImage = { id: crypto.randomUUID(), entryId: entry.id, name: upload.file.name, caption: upload.caption, order: entryImages.length + index, blob: upload.file, frameRatio: upload.frameRatio, positionX: upload.positionX, positionY: upload.positionY, scale: upload.scale }; await putImage(image); return image })); const requestedPrimaryIndex = uploads.findIndex((upload) => upload.makePrimary); const requestedPrimary = requestedPrimaryIndex >= 0 ? added[requestedPrimaryIndex]?.id : undefined; const next = { ...entry, imageIds: [...entry.imageIds, ...added.map((image) => image.id)], primaryImageId: requestedPrimary ?? entry.primaryImageId ?? added[0]?.id }; await updateEntry(next); await refreshImages() }} onImageUpdate={async (image) => { await putImage(image); await refreshImages() }} onImageDelete={async (image) => { await deleteImage(image.id); await updateEntry({ ...entry, imageIds: entry.imageIds.filter((id) => id !== image.id), primaryImageId: entry.primaryImageId === image.id ? entryImages.find((candidate) => candidate.id !== image.id)?.id : entry.primaryImageId }); await refreshImages() }} onPrimary={(id) => updateEntry({ ...entry, primaryImageId: id })} onImageReorder={async (sourceId, targetId) => { const reordered = [...entryImages]; const sourceIndex = reordered.findIndex((image) => image.id === sourceId); const targetIndex = reordered.findIndex((image) => image.id === targetId); if (sourceIndex < 0 || targetIndex < 0) return; const [moved] = reordered.splice(sourceIndex, 1); reordered.splice(targetIndex, 0, moved); await Promise.all(reordered.map((image, order) => putImage({ ...image, order }))); await refreshImages() }} />
    }
    if (route.page === 'items') return <MasterItemListPage entries={visibleEntries} onHome={home} onEntry={(id) => setRoute({ page: 'entry', id })} />
    if (route.page === 'scenes') return <MasterSceneListPage scenes={visibleScenes} entries={visibleEntries} role={role} onHome={home} onChange={(scenes) => void persist({ ...project, scenes })} />
    if (route.page === 'folders' && role === 'editor') return <FolderManagerPage categories={project.categories} onHome={home} onChange={(categories: Category[]) => void persist({ ...project, categories })} />
    return <main className="page-shell"><div className="empty-state"><h1>{visibleCategories.length ? 'Select a category' : 'Your lookbook is empty.'}</h1><p>{role === 'editor' ? 'Use EDIT to add and manage your categories and entries.' : 'New material will appear here when it is added.'}</p></div></main>
  })()

  return <div className="app-shell"><Header role={role} onHome={home} onSwitchMode={() => setSwitchingTo(role === 'editor' ? 'viewer' : 'editor')} /><LookbookNavigation categories={visibleCategories.filter((category) => !category.parentId)} entries={visibleEntries} activeCategoryId={activeCategoryId} activeEntryId={activeEntry?.id} role={role} onCategory={navigateCategory} onEntry={(id) => setRoute({ page: 'entry', id })} onEditCategories={() => setEditing('category')} onEditEntries={() => setEditing('entry')} />{error && <div className="error-banner" role="alert">{error}</div>}{content}<footer><span>OSTRICH BOY</span><p>Secure Supabase project storage</p></footer>{editing && role === 'editor' && <ListEditorDialog noun={editing} items={editing === 'category' ? [...project.categories].sort((a, b) => a.order - b.order).map((item) => ({ id: item.id, name: item.name })) : project.entries.filter((item) => item.categoryIds.includes(activeCategoryId)).map((item) => ({ id: item.id, name: item.title }))} onAction={editList} onClose={() => setEditing(undefined)} />}{switchingTo && <ModeSwitchDialog mode={switchingTo === 'editor' ? 'Editor' : 'Viewer'} onCancel={() => setSwitchingTo(undefined)} onSubmit={async (password) => { const accepted = switchingTo === 'editor' ? await authenticateEditor(password) : await authenticateViewer(password); if (!accepted) return false; if (switchingTo === 'viewer' && !canViewerAccessCurrentRoute) home(); setRole(switchingTo); setSwitchingTo(undefined); return true }} />}</div>
}
