import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { ImageFrameRatio, StoredImage } from '../models/lookbook'
import { ImageModal } from './ImageModal'
import { PhotoCropEditor } from './PhotoCropEditor'
import { cropForImage, imageRatio as ratioFor, type ImageSize } from '../features/images/crop'

export interface GalleryChanges {
  upserts: StoredImage[]
  deletedIds: string[]
  images: StoredImage[]
}

interface ImageGalleryProps {
  images: StoredImage[]
  canEdit: boolean
  busy?: boolean
  onDirtyChange: (dirty: boolean) => void
}

export interface ImageGalleryHandle {
  getChanges: () => GalleryChanges
  reset: () => void
}

interface PanSession { startX: number; startY: number; scroll: number; startTime: number; hasMoved: boolean; imageId: string }

function ImagePreview({ image }: { image: StoredImage }) {
  const [url, setUrl] = useState('')
  const [size, setSize] = useState<ImageSize>()
  useEffect(() => {
    const next = URL.createObjectURL(image.blob)
    setSize(undefined)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [image.blob])
  const crop = size ? cropForImage(image, size) : undefined
  return <img src={url || undefined} alt={image.caption || image.name} draggable={false} onLoad={(event) => setSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} style={crop ? { width: `${100 / crop.width}%`, height: `${100 / crop.height}%`, left: `${-crop.x / crop.width * 100}%`, top: `${-crop.y / crop.height * 100}%` } : undefined} />
}

export const ImageGallery = forwardRef<ImageGalleryHandle, ImageGalleryProps>(function ImageGallery({ images, canEdit, busy = false, onDirtyChange }, ref) {
  const [submissionRatio, setSubmissionRatio] = useState<ImageFrameRatio>('vertical')
  const [additions, setAdditions] = useState<StoredImage[]>([])
  const [edits, setEdits] = useState<Record<string, StoredImage>>({})
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [activeId, setActiveId] = useState<string>()
  const [cropId, setCropId] = useState<string>()
  const [replacementError, setReplacementError] = useState('')
  const [deletePending, setDeletePending] = useState<string>()
  const [enlargedImageId, setEnlargedImageId] = useState<string>()
  const [edges, setEdges] = useState({ left: false, right: false })
  const viewport = useRef<HTMLDivElement>(null)
  const uploadInput = useRef<HTMLInputElement>(null)
  const replaceInput = useRef<HTMLInputElement>(null)
  const replacementId = useRef<string>()
  const replacementVersion = useRef(0)
  const pan = useRef<PanSession>()
  const previousSubmission = useRef({ count: 0, ratio: submissionRatio })
  const displayImages = useMemo(() => [...images, ...additions].filter((image) => !deletedIds.includes(image.id)).map((image) => edits[image.id] ?? image), [images, additions, edits, deletedIds])
  const liveImages = useRef(displayImages)
  liveImages.current = displayImages
  const enlargedIndex = useMemo(() => displayImages.findIndex((image) => image.id === enlargedImageId), [displayImages, enlargedImageId])
  const enlargedImage = enlargedIndex >= 0 ? displayImages[enlargedIndex] : undefined
  const cropImage = displayImages.find((image) => image.id === cropId)
  const hasPrev = enlargedIndex > 0
  const hasNext = enlargedIndex >= 0 && enlargedIndex < displayImages.length - 1
  const dirty = additions.length > 0 || Object.keys(edits).length > 0 || deletedIds.length > 0
  useEffect(() => { onDirtyChange(dirty) }, [dirty, onDirtyChange])

  const reset = () => {
    setAdditions([]); setEdits({}); setDeletedIds([])
    setSubmissionRatio('vertical'); setActiveId(undefined); setCropId(undefined); setReplacementError(''); setDeletePending(undefined); setEnlargedImageId(undefined)
    replacementId.current = undefined
    replacementVersion.current += 1
  }
  useImperativeHandle(ref, () => ({
    getChanges: () => ({ images: displayImages, deletedIds, upserts: displayImages.filter((image) => additions.some((addition) => addition.id === image.id) || !!edits[image.id]) }),
    reset,
  }))
  useEffect(() => { if (!canEdit) reset() }, [canEdit])

  const measureEdges = () => {
    const node = viewport.current
    if (node) setEdges({ left: node.scrollLeft > 2, right: node.scrollWidth - node.clientWidth - node.scrollLeft > 2 })
  }
  useEffect(() => {
    const node = viewport.current
    if (!node) return
    const observer = new ResizeObserver(measureEdges)
    observer.observe(node)
    if (node.firstElementChild) observer.observe(node.firstElementChild)
    measureEdges()
    return () => observer.disconnect()
  }, [displayImages.length, submissionRatio, canEdit])
  useEffect(() => {
    const previous = previousSubmission.current
    previousSubmission.current = { count: additions.length, ratio: submissionRatio }
    if (!canEdit || (additions.length <= previous.count && submissionRatio === previous.ratio)) return
    const animation = requestAnimationFrame(() => {
      const node = viewport.current
      node?.scrollTo({ left: node.scrollWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    })
    return () => cancelAnimationFrame(animation)
  }, [additions.length, submissionRatio, canEdit])

  const commitImage = (image: StoredImage) => {
    const original = [...images, ...additions].find((candidate) => candidate.id === image.id)
    const same = original && image.blob === original.blob && image.name === original.name && ratioFor(image) === ratioFor(original) && image.caption === original.caption && Math.abs((image.positionX ?? 0) - (original.positionX ?? 0)) < .000001 && Math.abs((image.positionY ?? 0) - (original.positionY ?? 0)) < .000001 && Math.abs((image.scale ?? 1) - (original.scale ?? 1)) < .000001
    setEdits((current) => {
      const next = { ...current }
      if (same) delete next[image.id]
      else next[image.id] = image
      return next
    })
  }
  const beginPan = (event: React.PointerEvent, image: StoredImage) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    pan.current = {
      startX: event.clientX,
      startY: event.clientY,
      scroll: viewport.current?.scrollLeft ?? 0,
      startTime: performance.now(),
      hasMoved: false,
      imageId: image.id,
    }
  }
  const movePan = (event: React.PointerEvent) => {
    const current = pan.current
    if (!current || !viewport.current) return
    const dx = event.clientX - current.startX
    const dy = event.clientY - current.startY
    if (!current.hasMoved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      current.hasMoved = true
    }
    if (current.hasMoved) {
      viewport.current.scrollLeft = current.scroll - dx
    }
  }
  const endPan = (event: React.PointerEvent, image: StoredImage) => {
    const current = pan.current
    pan.current = undefined
    if (!current) return
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    } catch {
      // pointer capture might already be released
    }
    if (current.hasMoved) return
    const elapsed = performance.now() - current.startTime
    // Allow a comfortable click window (< 380ms). Longer holds are treated as carousel navigation holds.
    if (elapsed < 380 && activeId !== image.id) {
      setEnlargedImageId(image.id)
    }
  }
  const scroll = (direction: -1 | 1) => viewport.current?.scrollBy({ left: direction * viewport.current.clientWidth * .65, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  const stageUpload = (files: FileList | null) => {
    if (!files?.length || busy) return
    const next = Array.from(files).filter((file) => file.type.startsWith('image/')).map((file): StoredImage => ({ id: crypto.randomUUID(), entryId: '', name: file.name, caption: '', order: 0, blob: file, frameRatio: submissionRatio }))
    setAdditions((current) => [...current, ...next])
    setSubmissionRatio('vertical')
  }
  const replacePhoto = async (file?: File) => {
    const id = replacementId.current
    const image = displayImages.find((candidate) => candidate.id === id)
    if (!file || !image || busy) return
    const version = ++replacementVersion.current
    setReplacementError('')
    const url = URL.createObjectURL(file)
    try {
      await new Promise<void>((resolve, reject) => {
        const probe = new Image()
        probe.onload = () => resolve()
        probe.onerror = () => reject(new Error('Choose a valid image to replace this photo.'))
        probe.src = url
      })
      const current = liveImages.current.find((candidate) => candidate.id === id)
      if (!current || replacementId.current !== id || replacementVersion.current !== version) return
      commitImage({ ...current, blob: file, name: file.name, positionX: 0, positionY: 0, scale: 1 })
    } catch (reason) {
      if (replacementVersion.current === version && replacementId.current === id) setReplacementError(reason instanceof Error ? reason.message : 'Unable to open this photo.')
    } finally { URL.revokeObjectURL(url) }
  }
  const removeImage = (image: StoredImage) => {
    if (additions.some((candidate) => candidate.id === image.id)) setAdditions((current) => current.filter((candidate) => candidate.id !== image.id))
    else setDeletedIds((current) => [...current, image.id])
    setEdits((current) => { const next = { ...current }; delete next[image.id]; return next })
    setDeletePending(undefined)
    if (activeId === image.id) setActiveId(undefined)
    if (cropId === image.id) setCropId(undefined)
    if (replacementId.current === image.id) replacementId.current = undefined
    if (enlargedImageId === image.id) setEnlargedImageId(undefined)
  }

  if (!displayImages.length && !canEdit) return <div className="gallery-empty"><p>No images have been uploaded.</p></div>
  return <>
    <section className={`gallery ${canEdit ? 'is-editable' : ''}`} aria-label="Image gallery">
      <div className={`gallery-carousel ${edges.left ? 'has-left-edge' : ''} ${edges.right ? 'has-right-edge' : ''}`}>
        <div className="gallery-viewport" ref={viewport} onScroll={measureEdges} tabIndex={0} role="region" aria-label="Scroll image carousel" onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); scroll(event.key === 'ArrowLeft' ? -1 : 1) }
        }}>
          <div className="gallery-track">
            {displayImages.map((image) => <article className={`gallery-frame-card gallery-card-${ratioFor(image)} ${activeId === image.id ? 'is-active' : ''}`} key={image.id} data-image-id={image.id}>
              <div className={`gallery-frame gallery-frame-${ratioFor(image)}`}>
                <ImagePreview image={image} />
                <button
                  className="gallery-move-surface"
                  aria-label={`Enlarge ${image.caption || image.name}, or drag to scroll`}
                  disabled={busy}
                  onPointerDown={(event) => beginPan(event, image)}
                  onPointerMove={movePan}
                  onPointerUp={(event) => endPan(event, image)}
                  onPointerCancel={() => { pan.current = undefined }}
                  onKeyDown={(event) => {
                    if (activeId !== image.id && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault()
                      setEnlargedImageId(image.id)
                    }
                  }}
                />
                {canEdit && <>
                  {activeId === image.id ? <>
                    <button className="gallery-crop" disabled={busy} aria-label={`Crop ${image.name}`} title="Crop photo" onClick={() => setCropId(image.id)}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 3v15h15M3 6h15v15M9 6h9v9" /></svg></button>
                    <div className="gallery-photo-actions">
                      <button disabled={busy} onClick={() => { replacementId.current = image.id; setReplacementError(''); replaceInput.current?.click() }}>replace</button>
                      <button disabled={busy} onClick={() => commitImage({ ...image, frameRatio: ratioFor(image) === 'vertical' ? 'landscape' : 'vertical' })}>{ratioFor(image) === 'vertical' ? 'landscape' : 'vertical'}</button>
                      <button disabled={busy} onClick={() => { setActiveId(undefined); setReplacementError('') }}>done</button>
                    </div>
                  </> : <button className="gallery-edit" disabled={busy} aria-label={`Edit ${image.name}`} onClick={() => { setActiveId(image.id); setDeletePending(undefined); setReplacementError('') }}>EDIT</button>}
                  <button className="gallery-delete" disabled={busy} aria-label={`Delete ${image.name}`} title="Delete image" onClick={() => setDeletePending(image.id)}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" /></svg></button>
                </>}
                {deletePending === image.id && <div className="gallery-delete-confirm" role="alertdialog" aria-label="Confirm image deletion"><span>Delete this image?</span><button disabled={busy} onClick={() => removeImage(image)}>Delete</button><button onClick={() => setDeletePending(undefined)}>Cancel</button></div>}
              </div>
              {canEdit ? <textarea className="gallery-caption-input" rows={2} disabled={busy} aria-label={`Description for ${image.name}`} placeholder="Add a description..." value={image.caption} onChange={(event) => commitImage({ ...image, caption: event.target.value })} /> : image.caption && <p className="gallery-caption-text">{image.caption}</p>}
            </article>)}
            {canEdit && <article className={`gallery-frame-card gallery-upload-card gallery-card-${submissionRatio}`}>
              <div className={`gallery-frame gallery-empty-frame gallery-frame-${submissionRatio}`}>
                <button className="gallery-upload" aria-label={`Add ${submissionRatio} image`} disabled={busy} onClick={() => uploadInput.current?.click()}><span aria-hidden="true">+</span></button>
                <input ref={uploadInput} hidden type="file" accept="image/*" disabled={busy} onChange={(event) => { stageUpload(event.target.files); event.currentTarget.value = '' }} />
                <button className="gallery-ratio-toggle" disabled={busy} onClick={() => setSubmissionRatio((ratio) => ratio === 'vertical' ? 'landscape' : 'vertical')}>switch to {submissionRatio === 'vertical' ? 'landscape' : 'vertical'}</button>
              </div>
            </article>}
          </div>
        </div>
      </div>
      {(displayImages.length >= 3 || edges.left || edges.right) && <nav className="gallery-scroll-controls" aria-label="Carousel navigation"><button aria-label="Scroll gallery left" disabled={!edges.left} onClick={() => scroll(-1)}>←</button><span aria-hidden="true" /><button aria-label="Scroll gallery right" disabled={!edges.right} onClick={() => scroll(1)}>→</button></nav>}
    </section>
    {canEdit && <input ref={replaceInput} hidden type="file" accept="image/*" disabled={busy} aria-label="Replace current photo" onChange={(event) => { void replacePhoto(event.target.files?.[0]); event.currentTarget.value = '' }} />}
    {replacementError && <p className="form-error gallery-photo-error" role="alert">{replacementError}</p>}
    {canEdit && cropImage && <PhotoCropEditor key={cropImage.id} image={cropImage} onCancel={() => setCropId(undefined)} onDone={(next) => {
      commitImage(next); setCropId(undefined); setActiveId(undefined)
      requestAnimationFrame(() => viewport.current?.querySelector<HTMLElement>(`[data-image-id="${CSS.escape(next.id)}"] .gallery-edit`)?.focus())
    }} />}
    {enlargedImage && (
      <ImageModal
        image={enlargedImage}
        onClose={() => setEnlargedImageId(undefined)}
        hasPrev={hasPrev}
        hasNext={hasNext}
        onPrev={() => {
          if (hasPrev) setEnlargedImageId(displayImages[enlargedIndex - 1].id)
        }}
        onNext={() => {
          if (hasNext) setEnlargedImageId(displayImages[enlargedIndex + 1].id)
        }}
      />
    )}
  </>
})
