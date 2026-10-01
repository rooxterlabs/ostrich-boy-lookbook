import { FormEvent, useEffect, useState } from 'react'

interface ModeSwitchDialogProps {
  mode: 'Viewer' | 'Editor'
  onCancel: () => void
  onSubmit: (password: string) => boolean | Promise<boolean>
}

export function ModeSwitchDialog({ mode, onCancel, onSubmit }: ModeSwitchDialogProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onCancel])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      if (!await onSubmit(password)) setError('That password was not accepted.')
    } catch {
      setError('Unable to switch modes. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mode-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <section className="mode-dialog" role="dialog" aria-modal="true" aria-labelledby="mode-dialog-title">
        <h2 id="mode-dialog-title">{mode} Mode</h2>
        <form onSubmit={submit}>
          <input
            aria-label={`${mode} password`}
            autoFocus
            disabled={submitting}
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(event) => { setPassword(event.target.value); setError('') }}
          />
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="mode-dialog-actions">
            <button className="button button-accent" disabled={submitting} type="submit">{submitting ? 'Signing in…' : 'Continue'}</button>
            <button className="button" type="button" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </section>
    </div>
  )
}
