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

export function LookbookNavigation({ categories, entries, activeCategoryId, activeEntryId, role, onCategory, onEntry, onEditCategories, onEditEntries }: LookbookNavigationProps) {
  const activeCategory = categories.find((category) => category.id === activeCategoryId)
  const containedEntries = activeCategory ? entries.filter((entry) => entry.categoryIds.includes(activeCategory.id)) : []
  return <div className="lookbook-navigation">
    <div className="category-navigation-row"><nav className="category-navigation" aria-label="Lookbook sections">
      {categories.map((category) => <button className={category.id === activeCategoryId ? 'active' : ''} key={category.id} onClick={() => onCategory(category.id)}>{category.id === activeCategoryId && <span aria-hidden="true" />}{category.name}</button>)}
    </nav>{role === 'editor' && <button className="button button-accent navigation-edit" aria-label="Edit categories" onClick={onEditCategories}>EDIT</button>}</div>
    {activeCategory && <div className="entry-navigation-row"><nav className="entry-navigation" aria-label={`${activeCategory.name} entries`}>
      {containedEntries.map((entry) => <button className={entry.id === activeEntryId ? 'active' : ''} key={entry.id} onClick={() => onEntry(entry.id)}>{entry.id === activeEntryId && <span aria-hidden="true" />}{entry.title}</button>)}
    </nav>{role === 'editor' && <button className="button button-accent navigation-edit" aria-label="Edit entries" onClick={onEditEntries}>EDIT</button>}</div>}
  </div>
}
