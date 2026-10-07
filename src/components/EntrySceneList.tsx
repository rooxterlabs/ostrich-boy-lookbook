import { useEffect, useRef, useState } from 'react'
import type { EntryScene } from '../models/lookbook'
import { moveItem } from '../models/entry'
import { DeleteConfirmation } from './DeleteConfirmation'

const facets = ['mood', 'symbolism', 'conflict', 'emotion'] as const

export function EntrySceneList({ scenes, editing, onChange }: { scenes: EntryScene[]; editing: boolean; onChange: (scenes: EntryScene[]) => void }) {
  const [deleting, setDeleting] = useState<EntryScene>()
  const [isOpen, setIsOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const update = (id: string, patch: Partial<EntryScene>) => onChange(scenes.map((scene) => scene.id === id ? { ...scene, ...patch } : scene))
  useEffect(() => { const content = contentRef.current as (HTMLDivElement & { inert: boolean }) | null; if (content) content.inert = !isOpen }, [isOpen])
  return <section className={`entry-section entry-list-section scene-list-section ${isOpen ? 'is-open' : ''}`} aria-labelledby="scene-list-heading">
    <h2 className="entry-section-heading"><button id="scene-list-heading" type="button" className="entry-section-toggle" aria-controls="scene-list-content" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>SCENE LIST</button></h2>
    <div ref={contentRef} id="scene-list-content" className="entry-section-reveal" aria-hidden={!isOpen}>
      <div className="entry-section-reveal-content">
        {!scenes.length && <p className="muted">No scenes added yet.</p>}
        <ol className="entry-scene-timeline">{scenes.map((scene, index) => <li key={scene.id} className={`entry-scene ${editing ? 'is-editing' : ''}`} aria-label={`Scene ${scene.number || index + 1}`}>
      <span className="entry-scene-node" aria-hidden="true" />
      <div className="entry-scene-content">{editing ? <>
        <div className="scene-editor-top"><label>Scene number<input aria-label={`Scene ${index + 1} number`} placeholder="sc.10-12" value={scene.number} onChange={(event) => update(scene.id, { number: event.target.value })} /></label><label>Scene title<input aria-label={`Scene ${index + 1} title`} placeholder="The truth about Oskar's father" value={scene.title} onChange={(event) => update(scene.id, { title: event.target.value })} /></label></div>
        <label className="field scene-description-editor">Scene description<textarea rows={3} aria-label={`Scene ${index + 1} description`} value={scene.description} onChange={(event) => update(scene.id, { description: event.target.value })} /></label>
        <div className="scene-facet-editors">{facets.map((facet) => <label key={facet}>{facet}<textarea rows={3} aria-label={`Scene ${index + 1} ${facet}`} value={scene[facet]} onChange={(event) => update(scene.id, { [facet]: event.target.value })} /></label>)}</div>
        <div className="list-editor-controls"><button className="button" aria-label={`Move scene ${index + 1} up`} disabled={index === 0} onClick={() => onChange(moveItem(scenes, index, -1))}>↑</button><button className="button" aria-label={`Move scene ${index + 1} down`} disabled={index === scenes.length - 1} onClick={() => onChange(moveItem(scenes, index, 1))}>↓</button><button className="button danger-button" onClick={() => setDeleting(scene)}>Delete scene</button></div>
      </> : <>
        <div className="entry-scene-heading"><span className="entry-scene-number">{scene.number || '—'}</span><h3>{scene.title || 'Untitled scene'}</h3></div>
        {scene.description && <p className="entry-scene-description preserve-lines">{scene.description}</p>}
        <dl className="scene-facets">{facets.map((facet) => <div key={facet}><dt>{facet}</dt><dd className="preserve-lines">{scene[facet] || '—'}</dd></div>)}</dl>
      </>}</div>
    </li>)}</ol>
        {editing && <button className="button button-accent" onClick={() => onChange([...scenes, { id: crypto.randomUUID(), number: '', title: '', location: '', description: '', mood: '', symbolism: '', conflict: '', emotion: '' }])}>Add scene</button>}
      </div>
    </div>
    {deleting && <DeleteConfirmation question={`Delete scene “${deleting.title || deleting.number || 'Untitled scene'}” from this entry?`} onCancel={() => setDeleting(undefined)} onConfirm={async () => { onChange(scenes.filter((scene) => scene.id !== deleting.id)); setDeleting(undefined) }} />}
  </section>
}
