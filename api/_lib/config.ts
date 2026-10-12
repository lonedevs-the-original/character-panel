export const ORIGIN = 'https://character-panel.vercel.app'
export const MCP_RESOURCE = `${ORIGIN}/mcp`
export const RESOURCE_METADATA_URL = `${ORIGIN}/.well-known/oauth-protected-resource`
export const OWNER_EMAIL = process.env.VITE_OWNER_EMAIL || 'javohirizzatullayev@gmail.com'
export const ALLOWED_SCOPES = ['axiom.read', 'axiom.write', 'offline_access'] as const

export function requireServerConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const oauthSecret = process.env.AXIOM_OAUTH_SECRET
  if (!supabaseUrl || !supabaseKey || !oauthSecret) throw new Error('Server configuration is incomplete')
  return { supabaseUrl, supabaseKey, oauthSecret }
}
