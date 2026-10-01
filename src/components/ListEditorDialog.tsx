import { useEffect, useRef, useState } from 'react'
import { DeleteConfirmation } from './DeleteConfirmation'

export type ListAction = { kind: 'rename'; id: string; name: string } | { kind: 'delete'; id: string } | { kind: 'move'; id: string; direction: -1 | 1 } | { kind: 'add'; name: string }

export function ListEditorDialog({ noun, items, onAction, onClose }: { noun: 'category' | 'entry'; items: { id: string; name: string }[]; onAction: (action: ListAction) => Promise<void>; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const [newName, setNewName] = useState('')
  const [deleting, setDeleting] = useState<{ id: string; name: string }>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => { if (element.open) element.close() } }, [])
  const run = async (action: ListAction) => {
    setError(''); setBusy(true)
    try { await onAction(action); if (action.kind === 'add') setNewName('') }
    finally { setBusy(false) }
  }
  const apply = (action: ListAction) => void run(action).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to save. Please try again.'))
  return <dialog ref={dialog} className="list-editor-dialog" aria-labelledby="list-editor-title" onCancel={(event) => { event.preventDefault(); if (!busy && !deleting) onClose() }}>
    <div className="list-editor-heading"><h2 id="list-editor-title">Edit {noun === 'category' ? 'categories' : 'entries'}</h2><button className="button" disabled={busy} onClick={onClose}>Close</button></div>
    <fieldset disabled={busy || !!deleting} className="list-editor-fields">
      <ol className="list-editor-items">{items.map((item, index) => <li key={item.id}>
        <input aria-label={`Name for ${item.name}`} value={names[item.id] ?? item.name} onChange={(event) => setNames({ ...names, [item.id]: event.target.value })} />
        <div className="list-editor-controls">
          <button className="button" disabled={!(names[item.id] ?? item.name).trim() || (names[item.id] ?? item.name).trim() === item.name} onClick={() => apply({ kind: 'rename', id: item.id, name: names[item.id].trim() })}>Rename</button>
          <button className="button" aria-label={`Move ${item.name} up`} disabled={index === 0} onClick={() => apply({ kind: 'move', id: item.id, direction: -1 })}>↑</button>
          <button className="button" aria-label={`Move ${item.name} down`} disabled={index === items.length - 1} onClick={() => apply({ kind: 'move', id: item.id, direction: 1 })}>↓</button>
          <button className="button danger-button" onClick={() => setDeleting(item)}>Delete</button>
        </div>
      </li>)}</ol>
      {!items.length && <p>No {noun === 'category' ? 'categories' : 'entries'} yet.</p>}
      <form className="list-editor-add" onSubmit={(event) => { event.preventDefault(); if (newName.trim()) apply({ kind: 'add', name: newName.trim() }) }}><label>New {noun}<input value={newName} onChange={(event) => setNewName(event.target.value)} /></label><button className="button button-accent" disabled={!newName.trim()}>Add {noun}</button></form>
    </fieldset>
    {deleting && <DeleteConfirmation question={`Delete ${noun} “${deleting.name}”${noun === 'category' ? ' and all its entries and subcategories' : ' and its images'}?`} doubleConfirm={noun === 'entry'} onConfirm={async () => { await run({ kind: 'delete', id: deleting.id }); setDeleting(undefined) }} onCancel={() => setDeleting(undefined)} />}
    {error && <p role="alert" className="form-error">{error}</p>}
  </dialog>
}
