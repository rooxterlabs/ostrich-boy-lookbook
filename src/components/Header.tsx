import type { LookbookEntry, Role } from '../models/lookbook'
import { EntrySearch } from './EntrySearch'

interface HeaderProps {
  role: Role
  entries: LookbookEntry[]
  onEntry: (id: string) => void
  onHome?: () => void
  onMovieInfo: () => void
  onSwitchMode: () => void
  navigationOpen: boolean
  onOpenNavigation: () => void
}

export function Header({ role, entries, onEntry, onMovieInfo, onSwitchMode, navigationOpen, onOpenNavigation }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="header-brand">
        <button className="sidebar-toggle" aria-label="Open categories" aria-haspopup="dialog" aria-controls="lookbook-categories" aria-expanded={navigationOpen} onClick={onOpenNavigation}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
        <button className="wordmark" onClick={onMovieInfo} aria-label="Go to OSTRICH BOY MOVIE INFO">
          <strong>OSTRICH BOY</strong>
          <span>Production Lookbook</span>
        </button>
      </div>
      <EntrySearch entries={entries} onEntry={onEntry} />
      <nav className="header-actions" aria-label="Lookbook modes">
        <button className="mode-switch-button" onClick={onSwitchMode}>
          {role === 'editor' ? 'Exit Editor Mode' : 'Edit'}
        </button>
      </nav>
    </header>
  )
}
