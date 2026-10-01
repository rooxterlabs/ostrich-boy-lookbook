import { useEffect, useState } from 'react'
import { DeleteConfirmation } from '../components/DeleteConfirmation'
import { EditorToolbar } from '../components/EditorToolbar'
import { EntryItemGroups } from '../components/EntryItemGroups'
import { EntrySceneList } from '../components/EntrySceneList'
import { ImageGallery, type GalleryUpload } from '../components/ImageGallery'
import { normalizeEntry } from '../models/entry'
import type { Category, LookbookEntry, Role, Scene, StoredImage } from '../models/lookbook'

interface EntryPageProps {
  entry: LookbookEntry
  folder?: Category
  scenes: Scene[]
  images: StoredImage[]
  role: Role
  onSave: (entry: LookbookEntry) => Promise<void>
  onDelete: () => Promise<void>
  onUpload: (uploads: GalleryUpload[]) => void | Promise<void>
  onImageUpdate: (image: StoredImage) => void
  onImageDelete: (image: StoredImage) => void
  onPrimary: (id: string) => void
  onImageReorder: (sourceId: string, targetId: string) => void
}

export function EntryPage(props: EntryPageProps) {
  const { entry, folder, scenes, images, role } = props
  const [editing, setEditing] = useState(role === 'editor')
  const [draft, setDraft] = useState(() => normalizeEntry(entry, folder, scenes))
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { setDraft(normalizeEntry(entry, folder, scenes)); setError(''); setEditing(role === 'editor') }, [entry, folder, scenes, role])
  const canEdit = editing && role === 'editor'
  const update = <K extends keyof typeof draft>(key: K, value: typeof draft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const save = async () => {
    if (!draft.title.trim()) { setError('Enter a name for this entry.'); return }
    if (draft.itemGroups.some((group) => !group.name.trim())) { setError('Enter a name for each item category.'); return }
    setError(''); setBusy(true)
    try {
      await props.onSave({ ...draft, title: draft.title.trim(), role: draft.subtext, age: '', items: draft.itemGroups.flatMap((group) => group.bullets.map((bullet) => ({ id: bullet.id, name: bullet.text, category: group.name, notes: '' }))), updatedAt: new Date().toISOString() })
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save. Your changes are still here.') }
    finally { setBusy(false) }
  }
  const startEditing = () => { setDraft(normalizeEntry(entry, folder, scenes)); setError(''); setEditing(true) }
  const cancelEditing = () => { setDraft(normalizeEntry(entry, folder, scenes)); setEditing(role === 'editor'); setError('') }
  return <main className={`page-shell entry-page ${canEdit ? 'is-editing' : ''}`}>
    <ImageGallery images={images} primaryId={entry.primaryImageId} canEdit={role === 'editor'} onUpload={props.onUpload} onUpdate={props.onImageUpdate} onDelete={props.onImageDelete} onPrimary={props.onPrimary} onReorder={props.onImageReorder} />
    {canEdit && <div className="entry-gallery-actions"><EditorToolbar name={entry.title} editing busy={busy} onEdit={startEditing} onSave={() => void save()} onCancel={cancelEditing} /></div>}
    <div className="entry-title-row"><div>{canEdit ? <><label className="field">Name<input value={draft.title} disabled={busy} onChange={(event) => update('title', event.target.value)} /></label><label className="field">Subtext<input placeholder={'e.g. Jim’s Right-Hand Man · 30’s'} value={draft.subtext} disabled={busy} onChange={(event) => update('subtext', event.target.value)} /></label></> : <><h1>{entry.title}</h1>{draft.subtext && <p className="entry-role">{draft.subtext}</p>}</>}</div>
      {role === 'editor' && !canEdit && <EditorToolbar name={entry.title} editing={false} busy={busy} onEdit={startEditing} onSave={() => void save()} onCancel={cancelEditing} />}
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {canEdit ? <label className="field entry-description-field">Description<textarea rows={5} disabled={busy} value={draft.description} onChange={(event) => update('description', event.target.value)} /></label> : draft.description ? <p className="lead-copy entry-description-copy preserve-lines">{draft.description}</p> : <p className="muted entry-description-copy">No description has been added.</p>}
    <fieldset className="entry-content-fields" disabled={busy}>
      <EntryItemGroups groups={draft.itemGroups} editing={canEdit} onChange={(groups) => update('itemGroups', groups)} />
      <EntrySceneList scenes={draft.sceneList} editing={canEdit} onChange={(next) => update('sceneList', next)} />
    </fieldset>
    {role === 'editor' && <div className="entry-delete"><button className="button danger-button" disabled={busy} onClick={() => setDeleting(true)}>Delete {entry.title}</button></div>}
    {deleting && <DeleteConfirmation question={`Delete entry “${entry.title}” and all its images?`} doubleConfirm onCancel={() => setDeleting(false)} onConfirm={props.onDelete} />}
  </main>
}
