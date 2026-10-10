import { createClient } from '@supabase/supabase-js'
import { createEditorHandler } from './handler.ts'

const getClient = () => {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Server credentials are unavailable.')
  // This credential exists only in the Edge Function's server environment.
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}

Deno.serve(createEditorHandler(getClient))
