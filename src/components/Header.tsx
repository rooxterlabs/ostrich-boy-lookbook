import type { Role } from '../models/lookbook'

interface HeaderProps {
  role: Role
  onHome: () => void
  onSwitchMode: () => void
  switchingMode?: boolean
}

export function Header({ role, onHome, onSwitchMode, switchingMode = false }: HeaderProps) {
  return (
    <header className="site-header">
      <button className="wordmark" onClick={onHome} aria-label="Go to lookbook home">
        <strong>OSTRICH BOY</strong>
        <span>Production Lookbook</span>
      </button>
      <nav className="header-actions" aria-label="Lookbook modes">
        <button className="mode-switch-button" disabled={switchingMode} onClick={onSwitchMode}>
          {role === 'editor' ? 'Back to View' : 'Edit'}
        </button>
      </nav>
    </header>
  )
}
