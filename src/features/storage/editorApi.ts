import { EDITOR_PASSWORD } from '../../config/auth'
import { hasEditorSession } from '../auth/auth'
import { editorApiUrl, getPublishableKey } from '../supabase/client'

export async function writeLookbook(body: Record<string, unknown> | FormData) {
  if (!hasEditorSession()) throw new Error('Enter Editor Mode to save changes.')
  const multipart = body instanceof FormData
  const response = await fetch(editorApiUrl, {
    method: 'POST',
    headers: {
      apikey: getPublishableKey(),
      'x-lookbook-editor-password': EDITOR_PASSWORD,
      ...(!multipart ? { 'Content-Type': 'application/json' } : {}),
    },
    body: multipart ? body : JSON.stringify(body),
  })
  const result = await response.json().catch(() => null) as { error?: string } | null
  if (!response.ok) throw new Error(result?.error || 'Editor saving is unavailable. Please try again later.')
}
