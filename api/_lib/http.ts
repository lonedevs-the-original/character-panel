import type { IncomingMessage, ServerResponse } from 'node:http'

export type ApiRequest = IncomingMessage & { body?: unknown; query?: Record<string, string | string[]> }

export function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers })
  res.end(JSON.stringify(body))
}

export function sendHtml(res: ServerResponse, status: number, body: string) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  })
  res.end(body)
}

export async function readBody(req: ApiRequest): Promise<string> {
  if (typeof req.body === 'string') return req.body
  if (req.body && typeof req.body === 'object') {
    if (req.headers['content-type']?.includes('application/json')) return JSON.stringify(req.body)
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(req.body as Record<string, unknown>)) {
      if (Array.isArray(value)) value.forEach(item => params.append(key, String(item)))
      else if (value !== undefined && value !== null) params.set(key, String(value))
    }
    return params.toString()
  }
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!)
}
