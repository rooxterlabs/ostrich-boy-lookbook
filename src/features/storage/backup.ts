import type { ProjectData, StoredImage } from '../../models/lookbook'
import { getImages, replaceAllData } from './database'

interface BackupImage extends Omit<StoredImage, 'blob'> {
  dataUrl: string
}

interface BackupFile {
  format: 'ostrich-boy-lookbook-backup'
  version: 1
  exportedAt: string
  project: ProjectData
  images: BackupImage[]
}

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result))
  reader.onerror = () => reject(reader.error ?? new Error('Unable to read an image for export.'))
  reader.readAsDataURL(blob)
})

const dataUrlToBlob = async (dataUrl: string) => (await fetch(dataUrl)).blob()

export async function exportBackup(project: ProjectData) {
  const images = await getImages()
  const backup: BackupFile = {
    format: 'ostrich-boy-lookbook-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    project,
    images: await Promise.all(images.map(async ({ blob, ...image }) => ({ ...image, dataUrl: await blobToDataUrl(blob) }))),
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `ostrich-boy-lookbook-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export async function importBackup(file: File): Promise<ProjectData> {
  const parsed = JSON.parse(await file.text()) as Partial<BackupFile>
  if (parsed.format !== 'ostrich-boy-lookbook-backup' || parsed.version !== 1 || !parsed.project || !Array.isArray(parsed.images)) {
    throw new Error('This is not a valid Ostrich Boy lookbook backup.')
  }
  const images = await Promise.all(parsed.images.map(async ({ dataUrl, ...image }) => ({ ...image, blob: await dataUrlToBlob(dataUrl) })))
  await replaceAllData(parsed.project, images)
  return parsed.project
}
