import { useEffect, useMemo } from 'react'
import type { LookbookEntry, StoredImage } from '../models/lookbook'

export function EntryCard({ entry, image, onOpen }: { entry: LookbookEntry; image?: StoredImage; onOpen: () => void }) {
  const imageUrl = useMemo(() => image ? URL.createObjectURL(image.blob) : '', [image])
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl) }, [imageUrl])
  return (
    <button className="entry-card" onClick={onOpen}>
      <div className="entry-card-media">
        {imageUrl ? <img src={imageUrl} alt={image?.caption || entry.title} /> : <span>No image uploaded</span>}
      </div>
      <div className="entry-card-copy">
        <strong>{entry.title}</strong>
        <span className={`status-pill status-${entry.status}`}>{entry.status}</span>
      </div>
    </button>
  )
}
