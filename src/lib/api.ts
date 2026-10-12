import { supabase } from './supabase'

const tokenKey = 'axiom-owner-session-v1'

export const customAuth = {
  getToken: () => localStorage.getItem(tokenKey),
  clear: () => localStorage.removeItem(tokenKey),
  async login(email: string, password: string) {
    const { data, error } = await supabase.rpc('progress_login', { p_email: email, p_password: password })
    if (error) throw error
    localStorage.setItem(tokenKey, data.token)
  },
  async call<T>(action: string, payload: Record<string, unknown> = {}) {
    const token = localStorage.getItem(tokenKey)
    if (!token) throw new Error('No session')
    const { data, error } = await supabase.rpc('progress_api', { p_token: token, p_action: action, p_payload: payload })
    if (error) throw error
    return data as T
  },
  async character<T>(action: 'read' | 'upsert', payload: Record<string, unknown> = {}) {
    const token = localStorage.getItem(tokenKey)
    if (!token) throw new Error('No session')
    const { data, error } = await supabase.rpc('progress_character_api', { p_token: token, p_action: action, p_payload: payload })
    if (error) throw error
    return data as T
  },
}
