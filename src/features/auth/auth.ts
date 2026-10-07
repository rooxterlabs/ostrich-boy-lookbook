import { getSupabaseClient } from '../supabase/client'

export async function authenticateEditor(password: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'editor@ostrich-boy.invalid',
    password,
  })
  if (error || !data.user) return false

  const { data: access, error: accessError } = await supabase
    .from('lookbook_access_roles')
    .select('role')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (accessError || access?.role !== 'editor') {
    await supabase.auth.signOut({ scope: 'local' })
    return false
  }
  return true
}

export async function endEditorSession() {
  // Local scope signs out this tab without interrupting other editors.
  // Supabase also clears the in-memory session if the logout request fails.
  await getSupabaseClient().auth.signOut({ scope: 'local' })
}
