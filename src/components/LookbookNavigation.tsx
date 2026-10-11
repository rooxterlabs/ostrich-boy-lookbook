import { useEffect, useRef, useState } from 'react'
import type { Category, LookbookEntry, Role } from '../models/lookbook'

interface LookbookNavigationProps {
  categories: Category[]
  entries: LookbookEntry[]
  activeCategoryId?: string
  activeEntryId?: string
  role: Role
  open: boolean
  onClose: () => void
  onCategory: (id: string) => void
  onEntry: (id: string) => void
  onEditCategories: () => void
  onEditEntries: () => void
}

export function LookbookNavigation({ categories, entries, activeCategoryId, activeEntryId, role, open, onClose, onCategory, onEntry, onEditCategories, onEditEntries }: LookbookNavigationProps) {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 900px)').matches)
  const drawer = useRef<HTMLDialogElement>(null)
  const [expandedCategories, setExpandedCategories] = useState(() => new Set(activeCategoryId ? [activeCategoryId] : []))

  useEffect(() => {
    if (!activeCategoryId) return
    setExpandedCategories((current) => new Set(current).add(activeCategoryId))
  }, [activeCategoryId])

  useEffect(() => {
    const query = window.matchMedia('(max-width: 900px)')
    const update = () => setMobile(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!mobile) onClose()
  }, [mobile, onClose])

  useEffect(() => {
    if (!mobile || !open) return
    const node = drawer.current
    node?.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      node?.close()
      document.body.style.overflow = previousOverflow
    }
  }, [mobile, open])

  const navigate = (callback: () => void) => {
    callback()
    onClose()
  }
  const toggleCategory = (id: string) => {
    const expanding = !expandedCategories.has(id)
    setExpandedCategories((current) => {
      const next = new Set(current)
      if (expanding) next.add(id)
      else next.delete(id)
      return next
    })
    if (expanding && id !== activeCategoryId) onCategory(id)
  }
  const navigation = <>
    <div className="sidebar-heading">
      <span>Categories</span>
      {mobile && <button className="sidebar-close" aria-label="Close categories" onClick={onClose}>×</button>}
      {role === 'editor' && <button className="button button-accent navigation-edit" aria-label="Edit categories" onClick={() => navigate(onEditCategories)}>EDIT</button>}
    </div>
    <nav className="category-navigation" aria-label="Lookbook categories">
      {categories.map((category) => {
        const active = category.id === activeCategoryId
        const expanded = expandedCategories.has(category.id)
        const containedEntries = entries.filter((entry) => entry.categoryIds.includes(category.id))
        return <div className={`sidebar-category ${active ? 'is-active' : ''}`} key={category.id}>
          <button className={`category-button ${active ? 'active' : ''}`} aria-current={active ? 'true' : undefined} aria-expanded={expanded} aria-controls={`category-entries-${category.id}`} onClick={() => toggleCategory(category.id)}>
            <span className="category-marker" aria-hidden="true" />{category.name}
          </button>
          <div id={`category-entries-${category.id}`} className="entry-navigation" role="group" aria-label={`${category.name} entries`} hidden={!expanded}>
            {containedEntries.map((entry) => <button className={entry.id === activeEntryId ? 'active' : ''} aria-current={entry.id === activeEntryId ? 'page' : undefined} key={entry.id} onClick={() => navigate(() => onEntry(entry.id))}>{entry.title}</button>)}
            {role === 'editor' && <button className="button button-accent navigation-edit" aria-label={`Edit ${category.name} entries`} onClick={() => navigate(() => { if (!active) onCategory(category.id); onEditEntries() })}>EDIT ENTRIES</button>}
          </div>
        </div>
      })}
    </nav>
  </>

  if (mobile) return <dialog ref={drawer} id="lookbook-categories" className="lookbook-navigation navigation-drawer" aria-label="Categories" onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => {
    if (event.target !== event.currentTarget) return
    const bounds = event.currentTarget.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
  }}>{navigation}</dialog>

  return <aside id="lookbook-categories" className="lookbook-navigation">{navigation}</aside>
}
