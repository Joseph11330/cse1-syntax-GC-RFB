import { createClient } from '@supabase/supabase-js'

let client

export function getSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Google sign-in is not configured. Add the Supabase URL and publishable key to GC-FRB/.env.local.')
  }

  client ??= createClient(url, anonKey)
  return client
}
