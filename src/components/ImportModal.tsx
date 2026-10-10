import { FormEvent, useState } from 'react'
import { X } from 'lucide-react'
import type { SubmissionEnvelope } from '../types'

export function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (data: SubmissionEnvelope) => Promise<void> }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) { event.preventDefault(); try { const parsed = JSON.parse(value) as SubmissionEnvelope; if (parsed.project_id !== 'personal-progression' || !Array.isArray(parsed.entries)) throw new Error('This is not a valid personal-progression envelope.'); setBusy(true); await onImport(parsed); } catch (e) { setError(e instanceof Error ? e.message : 'Invalid JSON'); setBusy(false) } }
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal import-modal" onMouseDown={(e)=>e.stopPropagation()} aria-modal="true" role="dialog">
    <button className="modal-close" onClick={onClose} aria-label="Close"><X size={18}/></button><span className="eyebrow">Conversation bridge</span><h2>Import a progress envelope</h2><p className="muted">Paste JSON returned by another chat. Every entry will wait for your approval.</p>
    <form onSubmit={submit}><textarea className="json-input" value={value} onChange={(e)=>setValue(e.target.value)} placeholder={'{\n  "project_id": "personal-progression",\n  "schema_version": 1,\n  "entries": [...]\n}'} required />
    {error && <p className="form-message">{error}</p>}<button className="primary wide" disabled={busy}>{busy ? 'Importing…' : 'Import pending evidence'}</button></form>
  </section></div>
}
