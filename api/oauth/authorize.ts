import type { ServerResponse } from 'node:http'
import { MCP_RESOURCE, ORIGIN, OWNER_EMAIL } from '../_lib/config.js'
import { escapeHtml, readBody, sendHtml, type ApiRequest } from '../_lib/http.js'
import { issuer, normalizeScopes, seal, validateClient } from '../_lib/oauth.js'
import { ownerLogin } from '../_lib/supabase.js'

function paramsFrom(req: ApiRequest, raw?: string) {
  const url = new URL(req.url || '/oauth/authorize', ORIGIN)
  return raw === undefined ? url.searchParams : new URLSearchParams(raw)
}

function failRedirect(res: ServerResponse, redirectUri: string, state: string, message: string) {
  const target = new URL(redirectUri); target.searchParams.set('error', 'access_denied'); target.searchParams.set('error_description', message); if (state) target.searchParams.set('state', state); target.searchParams.set('iss', issuer)
  res.writeHead(302, { Location: target.toString(), 'Cache-Control': 'no-store' }); res.end()
}

export default async function handler(req: ApiRequest, res: ServerResponse) {
  const raw = req.method === 'POST' ? await readBody(req) : undefined
  const params = paramsFrom(req, raw)
  const clientId = params.get('client_id') || ''
  const redirectUri = params.get('redirect_uri') || ''
  const state = params.get('state') || ''
  const resource = params.get('resource') || ''
  const challenge = params.get('code_challenge') || ''
  const challengeMethod = params.get('code_challenge_method') || ''
  const checks = {
    client: validateClient(clientId, redirectUri),
    responseType: params.get('response_type') === 'code',
    resource: resource === MCP_RESOURCE,
    pkceMethod: challengeMethod === 'S256',
    pkceChallenge: Boolean(challenge),
  }
  if (Object.values(checks).some(valid => !valid)) {
    const failed = Object.entries(checks).filter(([, valid]) => !valid).map(([name]) => name)
    console.warn('Rejected OAuth authorization request', {
      failed,
      clientOrigin: safeOrigin(clientId),
      redirectOrigin: safeOrigin(redirectUri),
      hasState: Boolean(state),
    })
    return sendHtml(res, 400, `<h1>Invalid OAuth request</h1><p>Rejected fields: ${escapeHtml(failed.join(', '))}</p>`)
  }
  let scope: string
  try { scope = normalizeScopes(params.get('scope')) } catch { return failRedirect(res, redirectUri, state, 'Unsupported permission scope') }

  if (req.method === 'POST') {
    const password = params.get('password') || ''
    try {
      const session = await ownerLogin(OWNER_EMAIL, password)
      const code = seal({ typ: 'code', exp: Math.floor(Date.now() / 1000) + 300, client_id: clientId, redirect_uri: redirectUri, code_challenge: challenge, resource, scope, session })
      const target = new URL(redirectUri); target.searchParams.set('code', code); if (state) target.searchParams.set('state', state); target.searchParams.set('iss', issuer)
      res.writeHead(302, { Location: target.toString(), 'Cache-Control': 'no-store' }); return res.end()
    } catch { return sendHtml(res, 401, loginPage(params, 'That password did not unlock Axiom.')) }
  }
  return sendHtml(res, 200, loginPage(params))
}

function safeOrigin(value: string) {
  try { return new URL(value).origin } catch { return 'invalid' }
}

function loginPage(params: URLSearchParams, error = '') {
  const hidden = [...params.entries()].map(([key, value]) => key === 'password' ? '' : `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}">`).join('')
  const permissions = params.get('scope')?.includes('axiom.write') ? 'Read your status panel and submit evidence to your pending review queue.' : 'Read your status panel.'
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>Connect Axiom</title><style>body{margin:0;background:#0b0e11;color:#e8eced;font:15px system-ui;display:grid;min-height:100vh;place-items:center}.card{width:min(390px,calc(100% - 40px));background:#12171b;border:1px solid #303a40;padding:30px}.mark{color:#c9ff4a;font:12px monospace;letter-spacing:.15em}h1{font-size:30px;margin:18px 0 8px}p{color:#8d999f;line-height:1.55}.permission{border-left:2px solid #c9ff4a;padding:10px 12px;background:#0e1316;color:#cbd2d5}label{display:block;margin:22px 0 8px;font:11px monospace;color:#9ba5aa}input{box-sizing:border-box;width:100%;padding:13px;background:#0b1013;border:1px solid #39434a;color:white}button{width:100%;margin-top:18px;padding:13px;border:0;background:#c9ff4a;color:#111;font-weight:700}.error{color:#ff9298}</style></head><body><main class="card"><div class="mark">AXIOM / PRIVATE CONNECTION</div><h1>Connect your status panel</h1><p>Signing in lets ChatGPT use only the permissions shown below.</p><div class="permission">${escapeHtml(permissions)}</div>${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}<form method="post">${hidden}<label>OWNER EMAIL</label><input value="${escapeHtml(OWNER_EMAIL)}" readonly><label for="password">AXIOM PASSWORD</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus><button>Authorize ChatGPT</button></form></main></body></html>`
}
