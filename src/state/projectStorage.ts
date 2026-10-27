import { validateEditorSnapshot, type EditorSnapshot } from "./editorPersistence"

export const PROJECT_DATABASE_NAME = "ghostframe.projects"
export const PROJECT_DATABASE_VERSION = 1
export const PROJECT_SCHEMA_VERSION = 1
export const PROJECT_STORE_NAME = "projects"

export interface ProjectRecord {
  id: string
  version: 1
  name: string
  createdAt: string
  updatedAt: string
  editor: EditorSnapshot
  source: Blob
  sourceFileName: string
  watermark: Blob | null
  watermarkFileName: string | null
}

export interface ProjectSummary { id: string; name: string; createdAt: string; updatedAt: string }

export class ProjectStorageError extends Error {}
export class UnsupportedProjectError extends ProjectStorageError {}

const requestResult = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error ?? new ProjectStorageError("The project database request failed."))
})

const transactionDone = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
  transaction.oncomplete = () => resolve()
  transaction.onabort = () => reject(transaction.error ?? new ProjectStorageError("The project operation was cancelled."))
  transaction.onerror = () => { /* onabort provides the final failure. */ }
})

export function openProjectDatabase(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false
    let request: IDBOpenDBRequest
    try { request = factory.open(PROJECT_DATABASE_NAME, PROJECT_DATABASE_VERSION) }
    catch { reject(new ProjectStorageError("Project storage is unavailable in this browser.")); return }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(PROJECT_STORE_NAME)) db.createObjectStore(PROJECT_STORE_NAME, { keyPath: "id" })
    }
    request.onblocked = () => { settled = true; reject(new ProjectStorageError("Project storage is busy in another tab. Close it and retry.")) }
    request.onerror = () => { settled = true; reject(new ProjectStorageError(
      request.error?.name === "VersionError"
        ? "These projects belong to a newer GhostFrame version and were left unchanged."
        : "Project storage is unavailable. Your current work is still open.",
    )) }
    request.onsuccess = () => {
      const db = request.result
      if (settled) { db.close(); return }
      settled = true
      db.onversionchange = () => db.close()
      resolve(db)
    }
  })
}

const requiredString = (value: unknown) => typeof value === "string" && value.trim().length > 0
const timestamp = (value: unknown) => requiredString(value) && Number.isFinite(Date.parse(value as string))

export function parseProjectRecord(value: unknown): ProjectRecord | null {
  if (!value || typeof value !== "object") return null
  const record = value as Partial<ProjectRecord>
  const editor = validateEditorSnapshot(record.editor)
  if (record.version !== PROJECT_SCHEMA_VERSION || !requiredString(record.id) || !requiredString(record.name) ||
    !timestamp(record.createdAt) || !timestamp(record.updatedAt) || !requiredString(record.sourceFileName) || !isBlob(record.source) ||
    !editor || (record.watermark !== null && !isBlob(record.watermark)) ||
    (record.watermark === null ? record.watermarkFileName !== null : !requiredString(record.watermarkFileName))) return null
  return {
    id: record.id!, version: PROJECT_SCHEMA_VERSION, name: record.name!, createdAt: record.createdAt!, updatedAt: record.updatedAt!,
    editor, source: record.source!, sourceFileName: record.sourceFileName!, watermark: record.watermark!,
    watermarkFileName: record.watermarkFileName!,
  }
}

function isBlob(value: unknown): value is Blob {
  return Boolean(value && typeof value === "object" && typeof (value as Blob).slice === "function" &&
    typeof (value as Blob).size === "number" && typeof (value as Blob).type === "string")
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const db = await openProjectDatabase()
  try {
    const transaction = db.transaction(PROJECT_STORE_NAME, "readonly")
    const values = await requestResult<unknown[]>(transaction.objectStore(PROJECT_STORE_NAME).getAll())
    await transactionDone(transaction)
    return values.flatMap((value) => {
      if (!value || typeof value !== "object") return []
      const item = value as Partial<ProjectRecord>
      return requiredString(item.id) && requiredString(item.name) && timestamp(item.createdAt) && timestamp(item.updatedAt)
        ? [{ id: item.id as string, name: item.name as string, createdAt: item.createdAt as string, updatedAt: item.updatedAt as string }]
        : []
    }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } finally { db.close() }
}

export async function readProject(id: string): Promise<ProjectRecord> {
  const db = await openProjectDatabase()
  try {
    const transaction = db.transaction(PROJECT_STORE_NAME, "readonly")
    const value = await requestResult<unknown>(transaction.objectStore(PROJECT_STORE_NAME).get(id))
    await transactionDone(transaction)
    if (!value) throw new ProjectStorageError("That saved project no longer exists.")
    const version = (value as { version?: unknown }).version
    if (typeof version === "number" && version > PROJECT_SCHEMA_VERSION) throw new UnsupportedProjectError("This project was created by a newer GhostFrame version and was left unchanged.")
    const parsed = parseProjectRecord(value)
    if (!parsed) throw new ProjectStorageError("This saved project is incomplete or damaged and cannot be opened.")
    return parsed
  } finally { db.close() }
}

export async function saveProject(record: ProjectRecord): Promise<ProjectRecord> {
  const parsed = parseProjectRecord(record)
  if (!parsed) throw new ProjectStorageError("The project data is invalid and was not saved.")
  const db = await openProjectDatabase()
  let completion: Promise<void> | null = null
  try {
    const transaction = db.transaction(PROJECT_STORE_NAME, "readwrite")
    const done = transactionDone(transaction); completion = done
    const store = transaction.objectStore(PROJECT_STORE_NAME)
    const existing = await requestResult<unknown>(store.get(parsed.id))
    if (existing && typeof existing === "object" && typeof (existing as { version?: unknown }).version === "number" && (existing as { version: number }).version > PROJECT_SCHEMA_VERSION) {
      transaction.abort()
      try { await done } catch { /* Expected abort. */ }
      throw new UnsupportedProjectError("This project belongs to a newer GhostFrame version and was left unchanged.")
    }
    const existingRecord = parseProjectRecord(existing)
    const committed = existingRecord ? { ...parsed, createdAt: existingRecord.createdAt } : parsed
    await requestResult(store.put(committed))
    await done
    return committed
  } catch (error) {
    await completion?.catch(() => undefined)
    if (error instanceof ProjectStorageError) throw error
    throw new ProjectStorageError(error instanceof DOMException && error.name === "QuotaExceededError"
      ? "Browser storage is full. Free some site storage and retry."
      : "The project could not be saved. Your previous saved version is unchanged.")
  } finally { db.close() }
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openProjectDatabase()
  let completion: Promise<void> | null = null
  try {
    const transaction = db.transaction(PROJECT_STORE_NAME, "readwrite")
    const done = transactionDone(transaction); completion = done
    const store = transaction.objectStore(PROJECT_STORE_NAME)
    const existing = await requestResult<unknown>(store.get(id))
    if (existing && typeof existing === "object" && typeof (existing as { version?: unknown }).version === "number" && (existing as { version: number }).version > PROJECT_SCHEMA_VERSION) {
      transaction.abort()
      try { await done } catch { /* Expected abort. */ }
      throw new UnsupportedProjectError("This project belongs to a newer GhostFrame version and was left unchanged.")
    }
    await requestResult(store.delete(id))
    await done
  } catch (error) {
    await completion?.catch(() => undefined)
    if (error instanceof ProjectStorageError) throw error
    throw new ProjectStorageError("The project could not be deleted. Your saved project is unchanged.")
  } finally { db.close() }
}
