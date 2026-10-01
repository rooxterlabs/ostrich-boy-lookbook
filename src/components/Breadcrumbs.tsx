export interface Crumb { label: string; onClick?: () => void }
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return <nav className="breadcrumbs" aria-label="Breadcrumb">{items.map((item, index) => <span key={`${item.label}-${index}`}>{index > 0 && <b>/</b>}{item.onClick ? <button onClick={item.onClick}>{item.label}</button> : <span>{item.label}</span>}</span>)}</nav>
}
