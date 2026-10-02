export function EditorToolbar({ name, editing, busy, dirty, onEdit, onSave, onCancel }: { name: string; editing: boolean; busy: boolean; dirty?: boolean; onEdit: () => void; onSave: () => void; onCancel: () => void }) {
  const canSave = !!dirty && !busy
  return <div className="editor-toolbar">{editing ? <>
    <button
      className="button"
      disabled={!canSave}
      onClick={onSave}
      style={{
        color: canSave ? 'var(--accent)' : 'var(--text-secondary)',
        borderBottomColor: canSave ? 'var(--accent)' : 'transparent',
        opacity: canSave ? 1 : .42,
        transition: 'color .2s, border-color .2s, opacity .2s',
      }}
    >{busy ? 'Saving…' : 'Save changes'}</button>
    <button
      className="button"
      disabled={busy}
      onClick={onCancel}
      style={{ borderBottomColor: 'transparent' }}
    >Cancel</button>
  </> : <button className="button button-accent" onClick={onEdit}>Edit {name}</button>}</div>
}
