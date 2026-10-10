export type Domain = 'physical' | 'mental' | 'intellectual' | 'discipline' | 'social' | 'life'

export interface Profile {
  user_id: string
  display_name: string
  level: number
  xp: number
  active_arc: string
  title: string
}

export interface Attribute {
  id: string
  name: string
  domain: Domain
  score: number
  max_score: number
  accent: string
  sort_order: number
}

export interface Quest {
  id: string
  title: string
  domain: Domain
  progress: number
  target: number
  unit: string
  status: 'active' | 'completed' | 'archived'
  due_date: string | null
}

export interface SuggestedEffect {
  target: string
  direction?: 'increase' | 'decrease' | 'none'
  delta?: number
  reason?: string
}

export interface EvidenceEntry {
  id: string
  kind: string
  domain: Domain
  metric: string | null
  numeric_value: number | null
  unit: string | null
  summary: string
  confidence: number
  occurred_at: string
  tags: string[]
  status: 'pending' | 'approved' | 'rejected'
  source_reference: string | null
  suggested_effects: SuggestedEffect[]
}

export interface SubmissionEnvelope {
  project_id: 'personal-progression'
  schema_version: 1
  reported_at?: string
  effective_date?: string
  source?: { type?: string; reference?: string }
  entries: Array<{
    domain: Domain
    metric?: string
    kind: string
    value?: number
    unit?: string
    summary: string
    confidence?: number
    occurred_at?: string
    tags?: string[]
    sensitive?: boolean
  }>
  suggested_effects?: SuggestedEffect[]
  requires_owner_review?: boolean
}
