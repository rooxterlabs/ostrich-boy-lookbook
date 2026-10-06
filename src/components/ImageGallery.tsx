import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { ImageFrameRatio, StoredImage } from '../models/lookbook'
import { ImageModal } from './ImageModal'

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

interface Transform { x: number; y: number; scale: number }
interface Interaction extends Transform { id: string; type: 'move' | 'resize'; clientX: number; clientY: number; width: number; height: number }
interface PanSession { startX: number; startY: number; scroll: number; startTime: number; hasMoved: boolean; imageId: string }
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const ratioFor = (image: StoredImage): ImageFrameRatio => image.frameRatio ?? 'vertical'
const storedTransform = (image: StoredImage): Transform => ({ x: clamp(image.positionX ?? 0, -50, 50), y: clamp(image.positionY ?? 0, -50, 50), scale: clamp(image.scale ?? 1, 1, 2.5) })

function ImagePreview({ image }: { image: StoredImage }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const next = URL.createObjectURL(image.blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [image.blob])
  const transform = storedTransform(image)
  return <img src={url || undefined} alt={image.caption || image.name} draggable={false} style={{ objectPosition: `calc(50% + ${transform.x}%) calc(50% + ${transform.y}%)`, transform: `scale(${transform.scale})` }} />
}

export const ImageGallery = forwardRef<ImageGalleryHandle, ImageGalleryProps>(function ImageGallery({ images, canEdit, busy = false, onDirtyChange }, ref) {
  const [submissionRatio, setSubmissionRatio] = useState<ImageFrameRatio>('vertical')
  const [additions, setAdditions] = useState<StoredImage[]>([])
  const [edits, setEdits] = useState<Record<string, StoredImage>>({})
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [activeId, setActiveId] = useState<string>()
  const [deletePending, setDeletePending] = useState<string>()
  const [enlargedImageId, setEnlargedImageId] = useState<string>()
  const [edges, setEdges] = useState({ left: false, right: false })
  const viewport = useRef<HTMLDivElement>(null)
  const uploadInput = useRef<HTMLInputElement>(null)
  const interaction = useRef<Interaction>()
  const pan = useRef<PanSession>()
  const previousSubmission = useRef({ count: 0, ratio: submissionRatio })
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 })
  const displayImages = useMemo(() => [...images, ...additions].filter((image) => !deletedIds.includes(image.id)).map((image) => edits[image.id] ?? image), [images, additions, edits, deletedIds])
  const enlargedIndex = useMemo(() => displayImages.findIndex((image) => image.id === enlargedImageId), [displayImages, enlargedImageId])
  const enlargedImage = enlargedIndex >= 0 ? displayImages[enlargedIndex] : undefined
  const hasPrev = enlargedIndex > 0
  const hasNext = enlargedIndex >= 0 && enlargedIndex < displayImages.length - 1
  const dirty = additions.length > 0 || Object.keys(edits).length > 0 || deletedIds.length > 0
  useEffect(() => { onDirtyChange(dirty) }, [dirty, onDirtyChange])

  const reset = () => {
    setAdditions([]); setEdits({}); setDeletedIds([])
    setSubmissionRatio('vertical'); setActiveId(undefined); setDeletePending(undefined); setEnlargedImageId(undefined)
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
    const same = original && image.caption === original.caption && image.positionX === original.positionX && image.positionY === original.positionY && image.scale === original.scale
    setEdits((current) => {
      const next = { ...current }
      if (same) delete next[image.id]
      else next[image.id] = image
      return next
    })
  }
  const beginInteraction = (event: React.PointerEvent, type: Interaction['type'], image: StoredImage) => {
    if (!canEdit || busy) return
    event.preventDefault(); event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const frame = event.currentTarget.closest('.gallery-frame')!.getBoundingClientRect()
    const start = storedTransform(image)
    transformRef.current = start
    interaction.current = { id: image.id, type, clientX: event.clientX, clientY: event.clientY, width: frame.width, height: frame.height, ...start }
  }
  const updateInteraction = (event: React.PointerEvent) => {
    const current = interaction.current
    if (!current) return
    const dx = event.clientX - current.clientX, dy = event.clientY - current.clientY
    const next = current.type === 'move'
      ? { ...transformRef.current, x: clamp(current.x + dx / current.width * 100, -50, 50), y: clamp(current.y + dy / current.height * 100, -50, 50) }
      : { ...transformRef.current, scale: clamp(current.scale + (dx + dy) / 320, 1, 2.5) }
    transformRef.current = next
    const image = displayImages.find((candidate) => candidate.id === current.id)
    if (image) commitImage({ ...image, positionX: next.x, positionY: next.y, scale: next.scale })
  }
  const endInteraction = () => { interaction.current = undefined }
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
  const removeImage = (image: StoredImage) => {
    if (additions.some((candidate) => candidate.id === image.id)) setAdditions((current) => current.filter((candidate) => candidate.id !== image.id))
    else setDeletedIds((current) => [...current, image.id])
    setEdits((current) => { const next = { ...current }; delete next[image.id]; return next })
    setDeletePending(undefined)
    if (activeId === image.id) setActiveId(undefined)
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
            {displayImages.map((image) => <article className={`gallery-frame-card gallery-card-${ratioFor(image)} ${activeId === image.id ? 'is-active' : ''}`} key={image.id}>
              <div className={`gallery-frame gallery-frame-${ratioFor(image)}`}>
                <ImagePreview image={image} />
                <button
                  className="gallery-move-surface"
                  aria-label={activeId === image.id ? `Reframe ${image.name}` : `Enlarge ${image.caption || image.name}, or drag to scroll`}
                  disabled={busy}
                  onPointerDown={(event) => activeId === image.id ? beginInteraction(event, 'move', image) : beginPan(event, image)}
                  onPointerMove={(event) => activeId === image.id ? updateInteraction(event) : movePan(event)}
                  onPointerUp={(event) => {
                    if (activeId === image.id) {
                      endInteraction()
                    } else {
                      endPan(event, image)
                    }
                  }}
                  onPointerCancel={() => {
                    endInteraction()
                    pan.current = undefined
                  }}
                  onKeyDown={(event) => {
                    if (activeId === image.id) {
                      if (!event.key.startsWith('Arrow')) return
                      event.preventDefault()
                      const t = storedTransform(image)
                      commitImage({ ...image, positionX: clamp(t.x + (event.key === 'ArrowRight' ? 2 : event.key === 'ArrowLeft' ? -2 : 0), -50, 50), positionY: clamp(t.y + (event.key === 'ArrowDown' ? 2 : event.key === 'ArrowUp' ? -2 : 0), -50, 50) })
                    } else if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setEnlargedImageId(image.id)
                    }
                  }}
                />
                {canEdit && <>
                  <button className="gallery-reframe" disabled={busy} aria-pressed={activeId === image.id} onClick={() => setActiveId(activeId === image.id ? undefined : image.id)}>{activeId === image.id ? 'Done' : 'Reframe'}</button>
                  <button className="gallery-delete" disabled={busy} aria-label={`Delete ${image.name}`} title="Delete image" onClick={() => setDeletePending(image.id)}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" /></svg></button>
                  {activeId === image.id && ['nw', 'ne', 'sw', 'se'].map((corner) => <button key={corner} disabled={busy} className={`gallery-resize gallery-resize-${corner}`} aria-label={`Resize ${image.name}`} onPointerDown={(event) => beginInteraction(event, 'resize', image)} onPointerMove={updateInteraction} onPointerUp={endInteraction} onPointerCancel={endInteraction} />)}
                  {activeId === image.id && <label className="gallery-zoom">Zoom<input type="range" min="1" max="2.5" step="0.01" value={image.scale ?? 1} disabled={busy} aria-label={`Zoom ${image.name}`} onChange={(event) => commitImage({ ...image, scale: Number(event.target.value) })} /></label>}
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
