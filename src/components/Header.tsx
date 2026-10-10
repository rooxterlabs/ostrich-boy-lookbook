import type { LookbookEntry, Role } from '../models/lookbook'
import { EntrySearch } from './EntrySearch'

interface HeaderProps {
  role: Role
  entries: LookbookEntry[]
  onEntry: (id: string) => void
  onHome?: () => void
  onMovieInfo: () => void
  onSwitchMode: () => void
}

export function Header({ role, entries, onEntry, onMovieInfo, onSwitchMode }: HeaderProps) {
  return (
    <header className="site-header">
      <button className="wordmark" onClick={onMovieInfo} aria-label="Go to OSTRICH BOY MOVIE INFO">
        <strong>OSTRICH BOY</strong>
        <span>Production Lookbook</span>
      </button>
      <EntrySearch entries={entries} onEntry={onEntry} />
      <nav className="header-actions" aria-label="Lookbook modes">
        <button className="mode-switch-button" onClick={onSwitchMode}>
          {role === 'editor' ? 'Exit Editor Mode' : 'Edit'}
        </button>
      </nav>
    </header>
  )
}
