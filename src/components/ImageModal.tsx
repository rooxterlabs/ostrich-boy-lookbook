import { useEffect, useState } from 'react'
import type { StoredImage } from '../models/lookbook'

interface ImageModalProps {
  image: StoredImage
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

export function ImageModal({
  image,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: ImageModalProps) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    const next = URL.createObjectURL(image.blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [image.blob])

  // Prevent background scrolling while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  // Keyboard controls: Escape to close, Arrow keys to navigate
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowLeft' && hasPrev && onPrev) {
        event.preventDefault()
        onPrev()
      } else if (event.key === 'ArrowRight' && hasNext && onNext) {
        event.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onPrev, onNext, hasPrev, hasNext])

  return (
    <div
      className="image-enlarge-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={image.caption || image.name || 'Enlarged lookbook image'}
      onClick={onClose}
    >
      <button
        type="button"
        className="image-enlarge-close"
        aria-label="Close enlarged image"
        title="Close (Esc)"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {hasPrev && onPrev && (
        <button
          type="button"
          className="image-enlarge-nav image-enlarge-nav-prev"
          aria-label="Previous image"
          title="Previous image (Left arrow)"
          onClick={(e) => {
            e.stopPropagation()
            onPrev()
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {hasNext && onNext && (
        <button
          type="button"
          className="image-enlarge-nav image-enlarge-nav-next"
          aria-label="Next image"
          title="Next image (Right arrow)"
          onClick={(e) => {
            e.stopPropagation()
            onNext()
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      <div
        className="image-enlarge-content"
        onClick={(e) => e.stopPropagation()}
      >
        {url && (
          <img
            src={url}
            alt={image.caption || image.name}
            className="image-enlarge-image"
          />
        )}
        {image.caption && (
          <p className="image-enlarge-caption">{image.caption}</p>
        )}
      </div>
    </div>
  )
}
