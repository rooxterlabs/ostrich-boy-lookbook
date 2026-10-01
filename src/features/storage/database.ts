import type { ProjectData, StoredImage } from '../../models/lookbook'
import { categoryEntryType, normalizeEntry } from '../../models/entry'
import { seedProject } from '../../data/seed'

const DB_NAME = 'ostrich-boy-lookbook'
const DB_VERSION = 2
const PROJECT_STORE = 'projects'
const IMAGE_STORE = 'images'

const notifyChange = () => {
  const channel = new BroadcastChannel('lookbook-changes')
  channel.postMessage('saved')
  channel.close()
}

const requestResult = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'))
})

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION)
  request.onupgradeneeded = (event) => {
    const db = request.result
    if (!db.objectStoreNames.contains(PROJECT_STORE)) db.createObjectStore(PROJECT_STORE, { keyPath: 'id' })
    if (!db.objectStoreNames.contains(IMAGE_STORE)) {
      const store = db.createObjectStore(IMAGE_STORE, { keyPath: 'id' })
      store.createIndex('entryId', 'entryId')
    }
    // One-time user-requested fresh start, including hidden/archived records.
    if (event.oldVersion < 2) {
      const transaction = request.transaction!
      transaction.objectStore(IMAGE_STORE).clear()
      const cursor = transaction.objectStore(PROJECT_STORE).openCursor()
      cursor.onsuccess = () => {
        const current = cursor.result
        if (!current) return
        const project = current.value as ProjectData
        current.update({ ...project, categories: [], entries: [], scenes: project.scenes.map((scene) => ({ ...scene, characterIds: [], locationIds: [] })), updatedAt: new Date().toISOString() })
        current.continue()
      }
    }
  }
  request.onblocked = () => reject(new Error('Close other lookbook tabs, then reload to finish the fresh start.'))
  request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result) }
  request.onerror = () => reject(request.error ?? new Error('Unable to open browser storage.'))
})

const transactionDone = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
  transaction.oncomplete = () => resolve()
  transaction.onerror = () => reject(transaction.error ?? new Error('Browser storage transaction failed.'))
  transaction.onabort = () => reject(transaction.error ?? new Error('Browser storage transaction was cancelled.'))
})

export async function loadProject(): Promise<ProjectData> {
  const db = await openDatabase()
  const transaction = db.transaction(PROJECT_STORE, 'readwrite')
  const store = transaction.objectStore(PROJECT_STORE)
  const existing = await requestResult<ProjectData | undefined>(store.get(seedProject.id))
  if (existing) {
    const categories = existing.categories.map((category) => ({ ...category, entryType: categoryEntryType(category) }))
    return { ...existing, categories, entries: existing.entries.map((entry) => normalizeEntry(entry, categories.find((category) => entry.categoryIds.includes(category.id)), existing.scenes)) }
  }
  store.put(seedProject)
  await transactionDone(transaction)
  return structuredClone(seedProject)
}

export async function saveProject(project: ProjectData) {
  const db = await openDatabase()
  const transaction = db.transaction(PROJECT_STORE, 'readwrite')
  transaction.objectStore(PROJECT_STORE).put(project)
  await transactionDone(transaction)
  notifyChange()
}

export async function getImages(entryId?: string): Promise<StoredImage[]> {
  const db = await openDatabase()
  const transaction = db.transaction(IMAGE_STORE, 'readonly')
  const store = transaction.objectStore(IMAGE_STORE)
  const images = entryId
    ? await requestResult<StoredImage[]>(store.index('entryId').getAll(entryId))
    : await requestResult<StoredImage[]>(store.getAll())
  return images.sort((a, b) => a.order - b.order)
}

export async function putImage(image: StoredImage) {
  const db = await openDatabase()
  const transaction = db.transaction(IMAGE_STORE, 'readwrite')
  transaction.objectStore(IMAGE_STORE).put(image)
  await transactionDone(transaction)
  notifyChange()
}

export async function deleteImage(id: string) {
  const db = await openDatabase()
  const transaction = db.transaction(IMAGE_STORE, 'readwrite')
  transaction.objectStore(IMAGE_STORE).delete(id)
  await transactionDone(transaction)
  notifyChange()
}

export async function replaceAllData(project: ProjectData, images: StoredImage[]) {
  const db = await openDatabase()
  const transaction = db.transaction([PROJECT_STORE, IMAGE_STORE], 'readwrite')
  const projects = transaction.objectStore(PROJECT_STORE)
  const imageStore = transaction.objectStore(IMAGE_STORE)
  projects.clear()
  imageStore.clear()
  projects.put(project)
  images.forEach((image) => imageStore.put(image))
  await transactionDone(transaction)
  notifyChange()
}

export async function saveProjectAndDeleteImages(project: ProjectData, entryIds: string[]) {
  const db = await openDatabase()
  const transaction = db.transaction([PROJECT_STORE, IMAGE_STORE], 'readwrite')
  transaction.objectStore(PROJECT_STORE).put(project)
  const store = transaction.objectStore(IMAGE_STORE)
  const cursor = store.openCursor()
  cursor.onsuccess = () => {
    const current = cursor.result
    if (!current) return
    if (entryIds.includes((current.value as StoredImage).entryId)) current.delete()
    current.continue()
  }
  await transactionDone(transaction)
  notifyChange()
}
