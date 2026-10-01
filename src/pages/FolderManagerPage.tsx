import { useState } from 'react'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { StatusSelect } from '../components/StatusSelect'
import type { Category } from '../models/lookbook'

export function FolderManagerPage({ categories, onHome, onChange }: { categories: Category[]; onHome: () => void; onChange: (categories: Category[]) => void }) {
  const [name, setName] = useState('')
  const sorted = [...categories].sort((a, b) => a.order - b.order)
  const patch = (id: string, changes: Partial<Category>) => onChange(categories.map((category) => category.id === id ? { ...category, ...changes } : category))
  const move = (id: string, direction: -1 | 1) => {
    const index = sorted.findIndex((category) => category.id === id)
    const next = sorted[index + direction]
    if (!next) return
    onChange(categories.map((category) => category.id === id ? { ...category, order: next.order } : category.id === next.id ? { ...category, order: sorted[index].order } : category))
  }
  const create = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onChange([...categories, { id: `category-${crypto.randomUUID()}`, name: trimmed, order: categories.length, archived: false, status: 'approved' }])
    setName('')
  }
  return <main className="page-shell"><Breadcrumbs items={[{ label: 'Home', onClick: onHome }, { label: 'Manage folders' }]} /><div className="page-heading"><div><p className="eyebrow">EDITOR</p><h1>Manage folders</h1></div></div><section className="inline-form"><label>New folder name<input value={name} onChange={(event) => setName(event.target.value)} /></label><button className="button button-accent" disabled={!name.trim()} onClick={create}>Create folder</button></section><div className="manager-list">{sorted.map((category) => <div key={category.id}><input aria-label="Folder name" value={category.name} onChange={(event) => patch(category.id, { name: event.target.value })} /><StatusSelect value={category.status} onChange={(status) => patch(category.id, { status })} /><button onClick={() => move(category.id, -1)}>Move up</button><button onClick={() => move(category.id, 1)}>Move down</button><button className="danger-button" onClick={() => confirm(`Archive ${category.name}?`) && patch(category.id, { archived: true })}>Archive</button></div>)}</div></main>
}
