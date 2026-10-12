import { createClient } from '@supabase/supabase-js'
import { requireServerConfig } from './config.js'

function client() {
  const { supabaseUrl, supabaseKey } = requireServerConfig()
  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}

export async function ownerLogin(email: string, password: string): Promise<string> {
  const { data, error } = await client().rpc('progress_login', { p_email: email, p_password: password })
  if (error || !data?.token) throw new Error('Invalid Axiom credentials')
  return String(data.token)
}

export async function progressCall<T>(session: string, action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await client().rpc('progress_api', { p_token: session, p_action: action, p_payload: payload })
  if (error) throw new Error(error.message)
  return data as T
}
