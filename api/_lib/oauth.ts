import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { ALLOWED_SCOPES, MCP_RESOURCE, ORIGIN, requireServerConfig } from './config.js'

export interface OAuthPayload {
  typ: 'code' | 'access' | 'refresh'
  exp: number
  client_id: string
  resource: string
  scope: string
  session: string
  redirect_uri?: string
  code_challenge?: string
}

function key() { return createHash('sha256').update(requireServerConfig().oauthSecret).digest() }
function toBase64Url(value: Buffer) { return value.toString('base64url') }

export function seal(payload: OAuthPayload) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  return [toBase64Url(iv), toBase64Url(ciphertext), toBase64Url(cipher.getAuthTag())].join('.')
}

export function open(token: string, expectedType: OAuthPayload['typ']): OAuthPayload {
  const [ivPart, ciphertextPart, tagPart] = token.split('.')
  if (!ivPart || !ciphertextPart || !tagPart) throw new Error('Invalid token')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivPart, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextPart, 'base64url')), decipher.final()]).toString('utf8')
  const payload = JSON.parse(plaintext) as OAuthPayload
  if (payload.typ !== expectedType || payload.exp <= Math.floor(Date.now() / 1000) || payload.resource !== MCP_RESOURCE) throw new Error('Expired or invalid token')
  return payload
}

export function validateClient(clientId: string, redirectUri: string) {
  const stableClient = clientId === 'https://chatgpt.com/oauth/client.json'
  const callbackClient = /^https:\/\/chatgpt\.com\/oauth\/[A-Za-z0-9_-]+\/client\.json$/.test(clientId)
  const stableRedirect = redirectUri === 'https://chatgpt.com/connector_platform_oauth_redirect'
  const callbackRedirect = /^https:\/\/chatgpt\.com\/connector\/oauth\/[A-Za-z0-9_-]+$/.test(redirectUri)
  return (stableClient && stableRedirect) || (callbackClient && callbackRedirect)
}

export function normalizeScopes(value: string | null) {
  const requested = (value || 'axiom.read axiom.write offline_access').split(/\s+/).filter(Boolean)
  if (requested.some(scope => !ALLOWED_SCOPES.includes(scope as typeof ALLOWED_SCOPES[number]))) throw new Error('Unsupported scope')
  return [...new Set(requested)].join(' ')
}

export function verifyPkce(verifier: string, challenge: string) {
  if (verifier.length < 43 || verifier.length > 128) return false
  const actual = createHash('sha256').update(verifier).digest()
  const expected = Buffer.from(challenge, 'base64url')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function hasScope(payload: OAuthPayload, scope: string) { return payload.scope.split(' ').includes(scope) }
export const issuer = ORIGIN
