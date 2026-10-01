import type { Role } from '../../models/lookbook'

const VIEWER_PASSWORD = 'viewer'
const EDITOR_PASSWORD = 'editor'
const SESSION_KEY = 'ostrich-boy-session-role'

export const authenticateViewer = (password: string) => password === VIEWER_PASSWORD
export const authenticateEditor = (password: string) => password === EDITOR_PASSWORD

export const readSessionRole = (): Role => {
  const value = sessionStorage.getItem(SESSION_KEY)
  return value === 'viewer' || value === 'editor' ? 'viewer' : 'locked'
}

export const writeSessionRole = (role: Role) => {
  if (role === 'locked') sessionStorage.removeItem(SESSION_KEY)
  else sessionStorage.setItem(SESSION_KEY, 'viewer')
}
