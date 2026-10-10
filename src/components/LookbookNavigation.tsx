import { useCallback, useEffect, useRef, useState } from 'react'
import type { Category, LookbookEntry, Role } from '../models/lookbook'

interface LookbookNavigationProps {
  categories: Category[]
  entries: LookbookEntry[]
  activeCategoryId?: string
  activeEntryId?: string
  role: Role
  onCategory: (id: string) => void
  onEntry: (id: string) => void
  onEditCategories: () => void
  onEditEntries: () => void
}

function useNavigationScroll(count: number, resetKey?: string) {
  const viewport = useRef<HTMLElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false, overflow: false })
  const measureEdges = useCallback(() => {
    const node = viewport.current
    if (!node) return
    const remaining = node.scrollWidth - node.clientWidth
    setEdges({ left: node.scrollLeft > 1, right: remaining - node.scrollLeft > 1, overflow: remaining > 1 })
  }, [])
  useEffect(() => {
    const node = viewport.current
    if (!node) return
    // Start at the first item; selection changes do not scroll a row automatically.
    node.scrollLeft = 0
    measureEdges()
  }, [resetKey, measureEdges])
  useEffect(() => {
    const node = viewport.current
    if (!node) return
    const observer = new ResizeObserver(measureEdges)
    observer.observe(node)
    if (node.firstElementChild) observer.observe(node.firstElementChild)
    measureEdges()
    return () => observer.disconnect()
  }, [resetKey, count, measureEdges])
  const scroll = (direction: -1 | 1) => {
    const node = viewport.current
    node?.scrollBy({ left: direction * node.clientWidth * .65, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
  return { viewport, edges, measureEdges, scroll }
}

export function LookbookNavigation({ categories, entries, activeCategoryId, activeEntryId, role, onCategory, onEntry, onEditCategories, onEditEntries }: LookbookNavigationProps) {
  const activeCategory = categories.find((category) => category.id === activeCategoryId)
  const containedEntries = activeCategory ? entries.filter((entry) => entry.categoryIds.includes(activeCategory.id)) : []
  const categoryScroll = useNavigationScroll(categories.length)
  return <div className="lookbook-navigation">
    <div className="category-navigation-row"><div className={`category-navigation-boundary ${categoryScroll.edges.left ? 'has-left-edge' : ''} ${categoryScroll.edges.right ? 'has-right-edge' : ''}`}><nav className="category-navigation" ref={categoryScroll.viewport} onScroll={categoryScroll.measureEdges} tabIndex={0} aria-label="Lookbook sections" onKeyDown={(event) => {
      if (event.target !== event.currentTarget) return
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); categoryScroll.scroll(event.key === 'ArrowLeft' ? -1 : 1) }
    }}><div className="category-navigation-track">
      {categories.map((category) => <button className={category.id === activeCategoryId ? 'active' : ''} key={category.id} onClick={() => onCategory(category.id)}>{category.id === activeCategoryId && <span aria-hidden="true" />}{category.name}</button>)}
    </div></nav></div>{role === 'editor' && <button className="button button-accent navigation-edit" aria-label="Edit categories" onClick={onEditCategories}>EDIT</button>}
    {categoryScroll.edges.overflow && <div className="category-navigation-controls"><div className="category-scroll-controls" role="group" aria-label="Category row navigation"><button aria-label="Scroll categories left" disabled={!categoryScroll.edges.left} onClick={() => categoryScroll.scroll(-1)}>←</button><span aria-hidden="true" /><button aria-label="Scroll categories right" disabled={!categoryScroll.edges.right} onClick={() => categoryScroll.scroll(1)}>→</button></div></div>}
    </div>
    {activeCategory && <div className="entry-navigation-row"><nav className="entry-navigation" aria-label={`${activeCategory.name} entries`}><div className="entry-navigation-track">
      {containedEntries.map((entry) => <button className={entry.id === activeEntryId ? 'active' : ''} key={entry.id} onClick={() => onEntry(entry.id)}>{entry.id === activeEntryId && <span aria-hidden="true" />}{entry.title}</button>)}
    </div></nav>{role === 'editor' && <button className="button button-accent navigation-edit" aria-label="Edit entries" onClick={onEditEntries}>EDIT</button>}
    </div>}
  </div>
}
