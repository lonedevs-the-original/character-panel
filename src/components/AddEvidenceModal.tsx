import { FormEvent, useState } from 'react'
import { X } from 'lucide-react'
import type { Domain } from '../types'

interface EvidenceDraft { domain: Domain; kind: string; summary: string; metric: string; value: string; unit: string }

export function AddEvidenceModal({ onClose, onSave }: { onClose: () => void; onSave: (draft: EvidenceDraft) => Promise<void> }) {
  const [draft, setDraft] = useState<EvidenceDraft>({ domain: 'physical', kind: 'activity', summary: '', metric: '', value: '', unit: '' })
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); await onSave(draft); setBusy(false) }
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" onMouseDown={(e) => e.stopPropagation()} aria-modal="true" role="dialog">
    <button className="modal-close" onClick={onClose} aria-label="Close"><X size={18}/></button>
    <span className="eyebrow">New evidence</span><h2>Record what happened</h2>
    <form onSubmit={submit}>
      <div className="form-grid"><div><label>Domain</label><select value={draft.domain} onChange={(e)=>setDraft({...draft,domain:e.target.value as Domain})}>{['physical','mental','intellectual','discipline','social','life'].map(x=><option key={x}>{x}</option>)}</select></div>
      <div><label>Type</label><select value={draft.kind} onChange={(e)=>setDraft({...draft,kind:e.target.value})}>{['measurement','activity','milestone','habit_check','reflection'].map(x=><option key={x}>{x}</option>)}</select></div></div>
      <label>Summary</label><textarea value={draft.summary} onChange={(e)=>setDraft({...draft,summary:e.target.value})} placeholder="What did you do, notice, or achieve?" required />
      <div className="form-grid three"><div><label>Metric</label><input value={draft.metric} onChange={(e)=>setDraft({...draft,metric:e.target.value})} placeholder="running_5k" /></div><div><label>Value</label><input type="number" step="any" value={draft.value} onChange={(e)=>setDraft({...draft,value:e.target.value})} /></div><div><label>Unit</label><input value={draft.unit} onChange={(e)=>setDraft({...draft,unit:e.target.value})} placeholder="minutes" /></div></div>
      <button className="primary wide" disabled={busy}>{busy ? 'Saving…' : 'Add to evidence'}</button>
    </form>
  </section></div>
}
