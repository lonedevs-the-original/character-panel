import type { ServerResponse } from 'node:http'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import * as z from 'zod/v4'
import { MCP_RESOURCE, RESOURCE_METADATA_URL } from './_lib/config.js'
import { sendJson, type ApiRequest } from './_lib/http.js'
import { hasScope, open, type OAuthPayload } from './_lib/oauth.js'
import { characterCall, progressCall } from './_lib/supabase.js'

const domain = z.enum(['physical', 'mental', 'intellectual', 'discipline', 'social', 'life'])
const kind = z.enum(['measurement', 'activity', 'milestone', 'habit_check', 'reflection', 'correction'])
const effect = z.object({ target: z.string().min(1).max(80), direction: z.enum(['increase', 'decrease', 'none']).optional(), delta: z.number().finite().optional(), reason: z.string().max(300).optional() })
const entry = z.object({ domain, metric: z.string().max(80).optional(), kind, value: z.number().finite().optional(), unit: z.string().max(40).optional(), summary: z.string().min(1).max(500), confidence: z.number().min(0).max(1).optional(), occurred_at: z.iso.datetime({ offset: true }).optional(), tags: z.array(z.string().max(40)).max(20).optional(), sensitive: z.boolean().optional() })
const schemes = [{ type: 'oauth2', scopes: ['axiom.read', 'axiom.write'] }]
const rankedItem = z.object({ name: z.string().min(1).max(120), rank: z.string().max(60).optional(), level: z.number().nonnegative().optional(), description: z.string().max(800).optional(), evidence: z.array(z.string().max(300)).max(20).optional(), confidence: z.number().min(0).max(1).optional(), status: z.enum(['active','latent','locked','unassessed']).optional(), parent: z.string().max(120).optional() })
const achievement = z.object({ name: z.string().min(1).max(120), category: z.string().max(60).optional(), rarity: z.string().max(60).optional(), description: z.string().max(800).optional(), earned_at: z.string().optional(), evidence: z.array(z.string().max(300)).max(20).optional() })
const panelSchema = z.object({ designation: z.string().max(120).optional(), class_name: z.string().max(120).optional(), subclass_name: z.string().max(120).optional(), specialization: z.string().max(120).optional(), rank: z.string().max(60).optional(), assessment_status: z.string().max(120).optional(), traits: z.array(rankedItem).max(100).optional(), skills: z.array(rankedItem).max(300).optional(), titles: z.array(rankedItem).max(100).optional(), achievements: z.array(achievement).max(300).optional(), conditions: z.array(z.object({ name: z.string().min(1).max(120), kind: z.enum(['buff','debuff','neutral']), description: z.string().max(500).optional(), expires_at: z.string().optional() })).max(100).optional(), unlocks: z.array(rankedItem).max(100).optional(), records: z.array(achievement).max(200).optional(), history: z.array(z.object({ assessed_at: z.string(), summary: z.string().max(500), source: z.string().max(200).optional(), changes: z.array(z.string().max(300)).max(50).optional() })).max(200).optional() })

function authenticate(req: ApiRequest): OAuthPayload | null {
  const value = req.headers.authorization
  if (!value?.startsWith('Bearer ')) return null
  try { return open(value.slice(7), 'access') } catch { return null }
}

function textResult(value: unknown, message: string) { return { content: [{ type: 'text' as const, text: message }], structuredContent: value as Record<string, unknown> } }

function createServer(auth: OAuthPayload) {
  const server = new McpServer({ name: 'Axiom Personal Progression', version: '1.0.0' }, { instructions: 'Axiom is a private, evidence-based status panel. Use read tools for current state. Submit only facts the owner explicitly reported in the current conversation. Never invent measurements. All submitted evidence enters a pending owner-review queue; this server cannot approve or delete it.' })
  const commonMeta = { securitySchemes: schemes }

  server.registerTool('get_axiom_profile', {
    title: 'Get Axiom connection profile', description: 'Use this to identify the connected Axiom owner account and basic progression identity.', inputSchema: {}, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: { ...commonMeta, 'openai/profile': true },
  }, async () => {
    if (!hasScope(auth, 'axiom.read')) throw new Error('Missing axiom.read permission')
    const data = await progressCall<{ profile: unknown }>(auth.session, 'bootstrap')
    return textResult({ profile: data.profile }, 'Connected to the private Axiom owner profile.')
  })

  server.registerTool('read_character_panel', {
    title: 'Read character panel', description: 'Use this when the owner asks about current attributes, quests, recent evidence, or pending updates in Axiom. This does not change data.', inputSchema: {}, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: commonMeta,
  }, async () => {
    if (!hasScope(auth, 'axiom.read')) throw new Error('Missing axiom.read permission')
    const [data, character_panel] = await Promise.all([progressCall<Record<string, unknown>>(auth.session, 'bootstrap'), characterCall<Record<string, unknown>>(auth.session, 'read')])
    return textResult({ ...data, character_panel }, 'Here is the current Axiom character panel and review queue.')
  })

  server.registerTool('upsert_character_panel', {
    title: 'Update evaluated character panel', description: 'Replace the current structured character panel with an assessment prepared from owner-provided evidence. Axiom stores and versions this assessment; it does not calculate ranks or infer facts.', inputSchema: { panel: panelSchema, assessed_at: z.iso.datetime({ offset: true }), source_reference: z.string().min(1).max(200) }, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }, _meta: { ...commonMeta, 'openai/toolInvocation/invoking': 'Updating character panel', 'openai/toolInvocation/invoked': 'Character panel updated' },
  }, async ({ panel, assessed_at, source_reference }) => {
    if (!hasScope(auth, 'axiom.write')) throw new Error('Missing axiom.write permission')
    const result = await characterCall<Record<string, unknown>>(auth.session, 'upsert', { panel, assessed_at, source_reference })
    return textResult(result, 'Axiom stored the evaluated character panel and preserved the prior version.')
  })

  server.registerTool('submit_progress_evidence', {
    title: 'Submit progress evidence', description: 'Use this after extracting concrete progress evidence explicitly reported by the owner in the current conversation. Creates pending review entries only; it does not approve evidence, change attribute scores, delete records, or import unrelated chat content.',
    inputSchema: { source_reference: z.string().min(1).max(200).describe('Chat title or concise human-readable source reference'), reported_at: z.iso.datetime({ offset: true }), effective_date: z.iso.date().optional(), entries: z.array(entry).min(1).max(100), suggested_effects: z.array(effect).max(30).optional() },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }, _meta: { ...commonMeta, 'openai/toolInvocation/invoking': 'Submitting evidence for review', 'openai/toolInvocation/invoked': 'Evidence added to review queue' },
  }, async ({ source_reference, reported_at, effective_date, entries, suggested_effects }) => {
    if (!hasScope(auth, 'axiom.write')) throw new Error('Missing axiom.write permission')
    await progressCall(auth.session, 'import_envelope', { project_id: 'personal-progression', schema_version: 1, reported_at, effective_date, source: { type: 'conversation', reference: source_reference }, entries, suggested_effects: suggested_effects ?? [], requires_owner_review: true })
    return textResult({ accepted: entries.length, status: 'pending', review_url: `${MCP_RESOURCE.replace('/mcp', '')}/#review` }, `${entries.length} progress ${entries.length === 1 ? 'entry was' : 'entries were'} submitted to Axiom for owner review.`)
  })
  return server
}

export default async function handler(req: ApiRequest, res: ServerResponse) {
  const auth = authenticate(req)
  if (!auth) return sendJson(res, 401, { error: 'unauthorized', error_description: 'Connect your Axiom account to continue.' }, { 'WWW-Authenticate': `Bearer resource_metadata="${RESOURCE_METADATA_URL}", scope="axiom.read axiom.write"` })
  if (req.method !== 'POST') return sendJson(res, 405, { jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed' }, id: null }, { Allow: 'POST' })
  const server = createServer(auth)
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  try {
    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
  } catch {
    if (!res.headersSent) sendJson(res, 500, { jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null })
  } finally {
    await transport.close(); await server.close()
  }
}
