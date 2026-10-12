import type { ServerResponse } from 'node:http'
import { ORIGIN } from '../_lib/config.js'
import { sendJson, type ApiRequest } from '../_lib/http.js'

export default function handler(_req: ApiRequest, res: ServerResponse) {
  sendJson(res, 200, {
    issuer: ORIGIN,
    authorization_response_iss_parameter_supported: true,
    authorization_endpoint: `${ORIGIN}/oauth/authorize`,
    token_endpoint: `${ORIGIN}/oauth/token`,
    client_id_metadata_document_supported: true,
    token_endpoint_auth_methods_supported: ['none'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: ['axiom.read', 'axiom.write', 'offline_access'],
  })
}
