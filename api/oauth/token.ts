import type { ServerResponse } from 'node:http'
import { MCP_RESOURCE } from '../_lib/config.js'
import { readBody, sendJson, type ApiRequest } from '../_lib/http.js'
import { open, seal, validateClient, verifyPkce } from '../_lib/oauth.js'

function oauthError(res: ServerResponse, error: string, description: string, status = 400) { return sendJson(res, status, { error, error_description: description }) }

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== 'POST') return oauthError(res, 'invalid_request', 'POST required', 405)
  const raw = await readBody(req)
  const params = req.headers['content-type']?.includes('application/json') ? new URLSearchParams(JSON.parse(raw)) : new URLSearchParams(raw)
  const grantType = params.get('grant_type') || ''
  const clientId = params.get('client_id') || ''
  const resource = params.get('resource') || MCP_RESOURCE
  try {
    if (grantType === 'authorization_code') {
      const code = open(params.get('code') || '', 'code')
      const redirectUri = params.get('redirect_uri') || ''
      if (code.client_id !== clientId || code.redirect_uri !== redirectUri || !validateClient(clientId, redirectUri) || resource !== code.resource || !verifyPkce(params.get('code_verifier') || '', code.code_challenge || '')) throw new Error('Authorization code validation failed')
      console.info('OAuth authorization code accepted')
      return tokenResponse(res, code.client_id, code.resource, code.scope, code.session)
    }
    if (grantType === 'refresh_token') {
      const refresh = open(params.get('refresh_token') || '', 'refresh')
      if (refresh.client_id !== clientId || refresh.resource !== resource) throw new Error('Refresh token validation failed')
      return tokenResponse(res, refresh.client_id, refresh.resource, refresh.scope, refresh.session)
    }
    return oauthError(res, 'unsupported_grant_type', 'Use authorization_code or refresh_token')
  } catch (error) {
    console.warn('OAuth token exchange rejected', { grantType, reason: error instanceof Error ? error.message : 'Unknown error' })
    return oauthError(res, 'invalid_grant', 'The authorization grant is invalid or expired')
  }
}

function tokenResponse(res: ServerResponse, clientId: string, resource: string, scope: string, session: string) {
  const now = Math.floor(Date.now() / 1000)
  const accessToken = seal({ typ: 'access', exp: now + 3600, client_id: clientId, resource, scope, session })
  const refreshToken = seal({ typ: 'refresh', exp: now + 60 * 60 * 24 * 30, client_id: clientId, resource, scope, session })
  return sendJson(res, 200, { access_token: accessToken, token_type: 'Bearer', expires_in: 3600, refresh_token: refreshToken, scope })
}
