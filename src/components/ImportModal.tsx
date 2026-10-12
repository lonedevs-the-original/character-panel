import { ChangeEvent, useRef, useState } from 'react'
import { CheckCircle2, Download, FileJson, Upload, X } from 'lucide-react'
import { exampleEnvelope, parseEnvelopeText } from '../lib/importEnvelope'
import type { ValidatedSubmissionEnvelope } from '../types'
import './ImportModal.css'

export function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (data: ValidatedSubmissionEnvelope) => Promise<void> }) {
  const [value, setValue] = useState('')
  const [fileName, setFileName] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [preview, setPreview] = useState<ValidatedSubmissionEnvelope | null>(null)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  function prepare(text = value) {
    const result = parseEnvelopeText(text)
    setErrors(result.errors); setWarnings(result.warnings); setPreview(result.envelope ?? null)
  }

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 512_000) { setErrors(['Import files must be smaller than 500 KB.']); return }
    const text = await file.text()
    setValue(text); setFileName(file.name); prepare(text)
  }

  function downloadExample() {
    const blob = new Blob([JSON.stringify(exampleEnvelope, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'axiom-update.example.json'; anchor.click(); URL.revokeObjectURL(url)
  }

  async function submit() {
    if (!preview) return
    setBusy(true)
    try { await onImport(preview) } finally { setBusy(false) }
  }

  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal import-modal" onMouseDown={(event)=>event.stopPropagation()} aria-modal="true" role="dialog" aria-labelledby="import-title">
    <button className="modal-close" onClick={onClose} aria-label="Close"><X size={18}/></button>
    <span className="eyebrow">Conversation bridge · schema v1</span><h2 id="import-title">Import a conversation update</h2>
    <p className="muted">Upload or paste JSON produced by the Axiom conversation skill. Validate and inspect it here; imported entries still wait in your review queue.</p>
    {!preview ? <>
      <div className="import-actions">
        <button type="button" className="secondary" onClick={()=>fileInput.current?.click()}><Upload size={16}/> Upload JSON</button>
        <button type="button" className="secondary" onClick={downloadExample}><Download size={16}/> Example file</button>
        <input ref={fileInput} className="visually-hidden" type="file" accept="application/json,.json" onChange={readFile}/>
      </div>
      {fileName && <p className="selected-file"><FileJson size={15}/> {fileName}</p>}
      <label htmlFor="axiom-json">JSON envelope</label>
      <textarea id="axiom-json" className="json-input" value={value} onChange={(event)=>{setValue(event.target.value);setPreview(null);setErrors([])}} placeholder={'{\n  "project_id": "personal-progression",\n  "schema_version": 1,\n  "entries": [...]\n}'} spellCheck={false}/>
      {errors.length > 0 && <div className="validation-box error"><strong>Fix before importing</strong><ul>{errors.map(error=><li key={error}>{error}</li>)}</ul></div>}
      <button className="primary wide" type="button" onClick={()=>prepare()} disabled={!value.trim()}>Validate and preview</button>
    </> : <>
      <div className="validation-summary"><CheckCircle2 size={19}/><div><strong>Valid Axiom update</strong><span>{preview.entries.length} entr{preview.entries.length === 1 ? 'y' : 'ies'} from {preview.source.reference}</span></div></div>
      {warnings.length > 0 && <div className="validation-box warning"><strong>Review these warnings</strong><ul>{warnings.map(warning=><li key={warning}>{warning}</li>)}</ul></div>}
      <div className="import-preview">{preview.entries.map((entry,index)=><article key={`${entry.summary}-${index}`}><span>{entry.domain} · {entry.kind}</span><strong>{entry.summary}</strong><small>{entry.value ?? 'No numeric value'} {entry.unit ?? ''}{entry.confidence !== undefined ? ` · ${Math.round(entry.confidence * 100)}% confidence` : ''}</small></article>)}</div>
      <div className="import-footer"><button className="secondary" type="button" onClick={()=>setPreview(null)}>Back to JSON</button><button className="primary" type="button" disabled={busy} onClick={submit}>{busy ? 'Importing…' : `Import ${preview.entries.length} for review`}</button></div>
    </>}
  </section></div>
}
