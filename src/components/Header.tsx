import type { LookbookEntry, Role } from '../models/lookbook'
import { EntrySearch } from './EntrySearch'

interface HeaderProps {
  role: Role
  entries: LookbookEntry[]
  onEntry: (id: string) => void
  onHome?: () => void
  onMovieInfo: () => void
  onSwitchMode: () => void
  switchingMode?: boolean
}

export function Header({ role, entries, onEntry, onMovieInfo, onSwitchMode, switchingMode = false }: HeaderProps) {
  return (
    <header className="site-header">
      <button className="wordmark" onClick={onMovieInfo} aria-label="Go to OSTRICH BOY MOVIE INFO">
        <strong>OSTRICH BOY</strong>
        <span>Production Lookbook</span>
      </button>
      <EntrySearch entries={entries} onEntry={onEntry} />
      <nav className="header-actions" aria-label="Lookbook modes">
        <button className="mode-switch-button" disabled={switchingMode} onClick={onSwitchMode}>
          {role === 'editor' ? 'Back to View' : 'Edit'}
        </button>
      </nav>
    </header>
  )
}
