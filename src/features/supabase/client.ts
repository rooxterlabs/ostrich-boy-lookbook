import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || 'https://wrqpiuwluhvbgvxkvzxc.supabase.co'
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || 'sb_publishable_bPTR_hzDqpN4ee9OLpoNHQ_sVHjLMVj'

let client: SupabaseClient | undefined

export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabasePublishableKey)

export function getSupabaseClient() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Supabase is not configured. Add the project URL and publishable key to .env.local.')
  }

  client ??= createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Never restore an Editor session after a browser reload.
      persistSession: false,
    },
  })

  return client
}
