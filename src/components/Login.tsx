import { FormEvent, useState } from 'react'
import { ArrowRight, LockKeyhole, Orbit } from 'lucide-react'
import { ownerEmail } from '../lib/supabase'
import { customAuth } from '../lib/api'

export function Login({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function signIn(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try { await customAuth.login(ownerEmail, password); onLogin() }
    catch { setMessage('Invalid email or password.') }
    finally { setBusy(false) }
  }

  return (
    <main className="login-shell">
      <section className="login-visual" aria-label="Personal progression introduction">
        <div className="brand-mark"><Orbit size={22} /> AXIOM / 01</div>
        <div className="login-statement">
          <span className="eyebrow">Private progression system</span>
          <h1>Measure what<br />you become.</h1>
          <p>Evidence, not vibes. Every advance linked to something you actually did.</p>
        </div>
        <div className="visual-index">STATUS PANEL · TASHKENT / UTC+05</div>
      </section>
      <section className="login-form-wrap">
        <div className="login-card">
          <div className="lock-icon"><LockKeyhole size={20} /></div>
          <span className="eyebrow">Owner access</span>
          <h2>Return to your record</h2>
          <p className="muted">One account. Your session stays on this device until you sign out or clear browser data.</p>
          <form onSubmit={signIn}>
            <label>Email</label>
            <input value={ownerEmail} disabled aria-label="Owner email" />
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your Supabase password" autoComplete="current-password" required />
            <button className="primary wide" disabled={busy}>{busy ? 'Opening…' : 'Enter system'} <ArrowRight size={17} /></button>
          </form>
          {message && <p className="form-message" role="status">{message}</p>}
        </div>
      </section>
    </main>
  )
}
