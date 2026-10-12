import type { Domain, SubmissionEnvelope, ValidatedSubmissionEnvelope } from '../types'

export const AXIOM_SCHEMA_VERSION = 1 as const
export const AXIOM_PROJECT_ID = 'personal-progression' as const
const domains: Domain[] = ['physical', 'mental', 'intellectual', 'discipline', 'social', 'life']
const kinds = ['measurement', 'activity', 'milestone', 'habit_check', 'reflection', 'correction']

export interface EnvelopeValidation { envelope?: ValidatedSubmissionEnvelope; errors: string[]; warnings: string[] }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function isDate(value: unknown) { return typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Date.parse(value)) }
function stripMarkdownFence(value: string) { const trimmed = value.trim(); const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i); return match ? match[1] : trimmed }

export function parseEnvelopeText(value: string): EnvelopeValidation {
  try { return validateEnvelope(JSON.parse(stripMarkdownFence(value))) }
  catch { return { errors: ['The file or pasted content is not valid JSON.'], warnings: [] } }
}

export function validateEnvelope(input: unknown): EnvelopeValidation {
  const errors: string[] = []; const warnings: string[] = []
  if (!isRecord(input)) return { errors: ['The import must be one JSON object.'], warnings }
  if (input.project_id !== AXIOM_PROJECT_ID) errors.push(`project_id must be "${AXIOM_PROJECT_ID}".`)
  if (input.schema_version !== AXIOM_SCHEMA_VERSION) errors.push(`schema_version must be ${AXIOM_SCHEMA_VERSION}.`)
  if (!Array.isArray(input.entries) || input.entries.length === 0) errors.push('entries must contain at least one update.')
  if (Array.isArray(input.entries) && input.entries.length > 100) errors.push('A single import can contain at most 100 entries.')
  if (!isDate(input.reported_at)) errors.push('reported_at must be an ISO date and time.')
  if (input.effective_date !== undefined && (typeof input.effective_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.effective_date))) errors.push('effective_date must use YYYY-MM-DD.')
  if (!isRecord(input.source) || input.source.type !== 'conversation' || typeof input.source.reference !== 'string' || !input.source.reference.trim()) errors.push('source must identify the conversation with type "conversation" and a reference.')
  if (input.requires_owner_review !== true) errors.push('requires_owner_review must be true.')
  if (Array.isArray(input.entries)) input.entries.forEach((raw, index) => {
    const path = `entries[${index}]`
    if (!isRecord(raw)) { errors.push(`${path} must be an object.`); return }
    if (!domains.includes(raw.domain as Domain)) errors.push(`${path}.domain is not supported.`)
    if (!kinds.includes(String(raw.kind))) errors.push(`${path}.kind is not supported.`)
    if (typeof raw.summary !== 'string' || !raw.summary.trim()) errors.push(`${path}.summary is required.`)
    if (typeof raw.summary === 'string' && raw.summary.length > 500) errors.push(`${path}.summary must be 500 characters or fewer.`)
    if (raw.value !== undefined && (typeof raw.value !== 'number' || !Number.isFinite(raw.value))) errors.push(`${path}.value must be a finite number.`)
    if (raw.confidence !== undefined && (typeof raw.confidence !== 'number' || raw.confidence < 0 || raw.confidence > 1)) errors.push(`${path}.confidence must be between 0 and 1.`)
    if (raw.occurred_at !== undefined && !isDate(raw.occurred_at)) errors.push(`${path}.occurred_at must be an ISO date and time.`)
    if (raw.tags !== undefined && (!Array.isArray(raw.tags) || raw.tags.some(tag => typeof tag !== 'string'))) errors.push(`${path}.tags must be an array of strings.`)
    if (raw.sensitive !== undefined && typeof raw.sensitive !== 'boolean') errors.push(`${path}.sensitive must be true or false.`)
    if (raw.kind === 'measurement' && raw.value === undefined) warnings.push(`${path} is a measurement without a numeric value.`)
    if (raw.value !== undefined && (typeof raw.unit !== 'string' || !raw.unit.trim())) warnings.push(`${path} has a value but no unit.`)
    if (!raw.occurred_at) warnings.push(`${path} has no occurrence time; the effective date will be used.`)
  })
  if (input.suggested_effects !== undefined && !Array.isArray(input.suggested_effects)) errors.push('suggested_effects must be an array.')
  if (errors.length) return { errors, warnings }
  return { envelope: input as unknown as ValidatedSubmissionEnvelope, errors, warnings }
}

export const exampleEnvelope: SubmissionEnvelope = {
  project_id: AXIOM_PROJECT_ID, schema_version: AXIOM_SCHEMA_VERSION, reported_at: new Date().toISOString(), effective_date: new Date().toISOString().slice(0, 10),
  source: { type: 'conversation', reference: 'Chat title or a short description' },
  entries: [{ domain: 'physical', metric: 'running_5k', kind: 'measurement', value: 28, unit: 'minutes', summary: 'Completed a 5 km run in 28 minutes.', confidence: 1, occurred_at: new Date().toISOString(), tags: ['running', 'cardio'], sensitive: false }],
  suggested_effects: [{ target: 'endurance', direction: 'increase', reason: 'Timed endurance result.' }], requires_owner_review: true,
}
