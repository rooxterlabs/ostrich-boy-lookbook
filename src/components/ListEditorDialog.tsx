import { useEffect, useRef, useState } from 'react'
import { DeleteConfirmation } from './DeleteConfirmation'

export type ListAction =
  | { kind: 'rename'; id: string; name: string }
  | { kind: 'delete'; id: string }
  | { kind: 'move'; id: string; direction: -1 | 1 }
  | { kind: 'add'; name: string }

/** The complete desired state the dialog hands back on Save. */
export interface ListSavePayload {
  /** Final ordered list — existing items use their real ID, new items use a temp `__new-*` ID */
  items: { id: string; name: string }[]
  /** IDs of items that were deleted by the user */
  deletedIds: string[]
}

type LocalItem = { id: string; name: string }

let tempCounter = 0

export function ListEditorDialog({
  noun,
  categoryName,
  items,
  onSave,
  onClose,
}: {
  noun: 'category' | 'entry'
  categoryName?: string
  items: { id: string; name: string }[]
  onSave: (payload: ListSavePayload) => Promise<void>
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)

  const originalNames = useRef<Record<string, string>>(
    Object.fromEntries(items.map((i) => [i.id, i.name])),
  )
  const originalIds = useRef<Set<string>>(new Set(items.map((i) => i.id)))

  const [localItems, setLocalItems] = useState<LocalItem[]>(() =>
    items.map((i) => ({ ...i })),
  )
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [newEntryName, setNewEntryName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<LocalItem | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const el = dialog.current!
    el.showModal()
    return () => {
      if (el.open) el.close()
    }
  }, [])

  // ── Dirty detection ─────────────────────────────────────────────────────────

  const isDirty = (() => {
    // Any deletes?
    if (deletedIds.length > 0) return true
    // Any new items?
    if (localItems.some((i) => i.id.startsWith('__new-'))) return true
    // Count changed?
    if (localItems.length !== items.length) return true
    // Any rename?
    if (localItems.some((i) => originalNames.current[i.id] !== undefined && i.name.trim() !== originalNames.current[i.id])) return true
    // Order changed?
    const originalOrder = items.map((i) => i.id)
    const currentOrder = localItems.filter((i) => originalIds.current.has(i.id)).map((i) => i.id)
    if (originalOrder.length === currentOrder.length && originalOrder.some((id, idx) => id !== currentOrder[idx])) return true
    return false
  })()

  // ── Local-only mutations ────────────────────────────────────────────────────

  const handleNameEdit = (id: string, value: string) =>
    setLocalItems((prev) => prev.map((i) => (i.id === id ? { ...i, name: value } : i)))

  const handleMove = (id: string, direction: -1 | 1) => {
    setLocalItems((prev) => {
      const next = [...prev]
      const idx = next.findIndex((i) => i.id === id)
      const tgt = idx + direction
      if (idx < 0 || tgt < 0 || tgt >= next.length) return prev
      ;[next[idx], next[tgt]] = [next[tgt], next[idx]]
      return next
    })
  }

  const handleConfirmDelete = (item: LocalItem) => {
    setLocalItems((prev) => prev.filter((i) => i.id !== item.id))
    // Only track deletes for items that already exist in the DB
    if (originalIds.current.has(item.id)) {
      setDeletedIds((prev) => [...prev, item.id])
    }
    setConfirmDelete(null)
  }

  const handleAdd = () => {
    const name = newEntryName.trim()
    if (!name) return
    const id = `__new-${++tempCounter}`
    setLocalItems((prev) => [...prev, { id, name }])
    setNewEntryName('')
  }

  // ── Save: pass desired state to parent ──────────────────────────────────────

  const handleSave = async () => {
    setError('')
    setBusy(true)
    try {
      await onSave({ items: localItems.map((i) => ({ id: i.id, name: i.name.trim() })), deletedIds })
      onClose()
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Unable to save. Please try again.',
      )
      setBusy(false)
    }
  }

  // ── Heading ─────────────────────────────────────────────────────────────────

  const heading =
    noun === 'category'
      ? 'Edit categories'
      : categoryName
        ? `Entries for ${categoryName}`
        : 'Edit entries'

  return (
    <dialog
      ref={dialog}
      className="list-editor-dialog"
      aria-labelledby="list-editor-title"
      onCancel={(e) => {
        e.preventDefault()
        if (!busy && !confirmDelete) onClose()
      }}
    >
      <div className="list-editor-heading">
        <h2 id="list-editor-title">{heading}</h2>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <button
            className="button"
            disabled={busy || !isDirty}
            onClick={handleSave}
            style={{
              color: isDirty ? 'var(--accent)' : undefined,
              borderBottomColor: isDirty ? 'var(--accent)' : undefined,
              transition: 'color .2s, border-color .2s',
            }}
          >
            Save
          </button>
          <button className="button" disabled={busy} onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <fieldset disabled={busy || !!confirmDelete} className="list-editor-fields">
        <ol className="list-editor-items">
          {localItems.map((item, index) => (
            <li key={item.id}>
              <input
                aria-label={`Name for ${item.name}`}
                value={item.name}
                onChange={(e) => handleNameEdit(item.id, e.target.value)}
              />
              <div className="list-editor-controls">
                <button
                  className="button"
                  aria-label={`Move ${item.name} up`}
                  disabled={index === 0}
                  onClick={() => handleMove(item.id, -1)}
                >
                  ↑
                </button>
                <button
                  className="button"
                  aria-label={`Move ${item.name} down`}
                  disabled={index === localItems.length - 1}
                  onClick={() => handleMove(item.id, 1)}
                >
                  ↓
                </button>
                <button
                  className="button danger-button"
                  onClick={() => setConfirmDelete(item)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ol>

        {!localItems.length && (
          <p>No {noun === 'category' ? 'categories' : 'entries'} yet.</p>
        )}

        <form
          className="list-editor-add"
          onSubmit={(e) => {
            e.preventDefault()
            handleAdd()
          }}
        >
          <input
            value={newEntryName}
            placeholder={`New ${noun} name…`}
            onChange={(e) => setNewEntryName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            className="button button-accent"
            type="submit"
            disabled={!newEntryName.trim()}
          >
            Add {noun}
          </button>
        </form>
      </fieldset>

      {confirmDelete && (
        <DeleteConfirmation
          question={`Delete ${noun} "${confirmDelete.name}"${noun === 'category' ? ' and all its entries and subcategories' : ' and its images'}?`}
          doubleConfirm={noun === 'entry'}
          onConfirm={async () => handleConfirmDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {error && <p role="alert" className="form-error">{error}</p>}
    </dialog>
  )
}
