import { FormEvent, useEffect, useState } from 'react'

interface ModeSwitchDialogProps {
  mode: 'Viewer' | 'Editor'
  onCancel: () => void
  onSubmit: (password: string) => boolean
}

export function ModeSwitchDialog({ mode, onCancel, onSubmit }: ModeSwitchDialogProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onCancel])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!onSubmit(password)) setError('That password was not accepted.')
  }

  return (
    <div className="mode-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <section className="mode-dialog" role="dialog" aria-modal="true" aria-labelledby="mode-dialog-title">
        <h2 id="mode-dialog-title">{mode} Mode</h2>
        <form onSubmit={submit}>
          <input
            aria-label={`${mode} password`}
            autoFocus
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(event) => { setPassword(event.target.value); setError('') }}
          />
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="mode-dialog-actions">
            <button className="button button-accent" type="submit">Continue</button>
            <button className="button" type="button" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </section>
    </div>
  )
}
