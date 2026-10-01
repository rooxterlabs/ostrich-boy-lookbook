import { useState } from 'react'
import type { ItemGroup } from '../models/lookbook'
import { DeleteConfirmation } from './DeleteConfirmation'

export function EntryItemGroups({ groups, editing, onChange }: { groups: ItemGroup[]; editing: boolean; onChange: (groups: ItemGroup[]) => void }) {
  const [deleting, setDeleting] = useState<{ question: string; remove: () => void }>()
  const updateGroup = (id: string, patch: Partial<ItemGroup>) => onChange(groups.map((group) => group.id === id ? { ...group, ...patch } : group))
  return <section className="entry-section" aria-labelledby="item-list-heading">
    <h2 id="item-list-heading" className="entry-section-heading">ITEM LIST</h2>
    {!groups.length && <p className="muted">No item categories yet.</p>}
    <div className={`entry-item-groups ${editing ? 'is-editing' : ''}`}>{groups.map((group, index) => {
      const displayedBullets = editing && !group.bullets.length ? [{ id: `${group.id}-empty-item`, text: '' }] : group.bullets
      return <section className="entry-item-group" key={group.id} aria-label={group.name || 'Untitled item category'}>
      {editing ? <div className="group-editor-heading"><input aria-label={`Item category ${index + 1} name`} placeholder="Category name" value={group.name} onChange={(event) => updateGroup(group.id, { name: event.target.value })} /><button className="button danger-button" onClick={() => setDeleting({ question: `Delete item category “${group.name}” and all its bullet points?`, remove: () => onChange(groups.filter((candidate) => candidate.id !== group.id)) })}>Delete category</button></div> : <h3>{group.name}</h3>}
      <ul className={editing ? 'bullet-editor-list' : 'entry-bullets'}>{displayedBullets.map((bullet, bulletIndex) => <li key={bullet.id}>{editing ? <>
        <textarea rows={2} aria-label={`${group.name || 'Category'} item ${bulletIndex + 1}`} placeholder="Item" value={bullet.text} onChange={(event) => updateGroup(group.id, { bullets: group.bullets.length ? group.bullets.map((item) => item.id === bullet.id ? { ...item, text: event.target.value } : item) : [{ id: crypto.randomUUID(), text: event.target.value }] })} />
        {group.bullets.length > 1 && <button className="button danger-button item-delete-button" aria-label={`Delete item ${bulletIndex + 1} from ${group.name || 'category'}`} onClick={() => setDeleting({ question: 'Delete this item?', remove: () => updateGroup(group.id, { bullets: group.bullets.filter((item) => item.id !== bullet.id) }) })}>Delete item</button>}
      </> : <span className="preserve-lines">{bullet.text}</span>}</li>)}</ul>
      {editing ? <button className="item-add-button" onClick={() => updateGroup(group.id, { bullets: [...(group.bullets.length ? group.bullets : [{ id: crypto.randomUUID(), text: '' }]), { id: crypto.randomUUID(), text: '' }] })}>add more items to this category</button> : !group.bullets.length && <p className="muted">No descriptions yet.</p>}
    </section>})}</div>
    {editing && <button className="button button-accent" onClick={() => onChange([...groups, { id: crypto.randomUUID(), name: '', bullets: [{ id: crypto.randomUUID(), text: '' }] }])}>Add item category</button>}
    {deleting && <DeleteConfirmation question={deleting.question} onCancel={() => setDeleting(undefined)} onConfirm={async () => { deleting.remove(); setDeleting(undefined) }} />}
  </section>
}
