import { createClient } from '@supabase/supabase-js'

let supabaseClient

function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables: SUPABASE_URL and SUPABASE_ANON_KEY',
    )
  }

  return createClient(supabaseUrl, supabaseKey)
}

export function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient()
  }

  return supabaseClient
}