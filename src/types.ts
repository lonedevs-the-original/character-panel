export type Domain = 'physical' | 'mental' | 'intellectual' | 'discipline' | 'social' | 'life'

export interface Profile {
  user_id: string
  display_name: string
  level: number
  xp: number
  active_arc: string
  title: string
  class_name?: string
  subclass_name?: string
  character_data?: CharacterData
}

export interface RankedItem { name: string; rank?: string; level?: number; description?: string; evidence?: string[]; confidence?: number; status?: 'active' | 'latent' | 'locked' | 'unassessed'; parent?: string }
export interface CharacterCondition { name: string; kind: 'buff' | 'debuff' | 'neutral'; description?: string; expires_at?: string }
export interface Achievement { name: string; category?: string; rarity?: string; description?: string; earned_at?: string; evidence?: string[] }
export interface CharacterSnapshot { assessed_at: string; summary: string; source?: string; changes?: string[] }
export interface CharacterData { designation?: string; class_name?: string; subclass_name?: string; specialization?: string; rank?: string; assessment_status?: string; traits?: RankedItem[]; skills?: RankedItem[]; titles?: RankedItem[]; achievements?: Achievement[]; conditions?: CharacterCondition[]; unlocks?: RankedItem[]; records?: Achievement[]; history?: CharacterSnapshot[] }

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

export interface ValidatedSubmissionEnvelope extends SubmissionEnvelope {
  reported_at: string
  source: { type: 'conversation'; reference: string }
  requires_owner_review: true
}
