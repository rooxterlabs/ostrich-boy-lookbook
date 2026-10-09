import { useEffect, useRef, useState } from 'react'
import type { ImageFrameRatio, StoredImage } from '../models/lookbook'
import { clamp, cropForImage, frameAspect, imageRatio, imageWithCrop, type CropRect, type ImageSize } from '../features/images/crop'

interface PhotoCropEditorProps {
  image: StoredImage
  onDone: (image: StoredImage) => void
  onCancel: () => void
}
interface Draft { ratio: ImageFrameRatio; crop: CropRect; anchorX: number; anchorY: number }
interface Drag { type: 'move' | 'resize'; x: number; y: number; width: number; height: number; corner: string; draft: Draft }

export function PhotoCropEditor({ image, onDone, onCancel }: PhotoCropEditorProps) {
  const [url, setUrl] = useState('')
  const [size, setSize] = useState<ImageSize>()
  const [draft, setDraft] = useState<Draft>()
  const [bounds, setBounds] = useState<ImageSize>({ width: 1, height: 1 })
  const [error, setError] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag>()
  const liveDraft = useRef<Draft>()

  useEffect(() => {
    const next = URL.createObjectURL(image.blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [image.blob])
  useEffect(() => {
    const node = stage.current
    if (!node) return
    const measure = () => setBounds({ width: node.clientWidth, height: node.clientHeight })
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    measure()
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.focus()
    return () => {
      document.body.style.overflow = overflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  const updateDraft = (next: Draft) => { liveDraft.current = next; setDraft(next) }
  const fitScale = size ? Math.min(bounds.width / size.width, bounds.height / size.height) * .9 : 1
  const fit = { width: (size?.width ?? 1) * fitScale, height: (size?.height ?? 1) * fitScale }
  const origin = { x: (bounds.width - fit.width) / 2, y: (bounds.height - fit.height) / 2 }
  const box = draft ? {
    left: origin.x + (draft.anchorX - draft.crop.width / 2) * fit.width,
    top: origin.y + (draft.anchorY - draft.crop.height / 2) * fit.height,
    width: draft.crop.width * fit.width,
    height: draft.crop.height * fit.height,
  } : undefined
  const imageLeft = origin.x + (draft ? draft.anchorX - draft.crop.x - draft.crop.width / 2 : 0) * fit.width
  const imageTop = origin.y + (draft ? draft.anchorY - draft.crop.y - draft.crop.height / 2 : 0) * fit.height

  const beginDrag = (event: React.PointerEvent<HTMLElement>, type: Drag['type'], corner = '') => {
    if (!draft || event.button !== 0) return
    if (event.pointerType !== 'touch') event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { type, x: event.clientX, y: event.clientY, width: fit.width, height: fit.height, corner, draft }
  }
  const moveDrag = (event: React.PointerEvent<HTMLElement>) => {
    const current = drag.current
    if (!current || !size) return
    const dx = event.clientX - current.x, dy = event.clientY - current.y
    const start = current.draft.crop
    if (current.type === 'move') {
      updateDraft({ ...current.draft, crop: { ...start, x: clamp(start.x - dx / current.width, 0, 1 - start.width), y: clamp(start.y - dy / current.height, 0, 1 - start.height) } })
    } else {
      const ratio = frameAspect(current.draft.ratio)
      const sx = current.corner.includes('e') ? 1 : -1, sy = current.corner.includes('s') ? 1 : -1
      const delta = 2 * (sx * dx + sy * dy / ratio) / (1 + 1 / ratio ** 2)
      resizeCrop(current.draft, start.width + delta / current.width)
    }
  }
  const resizeCrop = (current: Draft, requestedWidth: number) => {
    if (!size) return
    const maxWidth = Math.min(1, frameAspect(current.ratio) / (size.width / size.height))
    const width = clamp(requestedWidth, maxWidth / 20, maxWidth)
    const height = width * (size.width / size.height) / frameAspect(current.ratio)
    updateDraft({ ...current, anchorX: clamp(current.anchorX, width / 2, 1 - width / 2), anchorY: clamp(current.anchorY, height / 2, 1 - height / 2), crop: { width, height, x: clamp(current.crop.x + (current.crop.width - width) / 2, 0, 1 - width), y: clamp(current.crop.y + (current.crop.height - height) / 2, 0, 1 - height) } })
  }
  const endDrag = () => { drag.current = undefined }
  const switchRatio = () => {
    if (!draft || !size) return
    const ratio = draft.ratio === 'vertical' ? 'landscape' : 'vertical'
    const scale = Math.min(1, frameAspect(draft.ratio) / (size.width / size.height)) / draft.crop.width
    const width = Math.min(1, frameAspect(ratio) / (size.width / size.height)) / scale
    const height = width * (size.width / size.height) / frameAspect(ratio)
    const x = clamp(draft.crop.x + draft.crop.width / 2 - width / 2, 0, 1 - width)
    const y = clamp(draft.crop.y + draft.crop.height / 2 - height / 2, 0, 1 - height)
    updateDraft({ ratio, crop: { x, y, width, height }, anchorX: x + width / 2, anchorY: y + height / 2 })
  }
  const finish = () => {
    if (error) { onCancel(); return }
    const current = liveDraft.current
    if (current && size) onDone(imageWithCrop(image, current.crop, size, current.ratio))
  }
  const activateTouch = (event: React.TouchEvent<HTMLButtonElement>, action: () => void) => {
    const touch = event.changedTouches[0]
    const rect = event.currentTarget.getBoundingClientRect()
    if (!touch || touch.clientX < rect.left || touch.clientX > rect.right || touch.clientY < rect.top || touch.clientY > rect.bottom) return
    // Activate directly after a drag; cancel the delayed synthetic click so
    // a ratio toggle can never run twice for a single touch.
    event.preventDefault()
    action()
  }

  return <div className="photo-crop-overlay">
    <div className="photo-crop-dialog" ref={dialog} role="dialog" aria-modal="true" aria-label={`Crop ${image.name}`} tabIndex={-1} onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); onCancel() }
      if (event.key !== 'Tab') return
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? [])
      const first = controls[0], last = controls[controls.length - 1]
      if (!first) { event.preventDefault(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus() }
    }}>
      <div className="photo-crop-stage" ref={stage}>
        {url && <img className="photo-crop-image" src={url} alt={image.caption || image.name} draggable={false} style={{ left: imageLeft, top: imageTop, width: fit.width, height: fit.height }} onError={() => setError(true)} onLoad={(event) => {
          const nextSize = { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }
          setSize(nextSize)
          const crop = cropForImage(image, nextSize)
          updateDraft({ ratio: imageRatio(image), crop, anchorX: crop.x + crop.width / 2, anchorY: crop.y + crop.height / 2 })
        }} />}
        {draft && box && <>
          <div className="photo-crop-mask" style={box} aria-hidden="true" />
          <button className="photo-crop-move" aria-label="Move photo behind crop box" onPointerDown={(event) => beginDrag(event, 'move')} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={(event) => {
            if (!event.key.startsWith('Arrow')) return
            event.preventDefault()
            const step = event.shiftKey ? .05 : .01
            updateDraft({ ...draft, crop: { ...draft.crop, x: clamp(draft.crop.x + (event.key === 'ArrowLeft' ? step : event.key === 'ArrowRight' ? -step : 0), 0, 1 - draft.crop.width), y: clamp(draft.crop.y + (event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0), 0, 1 - draft.crop.height) } })
          }} />
          <div className="photo-crop-box" style={box} aria-hidden="true"><span /><span /></div>
          {['nw', 'ne', 'sw', 'se'].map((corner) => <button key={corner} className={`photo-crop-handle photo-crop-handle-${corner}`} style={{ left: box.left + (corner.includes('e') ? box.width : 0), top: box.top + (corner.includes('s') ? box.height : 0) }} aria-label={`Resize crop ${corner}`} onPointerDown={(event) => beginDrag(event, 'resize', corner)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={(event) => {
            if (!event.key.startsWith('Arrow')) return
            event.preventDefault()
            const grow = event.key === 'ArrowRight' || event.key === 'ArrowDown'
            resizeCrop(draft, draft.crop.width * (grow ? 1.05 : .95))
          }} />)}
        </>}
        {error && <p className="photo-crop-error" role="alert">This photo could not be opened.</p>}
      </div>
      <div className="photo-crop-actions">
        <button disabled={!draft || error} onClick={switchRatio} onTouchEnd={(event) => activateTouch(event, switchRatio)}>Switch to {draft?.ratio === 'landscape' ? 'vertical' : 'landscape'}</button>
        <button disabled={!error && (!draft || !size)} onClick={finish} onTouchEnd={(event) => activateTouch(event, finish)}>Done</button>
      </div>
    </div>
  </div>
}
