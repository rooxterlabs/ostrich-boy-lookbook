import type { Role } from '../../models/lookbook'
import { getSupabaseClient } from '../supabase/client'

const ACCOUNT_EMAILS = {
  viewer: 'viewer@ostrich-boy.invalid',
  editor: 'editor@ostrich-boy.invalid',
} as const

async function authenticate(role: Exclude<Role, 'locked'>, password: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email: ACCOUNT_EMAILS[role], password })
  if (error || !data.user) return false

  const { data: access, error: accessError } = await supabase
    .from('lookbook_access_roles')
    .select('role')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (accessError || access?.role !== role) {
    await supabase.auth.signOut({ scope: 'local' })
    return false
  }

  return true
}

export const authenticateViewer = (password: string) => authenticate('viewer', password)
export const authenticateEditor = (password: string) => authenticate('editor', password)
export const readSessionRole = (): Role => 'locked'
