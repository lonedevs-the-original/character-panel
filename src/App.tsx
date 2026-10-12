import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, BookOpen, ChevronRight, CircleDot, Download, FileInput, LogOut, Menu, Plus, ShieldCheck, Sparkles, X } from 'lucide-react'
import { customAuth } from './lib/api'
import type { Attribute, CharacterData, EvidenceEntry, Profile, Quest, RankedItem, ValidatedSubmissionEnvelope } from './types'
import { Login } from './components/Login'
import { AttributeCard } from './components/AttributeCard'
import { QuestRow } from './components/QuestRow'
import { AddEvidenceModal } from './components/AddEvidenceModal'
import { ImportModal } from './components/ImportModal'
import './styles.css'

type Modal = 'evidence' | 'import' | null

export default function App() {
  const [signedIn, setSignedIn] = useState(() => Boolean(customAuth.getToken()))
  const [profile, setProfile] = useState<Profile | null>(null)
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [quests, setQuests] = useState<Quest[]>([])
  const [entries, setEntries] = useState<EvidenceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Modal>(null)
  const [notice, setNotice] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [panelView, setPanelView] = useState<'status'|'skills'|'achievements'|'chronicle'>('status')

  const loadData = useCallback(async () => {
    if (!signedIn) return
    setLoading(true)
    try {
      const [data, characterData] = await Promise.all([customAuth.call<{ profile: Profile; attributes: Attribute[]; quests: Quest[]; entries: EvidenceEntry[] }>('bootstrap'), customAuth.character<CharacterData>('read')])
      setProfile({ ...data.profile, character_data: characterData }); setAttributes(data.attributes); setQuests(data.quests); setEntries(data.entries)
    } catch (error) { customAuth.clear(); setSignedIn(false); setNotice(error instanceof Error ? error.message : 'Session expired') }
    setLoading(false)
  }, [signedIn])

  useEffect(() => { void loadData() }, [loadData])

  const pending = useMemo(() => entries.filter((entry) => entry.status === 'pending'), [entries])
  const approved = useMemo(() => entries.filter((entry) => entry.status === 'approved'), [entries])

  async function updateQuest(quest: Quest, progress: number) {
    const status = progress >= quest.target ? 'completed' : 'active'
    try { await customAuth.call('update_quest', { id: quest.id, progress }); setQuests((current) => current.map((item) => item.id === quest.id ? { ...item, progress, status } : item)) } catch (e) { setNotice(e instanceof Error ? e.message : 'Update failed') }
  }

  async function saveEvidence(draft: { domain: string; kind: string; summary: string; metric: string; value: string; unit: string }) {
    try { await customAuth.call('add_evidence', draft); setModal(null); setNotice('Evidence added to your record.'); await loadData() } catch (e) { setNotice(e instanceof Error ? e.message : 'Save failed') }
  }

  async function importEnvelope(envelope: ValidatedSubmissionEnvelope) {
    const sharedEffects = envelope.suggested_effects ?? []
    const rows = envelope.entries.map((entry) => ({ ...entry, occurred_at: entry.occurred_at ?? `${envelope.effective_date ?? new Date().toISOString().slice(0, 10)}T12:00:00+05:00` }))
    try { await customAuth.call('import_envelope', { ...envelope, entries: rows, suggested_effects: sharedEffects }); setModal(null); setNotice(`${rows.length} conversation update${rows.length === 1 ? '' : 's'} added for review.`); await loadData() } catch (e) { setNotice(e instanceof Error ? e.message : 'Import failed') }
  }

  async function reviewEntry(entry: EvidenceEntry, status: 'approved' | 'rejected') {
    try { await customAuth.call('review_entry', { id: entry.id, status }); await loadData() } catch (e) { setNotice(e instanceof Error ? e.message : 'Review failed') }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), profile, attributes, quests, entries }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `personal-progression-${new Date().toISOString().slice(0,10)}.json`; anchor.click(); URL.revokeObjectURL(url)
  }

  if (!signedIn) return <Login onLogin={() => setSignedIn(true)} />

  const levelProgress = profile ? profile.xp % 100 : 0
  const character: CharacterData = profile?.character_data ?? {}
  const ranked = (items: RankedItem[] | undefined, empty: string) => items?.length ? <div className="ranked-grid">{items.map((item, index)=><article className="ranked-card" key={`${item.name}-${index}`}><div><span>{item.parent ?? item.status ?? 'registered'}</span><b>{item.rank ?? (item.level !== undefined ? `LV ${item.level}` : 'UNASSESSED')}</b></div><h3>{item.name}</h3><p>{item.description ?? 'Awaiting a detailed assessment.'}</p>{item.confidence !== undefined && <small>CONFIDENCE {Math.round(item.confidence*100)}%</small>}</article>)}</div> : <div className="panel-empty">{empty}</div>
  return <div className="app-shell">
    <aside className={mobileNav ? 'open' : ''}>
      <div className="sidebar-brand"><span>A</span><div><strong>AXIOM</strong><small>PERSONAL OS</small></div></div>
      <button className="mobile-close" onClick={()=>setMobileNav(false)}><X/></button>
      <nav><a className="active" href="#overview"><CircleDot size={16}/> Status window</a><a href="#character-panel"><Sparkles size={16}/> Character data</a><a href="#quests"><BookOpen size={16}/> Quests</a><a href="#evidence"><ShieldCheck size={16}/> Evidence</a></nav>
      <div className="sidebar-bottom"><button onClick={exportData}><Download size={16}/> Export record</button><button onClick={()=>{customAuth.clear();setSignedIn(false)}}><LogOut size={16}/> Sign out</button><span>PRIVATE · OWNER LOCKED</span></div>
    </aside>
    <main className="dashboard">
      <header><button className="menu-button" onClick={()=>setMobileNav(true)}><Menu/></button><div><span className="eyebrow">Personal progression / live record</span><h1>Good evening, {profile?.display_name ?? 'Javohir'}.</h1></div><div className="header-actions"><button className="secondary" onClick={()=>setModal('import')}><FileInput size={16}/> Import update</button><button className="primary" onClick={()=>setModal('evidence')}><Plus size={16}/> Add evidence</button></div></header>
      {notice && <div className="notice" onClick={()=>setNotice('')}>{notice}<X size={15}/></div>}
      <section className="hero-grid" id="overview">
        <article className="identity-card"><div className="identity-top"><span className="status-live">● ACTIVE</span><span>{character.designation ?? profile?.title ?? 'THE OBSERVER'}</span></div><div className="level-orbit"><div><small>LEVEL</small><strong>{String(profile?.level ?? 1).padStart(2,'0')}</strong></div><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54"/><circle className="progress" cx="60" cy="60" r="54" style={{ strokeDashoffset: 339.3 - 339.3 * levelProgress / 100 }}/></svg></div><div className="class-line"><span>{character.class_name ?? profile?.class_name ?? 'Software Engineer'}</span><b>{character.subclass_name ?? profile?.subclass_name ?? 'Oracle PL/SQL Specialist'}</b></div><div className="identity-meta"><div><span>Current arc</span><strong>{profile?.active_arc ?? 'Foundation'}</strong></div><div><span>Experience</span><strong>{profile?.xp ?? 0} XP</strong></div></div></article>
        <article className="signal-card"><div><span className="eyebrow">System signal</span><h2>{pending.length ? `${pending.length} update${pending.length === 1 ? '' : 's'} await your judgment.` : 'Your record is synchronized.'}</h2></div><button onClick={()=>document.getElementById('review')?.scrollIntoView({behavior:'smooth'})}>Review inbox <ArrowUpRight size={18}/></button><div className="signal-lines"/></article>
        <article className="metric-card"><span className="eyebrow">Evidence approved</span><strong>{String(approved.length).padStart(2,'0')}</strong><p>verified entries in your current record</p></article>
      </section>

      <section className="section character-window" id="character-panel"><div className="section-title"><div><span className="eyebrow">Axiom character record</span><h2>{character.designation ?? profile?.title ?? 'The Observer'}</h2></div><span>{character.rank ?? character.assessment_status ?? 'ASSESSMENT OPEN'}</span></div><div className="panel-tabs">{(['status','skills','achievements','chronicle'] as const).map(view=><button className={panelView===view?'active':''} onClick={()=>setPanelView(view)} key={view}>{view}</button>)}</div>
      {panelView==='status' && <><div className="section-title compact"><div><span className="eyebrow">Permanent capability</span><h2>Core attributes</h2></div><span>{attributes.length} ATTRIBUTES</span></div><div className="attribute-grid">{attributes.map((a)=><AttributeCard key={a.id} attribute={a}/>)}</div><div className="status-columns"><div><h3>Traits</h3>{ranked(character.traits,'No assessed traits yet.')}</div><div><h3>Current conditions</h3>{character.conditions?.length ? <div className="condition-list">{character.conditions.map((item,i)=><article className={item.kind} key={`${item.name}-${i}`}><b>{item.name}</b><p>{item.description}</p></article>)}</div>:<div className="panel-empty">No temporary conditions recorded.</div>}</div></div></>}
      {panelView==='skills' && <><div className="section-title compact"><div><span className="eyebrow">Mastery registry</span><h2>Skills & specializations</h2></div><span>{character.skills?.length ?? 0} REGISTERED</span></div>{ranked(character.skills,'No structured skill assessment has been uploaded yet.')}<h3 className="subheading">Development paths</h3>{ranked(character.unlocks,'No unlockable paths recorded.')}</>}
      {panelView==='achievements' && <><div className="status-columns"><div><h3>Titles</h3>{ranked(character.titles,'No earned titles recorded.')}</div><div><h3>Notable records</h3>{character.records?.length ? <div className="achievement-list">{character.records.map((item,i)=><article key={`${item.name}-${i}`}><span>{item.category ?? 'record'}</span><h3>{item.name}</h3><p>{item.description}</p></article>)}</div>:<div className="panel-empty">No records assessed yet.</div>}</div></div><h3 className="subheading">Achievements</h3>{character.achievements?.length ? <div className="achievement-list">{character.achievements.map((item,i)=><article key={`${item.name}-${i}`}><span>{item.rarity ?? item.category ?? 'achievement'}</span><h3>{item.name}</h3><p>{item.description}</p></article>)}</div>:<div className="panel-empty">No achievements uploaded yet.</div>}</>}
      {panelView==='chronicle' && <div className="chronicle">{character.history?.length ? character.history.map((item,i)=><article key={`${item.assessed_at}-${i}`}><time>{new Date(item.assessed_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</time><div><h3>{item.summary}</h3><p>{item.changes?.join(' · ') || item.source || 'Assessment snapshot'}</p></div></article>):<div className="panel-empty">The first full assessment will begin your chronicle.</div>}</div>}</section>

      <section className="split-section"><div className="section" id="quests"><div className="section-title"><div><span className="eyebrow">Current commitments</span><h2>Active quests</h2></div><span>{quests.filter(q=>q.status==='active').length} ACTIVE</span></div><div className="quest-list">{quests.map(q=><QuestRow key={q.id} quest={q} onChange={updateQuest}/>)}</div></div>
      <div className="section review-section" id="review"><div className="section-title"><div><span className="eyebrow">Conversation bridge</span><h2>Review queue</h2></div><span>{pending.length} PENDING</span></div>{pending.length === 0 ? <div className="empty-state"><ShieldCheck/><h3>Nothing waiting</h3><p>Imported conversation evidence will appear here before changing your record.</p></div> : <div className="review-list">{pending.map(entry=><article key={entry.id}><span>{entry.domain} · {entry.kind}</span><p>{entry.summary}</p><small>{entry.source_reference}</small><div><button onClick={()=>reviewEntry(entry,'rejected')}>Reject</button><button className="approve" onClick={()=>reviewEntry(entry,'approved')}>Approve <ChevronRight size={14}/></button></div></article>)}</div>}</div></section>

      <section className="section" id="evidence"><div className="section-title"><div><span className="eyebrow">Traceable history</span><h2>Recent evidence</h2></div><span>LAST 24</span></div><div className="evidence-table"><div className="table-head"><span>When</span><span>Domain</span><span>Evidence</span><span>Value</span><span>Status</span></div>{entries.map(entry=><div className="table-row" key={entry.id}><span>{new Date(entry.occurred_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</span><span className="capitalize">{entry.domain}</span><strong>{entry.summary}</strong><span>{entry.numeric_value ?? '—'} {entry.unit ?? ''}</span><span className={`status ${entry.status}`}>{entry.status}</span></div>)}</div></section>
      <footer>AXIOM / PRIVATE RECORD <span>Asia/Tashkent · UTC+05:00</span></footer>
    </main>
    {loading && <div className="loading-bar"/>}
    {modal==='evidence' && <AddEvidenceModal onClose={()=>setModal(null)} onSave={saveEvidence}/>} {modal==='import' && <ImportModal onClose={()=>setModal(null)} onImport={importEnvelope}/>} 
  </div>
}
