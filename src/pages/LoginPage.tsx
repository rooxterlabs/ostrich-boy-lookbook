import { FormEvent, useState } from 'react'

export function LoginPage({ title, label, onSubmit, onCancel }: { title: string; label: string; onSubmit: (password: string) => boolean | Promise<boolean>; onCancel?: () => void }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
          <div>
            <label htmlFor="lookbook-password">{label}</label>
            <span className="password-field">
              <input id="lookbook-password" autoFocus disabled={submitting} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} />
              <button
                className="password-visibility-toggle"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                disabled={submitting}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? (
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.4A10.8 10.8 0 0 1 12 4c5.5 0 9 5.2 9 5.2a15.7 15.7 0 0 1-2.4 2.8M6.6 6.6A16 16 0 0 0 3 9.2s3.5 5.2 9 5.2c.8 0 1.6-.1 2.3-.3" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M3 9.2S6.5 4 12 4s9 5.2 9 5.2-3.5 5.2-9 5.2S3 9.2 3 9.2Z" />
                    <circle cx="12" cy="9.2" r="2.3" />
                  </svg>
                )}
              </button>
            </span>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-accent" disabled={submitting} type="submit">{submitting ? 'Signing in…' : 'Continue'}</button>
          {onCancel && <button className="text-button" type="button" onClick={onCancel}>Cancel</button>}
        </form>
        <p className="security-note">Secure access is verified by Supabase.</p>
      </section>
    </main>
  )
}
