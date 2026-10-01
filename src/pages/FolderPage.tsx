import { useMemo, useState } from 'react'
import { categoryEntryType } from '../models/entry'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { EntryCard } from '../components/EntryCard'
import type { Category, LookbookEntry, Role, StoredImage } from '../models/lookbook'

interface FolderPageProps {
  folder: Category
  childFolders: Category[]
  entries: LookbookEntry[]
  images: StoredImage[]
  role: Role
  onHome: () => void
  onFolder: (id: string) => void
  onEntry: (id: string) => void
  onCreate: (title: string, type: LookbookEntry['type']) => void
}

export function FolderPage({ folder, childFolders, entries, images, role, onHome, onFolder, onEntry, onCreate }: FolderPageProps) {
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<LookbookEntry['type']>(categoryEntryType(folder))
  const primaryImages = useMemo(() => new Map(entries.map((entry) => [entry.id, images.find((image) => image.id === entry.primaryImageId) ?? images.find((image) => image.entryId === entry.id)])), [entries, images])
  return (
    <main className="page-shell">
      <Breadcrumbs items={[{ label: 'Home', onClick: onHome }, { label: folder.name }]} />
      <div className="page-heading"><div><p className="eyebrow">FOLDER</p><h1>{folder.name}</h1></div>{role === 'editor' && <button className="button button-accent" onClick={() => setCreating(true)}>New entry</button>}</div>
      {childFolders.length > 0 && <section><h2>Subfolders</h2><div className="subfolder-list">{childFolders.map((child) => <button key={child.id} onClick={() => onFolder(child.id)}>{child.name}</button>)}</div></section>}
      {creating && <section className="inline-form"><label>Title<input value={title} autoFocus onChange={(event) => setTitle(event.target.value)} /></label><label>Entry type<select value={type} onChange={(event) => setType(event.target.value as LookbookEntry['type'])}><option value="general">General</option><option value="character">Character</option><option value="location">Location</option></select></label><button className="button button-accent" disabled={!title.trim()} onClick={() => { onCreate(title.trim(), type); setTitle(''); setCreating(false) }}>Create</button><button className="button" onClick={() => setCreating(false)}>Cancel</button></section>}
      {entries.length ? <div className="entry-grid">{entries.map((entry) => <EntryCard key={entry.id} entry={entry} image={primaryImages.get(entry.id)} onOpen={() => onEntry(entry.id)} />)}</div> : <div className="empty-state"><h2>This folder is empty.</h2><p>{role === 'editor' ? 'Create the first entry when reference material is ready.' : 'No approved material is available yet.'}</p></div>}
    </main>
  )
}
