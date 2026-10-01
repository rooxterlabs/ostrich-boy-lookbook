import { FormEvent, useState } from 'react'

export function LoginPage({ title, label, onSubmit, onCancel }: { title: string; label: string; onSubmit: (password: string) => boolean; onCancel?: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!onSubmit(password)) setError('That password was not accepted.')
  }
  return (
    <main className="login-shell">
      <section className="login-panel">
        <p className="eyebrow">ROOXTER FILMS</p>
        <h1>{title}</h1>
        <form onSubmit={submit}>
          <label>{label}<input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-accent" type="submit">Continue</button>
          {onCancel && <button className="text-button" type="button" onClick={onCancel}>Cancel</button>}
        </form>
        <p className="security-note">Local prototype only. Browser-side passwords do not protect confidential material.</p>
      </section>
    </main>
  )
}
