import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ArrowUpRight, BookOpen, ChevronRight, CircleDot, Download, FileInput, LogOut, Menu, Plus, ShieldCheck, Sparkles, X } from 'lucide-react'
import { supabase } from './lib/supabase'
import type { Attribute, EvidenceEntry, Profile, Quest, SubmissionEnvelope } from './types'
import { Login } from './components/Login'
import { AttributeCard } from './components/AttributeCard'
import { QuestRow } from './components/QuestRow'
import { AddEvidenceModal } from './components/AddEvidenceModal'
import { ImportModal } from './components/ImportModal'
import './styles.css'

type Modal = 'evidence' | 'import' | null

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [quests, setQuests] = useState<Quest[]>([])
  const [entries, setEntries] = useState<EvidenceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Modal>(null)
  const [notice, setNotice] = useState('')
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setAuthReady(true) })
    return () => data.subscription.unsubscribe()
  }, [])

  const loadData = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const [p, a, q, e] = await Promise.all([
      supabase.from('progress_profiles').select('*').single(),
      supabase.from('progress_attributes').select('*').order('sort_order'),
      supabase.from('progress_quests').select('*').neq('status', 'archived').order('created_at'),
      supabase.from('progress_entries').select('*').order('occurred_at', { ascending: false }).limit(24),
    ])
    if (p.data) setProfile(p.data)
    if (a.data) setAttributes(a.data)
    if (q.data) setQuests(q.data)
    if (e.data) setEntries(e.data)
    const error = p.error || a.error || q.error || e.error
    if (error) setNotice(error.message)
    setLoading(false)
  }, [session])

  useEffect(() => { void loadData() }, [loadData])

  const pending = useMemo(() => entries.filter((entry) => entry.status === 'pending'), [entries])
  const approved = useMemo(() => entries.filter((entry) => entry.status === 'approved'), [entries])

  async function updateQuest(quest: Quest, progress: number) {
    const status = progress >= quest.target ? 'completed' : 'active'
    const { error } = await supabase.from('progress_quests').update({ progress, status, completed_at: status === 'completed' ? new Date().toISOString() : null }).eq('id', quest.id)
    if (!error) setQuests((current) => current.map((item) => item.id === quest.id ? { ...item, progress, status } : item))
  }

  async function saveEvidence(draft: { domain: string; kind: string; summary: string; metric: string; value: string; unit: string }) {
    const { error } = await supabase.from('progress_entries').insert({ user_id: session!.user.id, domain: draft.domain, kind: draft.kind, summary: draft.summary, metric: draft.metric || null, numeric_value: draft.value ? Number(draft.value) : null, unit: draft.unit || null, confidence: 1, occurred_at: new Date().toISOString(), tags: [], status: 'approved', source_reference: 'direct entry', suggested_effects: [] })
    if (error) setNotice(error.message); else { setModal(null); setNotice('Evidence added to your record.'); await loadData() }
  }

  async function importEnvelope(envelope: SubmissionEnvelope) {
    const sharedEffects = envelope.suggested_effects ?? []
    const rows = envelope.entries.map((entry) => ({ user_id: session!.user.id, domain: entry.domain, kind: entry.kind, summary: entry.summary, metric: entry.metric ?? null, numeric_value: entry.value ?? null, unit: entry.unit ?? null, confidence: entry.confidence ?? 1, occurred_at: entry.occurred_at ?? `${envelope.effective_date ?? new Date().toISOString().slice(0, 10)}T12:00:00+05:00`, tags: entry.tags ?? [], sensitive: entry.sensitive ?? false, status: 'pending', source_reference: envelope.source?.reference ?? 'conversation import', suggested_effects: sharedEffects }))
    const { error } = await supabase.from('progress_entries').insert(rows)
    if (error) setNotice(error.message); else { setModal(null); setNotice(`${rows.length} conversation update${rows.length === 1 ? '' : 's'} added for review.`); await loadData() }
  }

  async function reviewEntry(entry: EvidenceEntry, status: 'approved' | 'rejected') {
    const { error } = await supabase.from('progress_entries').update({ status, reviewed_at: new Date().toISOString() }).eq('id', entry.id)
    if (error) { setNotice(error.message); return }
    if (status === 'approved' && entry.suggested_effects?.[0]) {
      const effect = entry.suggested_effects[0]
      const attribute = attributes.find((item) => item.name.toLowerCase() === effect.target.toLowerCase())
      if (attribute) {
        const signedDelta = effect.delta ?? (effect.direction === 'decrease' ? -1 : effect.direction === 'none' ? 0 : 1)
        const next = Math.max(0, Math.min(attribute.max_score, attribute.score + signedDelta))
        await supabase.from('progress_attributes').update({ score: next, updated_at: new Date().toISOString() }).eq('id', attribute.id)
      }
    }
    await loadData()
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), profile, attributes, quests, entries }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `personal-progression-${new Date().toISOString().slice(0,10)}.json`; anchor.click(); URL.revokeObjectURL(url)
  }

  if (!authReady) return <div className="boot-screen"><CircleDot className="spin" /> Initializing record</div>
  if (!session) return <Login />

  const levelProgress = profile ? profile.xp % 100 : 0
  return <div className="app-shell">
    <aside className={mobileNav ? 'open' : ''}>
      <div className="sidebar-brand"><span>A</span><div><strong>AXIOM</strong><small>PERSONAL OS</small></div></div>
      <button className="mobile-close" onClick={()=>setMobileNav(false)}><X/></button>
      <nav><a className="active" href="#overview"><CircleDot size={16}/> Overview</a><a href="#attributes"><Sparkles size={16}/> Attributes</a><a href="#quests"><BookOpen size={16}/> Quests</a><a href="#evidence"><ShieldCheck size={16}/> Evidence</a></nav>
      <div className="sidebar-bottom"><button onClick={exportData}><Download size={16}/> Export record</button><button onClick={()=>supabase.auth.signOut()}><LogOut size={16}/> Sign out</button><span>PRIVATE · OWNER LOCKED</span></div>
    </aside>
    <main className="dashboard">
      <header><button className="menu-button" onClick={()=>setMobileNav(true)}><Menu/></button><div><span className="eyebrow">Personal progression / live record</span><h1>Good evening, {profile?.display_name ?? 'Javohir'}.</h1></div><div className="header-actions"><button className="secondary" onClick={()=>setModal('import')}><FileInput size={16}/> Import update</button><button className="primary" onClick={()=>setModal('evidence')}><Plus size={16}/> Add evidence</button></div></header>
      {notice && <div className="notice" onClick={()=>setNotice('')}>{notice}<X size={15}/></div>}
      <section className="hero-grid" id="overview">
        <article className="identity-card"><div className="identity-top"><span className="status-live">● LIVE</span><span>{profile?.title ?? 'THE OBSERVER'}</span></div><div className="level-orbit"><div><small>LEVEL</small><strong>{String(profile?.level ?? 1).padStart(2,'0')}</strong></div><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54"/><circle className="progress" cx="60" cy="60" r="54" style={{ strokeDashoffset: 339.3 - 339.3 * levelProgress / 100 }}/></svg></div><div className="identity-meta"><div><span>Current arc</span><strong>{profile?.active_arc ?? 'Foundation'}</strong></div><div><span>Experience</span><strong>{profile?.xp ?? 0} XP</strong></div></div></article>
        <article className="signal-card"><div><span className="eyebrow">System signal</span><h2>{pending.length ? `${pending.length} update${pending.length === 1 ? '' : 's'} await your judgment.` : 'Your record is synchronized.'}</h2></div><button onClick={()=>document.getElementById('review')?.scrollIntoView({behavior:'smooth'})}>Review inbox <ArrowUpRight size={18}/></button><div className="signal-lines"/></article>
        <article className="metric-card"><span className="eyebrow">Evidence approved</span><strong>{String(approved.length).padStart(2,'0')}</strong><p>verified entries in your current record</p></article>
      </section>

      <section className="section" id="attributes"><div className="section-title"><div><span className="eyebrow">Measured development</span><h2>Core attributes</h2></div><span>{attributes.length} SIGNALS</span></div><div className="attribute-grid">{attributes.map((a)=><AttributeCard key={a.id} attribute={a}/>)}</div></section>

      <section className="split-section"><div className="section" id="quests"><div className="section-title"><div><span className="eyebrow">Current commitments</span><h2>Active quests</h2></div><span>{quests.filter(q=>q.status==='active').length} ACTIVE</span></div><div className="quest-list">{quests.map(q=><QuestRow key={q.id} quest={q} onChange={updateQuest}/>)}</div></div>
      <div className="section review-section" id="review"><div className="section-title"><div><span className="eyebrow">Conversation bridge</span><h2>Review queue</h2></div><span>{pending.length} PENDING</span></div>{pending.length === 0 ? <div className="empty-state"><ShieldCheck/><h3>Nothing waiting</h3><p>Imported conversation evidence will appear here before changing your record.</p></div> : <div className="review-list">{pending.map(entry=><article key={entry.id}><span>{entry.domain} · {entry.kind}</span><p>{entry.summary}</p><small>{entry.source_reference}</small><div><button onClick={()=>reviewEntry(entry,'rejected')}>Reject</button><button className="approve" onClick={()=>reviewEntry(entry,'approved')}>Approve <ChevronRight size={14}/></button></div></article>)}</div>}</div></section>

      <section className="section" id="evidence"><div className="section-title"><div><span className="eyebrow">Traceable history</span><h2>Recent evidence</h2></div><span>LAST 24</span></div><div className="evidence-table"><div className="table-head"><span>When</span><span>Domain</span><span>Evidence</span><span>Value</span><span>Status</span></div>{entries.map(entry=><div className="table-row" key={entry.id}><span>{new Date(entry.occurred_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</span><span className="capitalize">{entry.domain}</span><strong>{entry.summary}</strong><span>{entry.numeric_value ?? '—'} {entry.unit ?? ''}</span><span className={`status ${entry.status}`}>{entry.status}</span></div>)}</div></section>
      <footer>AXIOM / PRIVATE RECORD <span>Asia/Tashkent · UTC+05:00</span></footer>
    </main>
    {loading && <div className="loading-bar"/>}
    {modal==='evidence' && <AddEvidenceModal onClose={()=>setModal(null)} onSave={saveEvidence}/>} {modal==='import' && <ImportModal onClose={()=>setModal(null)} onImport={importEnvelope}/>} 
  </div>
}
