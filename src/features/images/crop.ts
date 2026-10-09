import type { ImageFrameRatio, StoredImage } from '../../models/lookbook'

export interface ImageSize { width: number; height: number }
export interface CropRect { x: number; y: number; width: number; height: number }
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
export const frameAspect = (ratio: ImageFrameRatio) => ratio === 'landscape' ? 16 / 9 : 667 / 1000
export const imageRatio = (image: StoredImage): ImageFrameRatio => image.frameRatio ?? 'vertical'

export function cropForImage(image: StoredImage, size: ImageSize): CropRect {
  // Use the existing persisted zoom and position fields to describe the visible
  // source rectangle. Position spans the available overflow on each zoomed axis.
  const aspect = size.width / size.height
  const ratio = frameAspect(imageRatio(image))
  const scale = clamp(image.scale ?? 1, 1, 20)
  const width = Math.min(1, ratio / aspect) / scale
  const height = Math.min(1, aspect / ratio) / scale
  return {
    x: (1 - width) * (clamp(image.positionX ?? 0, -50, 50) + 50) / 100,
    y: (1 - height) * (clamp(image.positionY ?? 0, -50, 50) + 50) / 100,
    width,
    height,
  }
}

export function imageWithCrop(image: StoredImage, crop: CropRect, size: ImageSize, ratio: ImageFrameRatio): StoredImage {
  const baseWidth = Math.min(1, frameAspect(ratio) / (size.width / size.height))
  return {
    ...image,
    frameRatio: ratio,
    scale: baseWidth / crop.width,
    positionX: crop.width < 1 ? clamp(crop.x / (1 - crop.width) * 100 - 50, -50, 50) : 0,
    positionY: crop.height < 1 ? clamp(crop.y / (1 - crop.height) * 100 - 50, -50, 50) : 0,
  }
}
