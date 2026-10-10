import { FormEvent, useState } from 'react'
import { ArrowRight, LockKeyhole, Orbit } from 'lucide-react'
import { ownerEmail, supabase } from '../lib/supabase'

export function Login() {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function signIn(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email: ownerEmail, password })
    setBusy(false)
    if (error) setMessage(error.message)
  }

  async function sendMagicLink() {
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: ownerEmail,
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    setMessage(error ? error.message : 'Secure sign-in link sent. Check your email.')
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
          <button className="text-button" onClick={sendMagicLink} disabled={busy}>Email me a secure sign-in link</button>
          {message && <p className="form-message" role="status">{message}</p>}
        </div>
      </section>
    </main>
  )
}
