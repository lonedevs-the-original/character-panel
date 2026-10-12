import type { ServerResponse } from 'node:http'
import { MCP_RESOURCE, ORIGIN } from '../_lib/config.js'
import { sendJson, type ApiRequest } from '../_lib/http.js'

export default function handler(_req: ApiRequest, res: ServerResponse) {
  sendJson(res, 200, {
    resource: MCP_RESOURCE,
    authorization_servers: [ORIGIN],
    scopes_supported: ['axiom.read', 'axiom.write', 'offline_access'],
    resource_name: 'Axiom Personal Progression',
    resource_documentation: ORIGIN,
  })
}
