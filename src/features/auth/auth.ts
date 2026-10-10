import { EDITOR_PASSWORD } from '../../config/auth'

const EDITOR_SESSION_KEY = 'ostrich-boy-editor-session'

export function hasEditorSession() {
  try { return sessionStorage.getItem(EDITOR_SESSION_KEY) === 'active' }
  catch { return false }
}

export function authenticateEditor(password: string) {
  if (password !== EDITOR_PASSWORD) return false
  sessionStorage.setItem(EDITOR_SESSION_KEY, 'active')
  return true
}

export function endEditorSession() {
  sessionStorage.removeItem(EDITOR_SESSION_KEY)
}
