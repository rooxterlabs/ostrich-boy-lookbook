import type { Category, Role } from '../models/lookbook'

interface HomePageProps {
  categories: Category[]
  role: Role
  onCategory: (id: string) => void
  onItems: () => void
  onScenes: () => void
  onManage: () => void
}

export function HomePage({ categories, role, onCategory, onItems, onScenes, onManage }: HomePageProps) {
  return (
    <main>
      <section className="hero-block">
        <p className="eyebrow">ROOXTER FILMS</p>
        <h1>OSTRICH BOY <span>— PRODUCTION LOOKBOOK</span></h1>
      </section>
      <section className="category-grid" aria-label="Lookbook categories">
        {categories.map((category) => <button key={category.id} onClick={() => onCategory(category.id)}>{category.name.toUpperCase()}</button>)}
      </section>
      <nav className="secondary-navigation" aria-label="Production lists">
        <button onClick={onItems}>Master Item List</button>
        <button onClick={onScenes}>Master Scene List</button>
        {role === 'editor' && <button onClick={onManage}>Manage folders</button>}
      </nav>
    </main>
  )
}
