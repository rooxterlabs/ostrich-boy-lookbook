import { FormEvent, useEffect, useState } from 'react'

interface ModeSwitchDialogProps {
  onCancel: () => void
  onSubmit: (password: string) => boolean | Promise<boolean>
}

export function ModeSwitchDialog({ onCancel, onSubmit }: ModeSwitchDialogProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onCancel()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onCancel, submitting])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      if (!await onSubmit(password)) setError('Incorrect password')
    } catch {
      setError('Unable to remember Editor Mode in this browser.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mode-dialog-backdrop" role="presentation" onMouseDown={(event) => !submitting && event.target === event.currentTarget && onCancel()}>
      <section className="mode-dialog" role="dialog" aria-modal="true" aria-labelledby="mode-dialog-title">
        <h2 id="mode-dialog-title">PASSWORD</h2>
        <form onSubmit={submit}>
          <div className="password-field">
            <input
              aria-label="Editor password"
              autoFocus
              disabled={submitting}
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter password"
              value={password}
              onChange={(event) => { setPassword(event.target.value); setError('') }}
            />
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
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="mode-dialog-actions">
            <button className="button button-accent" disabled={submitting || !password} type="submit">Continue</button>
            <button className="button" disabled={submitting} type="button" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </section>
    </div>
  )
}
