import type { Role } from '../models/lookbook'

interface HeaderProps {
  role: Role
  onHome: () => void
  onSwitchMode: () => void
}

export function Header({ role, onHome, onSwitchMode }: HeaderProps) {
  return (
    <header className="site-header">
      <button className="wordmark" onClick={onHome} aria-label="Go to lookbook home">
        <strong>OSTRICH BOY</strong>
        <span>Production Lookbook</span>
      </button>
      <nav className="header-actions" aria-label="Session actions">
        <button className="mode-switch-button" onClick={onSwitchMode}>
          {role === 'editor' ? 'Viewer mode' : 'Edit mode'}
        </button>
      </nav>
    </header>
  )
}
