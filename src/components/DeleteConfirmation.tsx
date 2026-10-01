import { useEffect, useRef, useState } from 'react'

export function DeleteConfirmation({ question, doubleConfirm = false, onConfirm, onCancel }: { question: string; doubleConfirm?: boolean; onConfirm: () => Promise<void>; onCancel: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const noButton = useRef<HTMLButtonElement>(null)
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => { if (element.open) element.close() } }, [])
  const accept = async () => {
    if (doubleConfirm && step === 1) { setStep(2); noButton.current?.focus(); return }
    setBusy(true)
    try { await onConfirm() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to delete. Please try again.') }
    finally { setBusy(false) }
  }
  return <dialog ref={dialog} className="delete-confirm-dialog" aria-labelledby="delete-question" onCancel={(event) => { event.preventDefault(); if (!busy) onCancel() }}>
    <h2>Confirm deletion</h2>
    <p id="delete-question">{step === 2 ? 'Are you sure?! You will never get this entry back!' : question}</p>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="mode-dialog-actions"><button className="button button-accent" disabled={busy} onClick={() => void accept()}>{busy ? 'Deleting…' : 'Yes'}</button><button ref={noButton} autoFocus className="button" disabled={busy} onClick={onCancel}>No</button></div>
  </dialog>
}
