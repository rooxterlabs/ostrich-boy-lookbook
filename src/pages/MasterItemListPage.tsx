import { useMemo, useState } from 'react'
import { Breadcrumbs } from '../components/Breadcrumbs'
import type { LookbookEntry } from '../models/lookbook'

export function MasterItemListPage({ entries, onHome, onEntry }: { entries: LookbookEntry[]; onHome: () => void; onEntry: (id: string) => void }) {
  const [category, setCategory] = useState('all')
  const [association, setAssociation] = useState('all')
  const rows = entries.flatMap((entry) => entry.items.map((item) => ({ item, entry })))
  const categories = useMemo(() => [...new Set(rows.map(({ item }) => item.category).filter(Boolean))].sort(), [rows])
  const filtered = rows.filter(({ item, entry }) => (category === 'all' || item.category === category) && (association === 'all' || entry.id === association))
  return <main className="page-shell"><Breadcrumbs items={[{ label: 'Home', onClick: onHome }, { label: 'Master Item List' }]} /><div className="page-heading"><div><p className="eyebrow">AGGREGATED</p><h1>Master Item List</h1></div></div><div className="filter-bar"><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label><label>Association<select value={association} onChange={(event) => setAssociation(event.target.value)}><option value="all">All entries</option>{entries.filter((entry) => entry.items.length).map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label></div>{filtered.length ? <div className="table-wrap"><table><thead><tr><th>Item</th><th>Category</th><th>Associated entry</th><th>Notes</th></tr></thead><tbody>{filtered.map(({ item, entry }) => <tr key={item.id}><td>{item.name || 'Untitled item'}</td><td>{item.category || '—'}</td><td><button className="table-link" onClick={() => onEntry(entry.id)}>{entry.title}</button></td><td>{item.notes || '—'}</td></tr>)}</tbody></table></div> : <div className="empty-state"><h2>No matching items.</h2><p>Items added inside entries will appear here automatically.</p></div>}</main>
}
