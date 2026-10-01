export function EditorToolbar({ name, editing, busy, onEdit, onSave, onCancel }: { name: string; editing: boolean; busy: boolean; onEdit: () => void; onSave: () => void; onCancel: () => void }) {
  return <div className="editor-toolbar">{editing ? <><button className="button button-accent" disabled={busy} onClick={onSave}>{busy ? 'Saving…' : 'Save changes'}</button><button className="button" disabled={busy} onClick={onCancel}>Cancel</button></> : <button className="button button-accent" onClick={onEdit}>Edit {name}</button>}</div>
}
