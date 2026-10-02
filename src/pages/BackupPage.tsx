import { useRef, useState } from 'react'
import { Breadcrumbs } from '../components/Breadcrumbs'
import type { ProjectData } from '../models/lookbook'

export function BackupPage({ onHome, onExport, onImport }: { project: ProjectData; onHome: () => void; onExport: () => void; onImport: (file: File) => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  return <main className="page-shell"><Breadcrumbs items={[{ label: 'Home', onClick: onHome }, { label: 'Backup / restore' }]} /><div className="page-heading"><div><p className="eyebrow">LOCAL DATA</p><h1>Backup / restore</h1></div></div><section className="backup-grid"><article><h2>Export project</h2><p>Download structured data and all uploaded image files in one JSON backup.</p><button className="button button-accent" onClick={onExport}>Export backup</button></article><article><h2>Restore project</h2><p>Replacing data affects this browser profile only. The current local project will be overwritten.</p><input ref={inputRef} hidden type="file" accept="application/json" onChange={async (event) => { const file = event.target.files?.[0]; if (!file || !confirm('Replace this browser’s current lookbook with the selected backup?')) return; try { await onImport(file); setMessage('Backup restored.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Restore failed.') } }} /><button className="button" onClick={() => inputRef.current?.click()}>Choose backup</button></article></section>{message && <p role="status" className="notice">{message}</p>}</main>
}
