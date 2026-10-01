import { FormEvent, useState } from 'react'

export function LoginPage({ title, label, onSubmit, onCancel }: { title: string; label: string; onSubmit: (password: string) => boolean | Promise<boolean>; onCancel?: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      if (!await onSubmit(password)) setError('That password was not accepted.')
    } catch {
      setError('Unable to sign in. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <main className="login-shell">
      <section className="login-panel">
        <p className="eyebrow">ROOXTER FILMS</p>
        <h1>{title}</h1>
        <form onSubmit={submit}>
          <label>{label}<input autoFocus disabled={submitting} type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-accent" disabled={submitting} type="submit">{submitting ? 'Signing in…' : 'Continue'}</button>
          {onCancel && <button className="text-button" type="button" onClick={onCancel}>Cancel</button>}
        </form>
        <p className="security-note">Secure access is verified by Supabase.</p>
      </section>
    </main>
  )
}
