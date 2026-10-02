import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { ImageFrameRatio, StoredImage } from '../models/lookbook'

export interface GalleryUpload {
  file: File
  frameRatio: ImageFrameRatio
  caption: string
  positionX: number
  positionY: number
  scale: number
  makePrimary: boolean
}

interface ImageGalleryProps {
  images: StoredImage[]
  primaryId?: string
  canEdit: boolean
  onUpload: (uploads: GalleryUpload[]) => void | Promise<void>
  onUpdate: (image: StoredImage) => void | Promise<void>
  onDelete: (image: StoredImage) => void
  onPrimary: (id: string) => void
  onReorder: (sourceId: string, targetId: string) => void
}

export interface ImageGalleryHandle {
  savePending: () => Promise<boolean>
}

interface DraftImage extends StoredImage { pending: true; file: File }
interface Transform { x: number; y: number; scale: number }
interface Interaction extends Transform { id: string; type: 'move' | 'resize'; clientX: number; clientY: number; width: number; height: number }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const ratioFor = (image: StoredImage): ImageFrameRatio => image.frameRatio ?? 'vertical'
const storedTransform = (image: StoredImage): Transform => ({ x: clamp(image.positionX ?? 0, -50, 50), y: clamp(image.positionY ?? 0, -50, 50), scale: clamp(image.scale ?? 1, 1, 2.5) })
const isPending = (image: StoredImage): image is DraftImage => 'pending' in image && image.pending === true

export const ImageGallery = forwardRef<ImageGalleryHandle, ImageGalleryProps>(function ImageGallery({ images, primaryId, canEdit, onUpload, onUpdate, onDelete, onPrimary, onReorder }, ref) {
  const [submissionRatio, setSubmissionRatio] = useState<ImageFrameRatio>('vertical')
  const [pendingImages, setPendingImages] = useState<DraftImage[]>([])
  const [pendingPrimaryId, setPendingPrimaryId] = useState<string>()
  const [activeId, setActiveId] = useState<string>()
  const [deletePending, setDeletePending] = useState<string>()
  const [savingGallery, setSavingGallery] = useState(false)
  const [galleryError, setGalleryError] = useState('')
  const [liveTransforms, setLiveTransforms] = useState<Record<string, Transform>>({})
  const liveTransformsRef = useRef<Record<string, Transform>>({})
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 })
  const interaction = useRef<Interaction>()
  const updateQueue = useRef<Promise<void>>(Promise.resolve())
  const urlCleanup = useRef<{ urls: Map<string, string>; timer: number }>()
  const displayImages = useMemo(() => [...images, ...pendingImages], [images, pendingImages])
  const urls = useMemo(() => new Map(displayImages.map((image) => [image.id, URL.createObjectURL(image.blob)])), [displayImages])
  useEffect(() => {
    if (!canEdit && pendingImages.length) {
      setPendingImages([])
      setPendingPrimaryId(undefined)
    }
  }, [canEdit, pendingImages.length])
  useEffect(() => {
    if (urlCleanup.current?.urls === urls) {
      window.clearTimeout(urlCleanup.current.timer)
      urlCleanup.current = undefined
    }
    return () => {
      const timer = window.setTimeout(() => {
        urls.forEach((url) => URL.revokeObjectURL(url))
        if (urlCleanup.current?.timer === timer) urlCleanup.current = undefined
      }, 0)
      urlCleanup.current = { urls, timer }
    }
  }, [urls])

  const groups = useMemo(() => displayImages.reduce<{ ratio: ImageFrameRatio; images: StoredImage[] }[]>((result, image) => {
    const ratio = ratioFor(image)
    const current = result[result.length - 1]
    if (current?.ratio === ratio) current.images.push(image)
    else result.push({ ratio, images: [image] })
    return result
  }, []), [displayImages])
  const emptyFrameCount = submissionRatio === 'landscape' ? 1 : 2
  const persistImage = (image: StoredImage) => {
    updateQueue.current = updateQueue.current.catch(() => undefined).then(() => onUpdate(image)).then(() => undefined)
  }
  const commitImage = (image: StoredImage) => {
    if (isPending(image)) setPendingImages((current) => current.map((candidate) => candidate.id === image.id ? { ...candidate, ...image, pending: true, file: candidate.file } : candidate))
    else persistImage(image)
  }

  const beginInteraction = (event: React.PointerEvent, type: Interaction['type'], image: StoredImage) => {
    if (!canEdit) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const frame = event.currentTarget.closest('.gallery-frame')?.getBoundingClientRect()
    const start = liveTransformsRef.current[image.id] ?? storedTransform(image)
    transformRef.current = start
    liveTransformsRef.current[image.id] = start
    interaction.current = { id: image.id, type, clientX: event.clientX, clientY: event.clientY, width: frame?.width ?? 1, height: frame?.height ?? 1, ...start }
    setActiveId(image.id)
    setLiveTransforms((current) => ({ ...current, [image.id]: start }))
  }
  const updateInteraction = (event: React.PointerEvent) => {
    const current = interaction.current
    if (!current) return
    const deltaX = event.clientX - current.clientX
    const deltaY = event.clientY - current.clientY
    const next = current.type === 'move'
      ? { ...transformRef.current, x: clamp(current.x + deltaX / current.width * 100, -50, 50), y: clamp(current.y + deltaY / current.height * 100, -50, 50) }
      : { ...transformRef.current, scale: clamp(current.scale + (deltaX + deltaY) / 320, 1, 2.5) }
    transformRef.current = next
    liveTransformsRef.current[current.id] = next
    setLiveTransforms((transforms) => ({ ...transforms, [current.id]: next }))
  }
  const endInteraction = () => {
    const current = interaction.current
    if (!current) return
    const image = displayImages.find((candidate) => candidate.id === current.id)
    if (image) commitImage({ ...image, positionX: transformRef.current.x, positionY: transformRef.current.y, scale: transformRef.current.scale })
    interaction.current = undefined
  }
  const stageUpload = (files: FileList | null, frameRatio = submissionRatio) => {
    if (!files?.length) return
    const additions = Array.from(files).map((file, index): DraftImage => ({ id: `pending-${crypto.randomUUID()}`, entryId: '', name: file.name, caption: '', order: images.length + pendingImages.length + index, blob: file, file, frameRatio, pending: true }))
    setPendingImages((current) => [...current, ...additions])
    setGalleryError('')
  }
  const saveGallery = async () => {
    if (!pendingImages.length) return true
    if (savingGallery) return false
    setSavingGallery(true)
    setGalleryError('')
    try {
      await onUpload(pendingImages.map((image) => ({ file: image.file, frameRatio: ratioFor(image), caption: image.caption, positionX: image.positionX ?? 0, positionY: image.positionY ?? 0, scale: image.scale ?? 1, makePrimary: image.id === pendingPrimaryId })))
      setPendingImages([])
      setPendingPrimaryId(undefined)
      setLiveTransforms({})
      liveTransformsRef.current = {}
      return true
    } catch (reason) {
      setGalleryError(reason instanceof Error ? reason.message : 'Unable to save the gallery. Your uploads are still here.')
      return false
    } finally {
      setSavingGallery(false)
    }
  }
  useImperativeHandle(ref, () => ({ savePending: saveGallery }))
  const removeImage = (image: StoredImage) => {
    if (isPending(image)) {
      setPendingImages((current) => current.filter((candidate) => candidate.id !== image.id))
      if (pendingPrimaryId === image.id) setPendingPrimaryId(undefined)
    } else onDelete(image)
    setDeletePending(undefined)
  }
  const moveImage = (image: StoredImage, direction: -1 | 1) => {
    if (isPending(image)) {
      const index = pendingImages.findIndex((candidate) => candidate.id === image.id)
      const target = index + direction
      if (index < 0 || !pendingImages[target]) return
      setPendingImages((current) => { const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next })
      return
    }
    const index = images.findIndex((candidate) => candidate.id === image.id)
    if (images[index + direction]) onReorder(image.id, images[index + direction].id)
  }

  if (!images.length && !pendingImages.length && !canEdit) return <div className="gallery-empty"><p>No images have been uploaded.</p></div>

  return <section className={`gallery ${canEdit ? 'is-editable' : ''}`} aria-label="Image gallery">
    <div className="gallery-pages">
      {groups.map((group, groupIndex) => {
        const centeredSingle = group.images.length === 1 && !isPending(group.images[0])
        const showInlineEmptyFrame = canEdit && group.ratio === 'vertical' && group.images.length % 2 === 1 && !centeredSingle
        return <div className={`gallery-frame-group gallery-frame-group-${group.ratio} ${centeredSingle ? 'is-single' : ''}`} key={`${group.ratio}-${groupIndex}`}>
        {group.images.map((image) => {
          const pending = isPending(image)
          const index = pending ? pendingImages.findIndex((candidate) => candidate.id === image.id) : images.findIndex((candidate) => candidate.id === image.id)
          const transform = liveTransforms[image.id] ?? storedTransform(image)
          const primary = pending ? image.id === pendingPrimaryId : image.id === primaryId
          return <article className={`gallery-frame-card ${activeId === image.id ? 'is-active' : ''} ${pending ? 'is-pending' : ''}`} key={image.id}>
            <div className={`gallery-frame gallery-frame-${group.ratio}`}>
              <img src={urls.get(image.id)} alt={image.caption || image.name} draggable={false} style={{ objectPosition: `calc(50% + ${transform.x}%) calc(50% + ${transform.y}%)`, transform: `scale(${transform.scale})` }} />
              {canEdit && <button className="gallery-move-surface" aria-label={`Reframe ${image.name}`} onPointerDown={(event) => beginInteraction(event, 'move', image)} onPointerMove={updateInteraction} onPointerUp={endInteraction} onPointerCancel={endInteraction} />}
              {primary && <span className="gallery-primary-badge">Primary</span>}
              {pending && <span className="gallery-pending-badge">Unsaved</span>}
              {canEdit && <>
                <button className={`gallery-primary-action ${primary ? 'is-primary' : ''}`} aria-label={primary ? `${image.name} is primary` : `Set ${image.name} as primary`} title={primary ? 'Primary image' : 'Set as primary'} onClick={() => pending ? setPendingPrimaryId(image.id) : onPrimary(image.id)}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></svg></button>
                <button className="gallery-delete" aria-label={`Delete ${image.name}`} title="Delete image" onClick={() => setDeletePending(image.id)}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" /></svg></button>
                <div className="gallery-order-controls" aria-label={`Reorder ${image.name}`}><button aria-label={`Move ${image.name} up`} disabled={index === 0} onClick={() => moveImage(image, -1)}>↑</button><button aria-label={`Move ${image.name} down`} disabled={index === (pending ? pendingImages.length : images.length) - 1} onClick={() => moveImage(image, 1)}>↓</button></div>
                {['nw', 'ne', 'sw', 'se'].map((corner) => <button key={corner} className={`gallery-resize gallery-resize-${corner}`} aria-label={`Resize ${image.name}`} onPointerDown={(event) => beginInteraction(event, 'resize', image)} onPointerMove={updateInteraction} onPointerUp={endInteraction} onPointerCancel={endInteraction} />)}
              </>}
              {deletePending === image.id && <div className="gallery-delete-confirm" role="alertdialog" aria-label="Confirm image deletion"><span>Delete this image?</span><button onClick={() => removeImage(image)}>Delete</button><button onClick={() => setDeletePending(undefined)}>Cancel</button></div>}
            </div>
            {canEdit ? <textarea className="gallery-caption-input" rows={1} aria-label={`Description for ${image.name}`} placeholder="Add a description..." defaultValue={image.caption} onBlur={(event) => event.target.value !== image.caption && commitImage({ ...image, caption: event.target.value })} /> : image.caption && <p className="gallery-caption-text">{image.caption}</p>}
          </article>
        })}
        {showInlineEmptyFrame && <label className="gallery-empty-frame gallery-frame-vertical gallery-inline-empty-frame" aria-label="Add vertical image beside the unpaired frame"><span aria-hidden="true">+</span><input hidden type="file" accept="image/*" onChange={(event) => { setSubmissionRatio('vertical'); stageUpload(event.target.files, 'vertical'); event.currentTarget.value = '' }} /></label>}
      </div>})}
    </div>
    {canEdit && <section className={`gallery-submission gallery-submission-${submissionRatio}`} aria-label={`${submissionRatio} image submission`}>
      <div className="gallery-submission-picker">
        <div className="gallery-empty-frames">{Array.from({ length: emptyFrameCount }, (_, index) => <label className={`gallery-empty-frame gallery-frame-${submissionRatio}`} key={`${submissionRatio}-${index}`} aria-label={`Add ${submissionRatio} image ${index + 1}`}><span aria-hidden="true">+</span><input hidden type="file" accept="image/*" onChange={(event) => { stageUpload(event.target.files); event.currentTarget.value = '' }} /></label>)}</div>
        <button className="button gallery-ratio-toggle" onClick={() => setSubmissionRatio((ratio) => ratio === 'vertical' ? 'landscape' : 'vertical')}>Submit {submissionRatio === 'vertical' ? 'Landscape' : 'Vertical'} Frames</button>
      </div>
      <button className="button button-accent gallery-save" disabled={!pendingImages.length || savingGallery} onClick={() => void saveGallery()}>{savingGallery ? 'Saving Gallery…' : 'Save Gallery'}</button>
      {galleryError && <p className="form-error" role="alert">{galleryError}</p>}
    </section>}
  </section>
})
