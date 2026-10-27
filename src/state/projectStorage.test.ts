import { IDBFactory, IDBObjectStore as FakeIDBObjectStore } from "fake-indexeddb"
import { Blob as NodeBlob } from "node:buffer"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { defaultEditorSnapshot } from "./editorPersistence"
import {
  PROJECT_DATABASE_NAME, PROJECT_STORE_NAME, UnsupportedProjectError,
  deleteProject, listProjects, openProjectDatabase, readProject, saveProject, type ProjectRecord,
} from "./projectStorage"

const record = (overrides: Partial<ProjectRecord> = {}): ProjectRecord => ({
  id: "one", version: 1, name: "First", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z",
  editor: defaultEditorSnapshot(), source: new NodeBlob([new Uint8Array([1, 2, 3])], { type: "image/png" }) as Blob, sourceFileName: "original.png",
  watermark: new NodeBlob([new Uint8Array([4, 5])], { type: "image/png" }) as Blob, watermarkFileName: "mark.png", ...overrides,
})

const bytes = (blob: Blob) => new Promise<number[]>((resolve, reject) => {
  if (typeof blob.arrayBuffer === "function") { void blob.arrayBuffer().then((value) => resolve(Array.from(new Uint8Array(value))), reject); return }
  const reader = new FileReader()
  reader.onload = () => resolve(Array.from(new Uint8Array(reader.result as ArrayBuffer)))
  reader.onerror = () => reject(reader.error)
  reader.readAsArrayBuffer(blob)
})

describe("project storage", () => {
  beforeEach(() => vi.stubGlobal("indexedDB", new IDBFactory()))

  it("saves, reads, lists, updates, and deletes complete records", async () => {
    let resolved = false
    const saving = saveProject(record()).then(() => { resolved = true })
    await Promise.resolve()
    expect(resolved).toBe(false)
    await saving
    const loaded = await readProject("one")
    expect(loaded.sourceFileName).toBe("original.png")
    expect(await bytes(loaded.source)).toEqual([1, 2, 3])
    expect(loaded.watermarkFileName).toBe("mark.png")
    expect(await bytes(loaded.watermark!)).toEqual([4, 5])
    expect(await listProjects()).toEqual([{ id: "one", name: "First", createdAt: loaded.createdAt, updatedAt: loaded.updatedAt }])
    await saveProject(record({ name: "Updated", updatedAt: "2026-02-01T00:00:00.000Z" }))
    expect((await readProject("one")).name).toBe("Updated")
    await deleteProject("one")
    expect(await listProjects()).toEqual([])
  })

  it("an aborted write leaves the prior record intact", async () => {
    await saveProject(record())
    const originalPut = FakeIDBObjectStore.prototype.put
    vi.spyOn(FakeIDBObjectStore.prototype, "put").mockImplementation(function (this: IDBObjectStore, value, key) {
      const request = originalPut.call(this, value, key)
      this.transaction.abort()
      return request
    })
    await expect(saveProject(record({ name: "Must not commit" }))).rejects.toThrow()
    expect((await readProject("one")).name).toBe("First")
  })

  it("does not overwrite or delete unsupported future records", async () => {
    const db = await openProjectDatabase()
    const transaction = db.transaction(PROJECT_STORE_NAME, "readwrite")
    transaction.objectStore(PROJECT_STORE_NAME).put({ ...record(), version: 99 })
    await new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onabort = () => reject(transaction.error) })
    db.close()
    await expect(saveProject(record({ name: "Overwrite" }))).rejects.toBeInstanceOf(UnsupportedProjectError)
    await expect(deleteProject("one")).rejects.toBeInstanceOf(UnsupportedProjectError)
    const check = await openProjectDatabase()
    const request = check.transaction(PROJECT_STORE_NAME).objectStore(PROJECT_STORE_NAME).get("one")
    const value = await new Promise<Record<string, unknown>>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
    expect(value.version).toBe(99); expect(value.name).toBe("First"); check.close()
  })

  it("reports unavailable IndexedDB without affecting startup state", async () => {
    vi.stubGlobal("indexedDB", { open: () => { throw new DOMException("blocked", "SecurityError") } })
    await expect(listProjects()).rejects.toThrow(/unavailable/)
  })

  it("returns only sanitized editor configuration and rejects inconsistent assets", async () => {
    const unsafe = record({ editor: { ...defaultEditorSnapshot(), text: { ...defaultEditorSnapshot().text, fontSize: 999, unknown: true } } as never })
    const db = await openProjectDatabase(); const transaction = db.transaction(PROJECT_STORE_NAME, "readwrite")
    transaction.objectStore(PROJECT_STORE_NAME).put({ ...unsafe, extra: "discard" })
    await new Promise<void>((resolve) => { transaction.oncomplete = () => resolve() }); db.close()
    const loaded = await readProject("one")
    expect(loaded.editor.text.fontSize).toBe(defaultEditorSnapshot().text.fontSize)
    expect(loaded.editor.text).not.toHaveProperty("unknown"); expect(loaded).not.toHaveProperty("extra")
    const broken = openProjectDatabase().then(async (next) => { const tx = next.transaction(PROJECT_STORE_NAME, "readwrite"); tx.objectStore(PROJECT_STORE_NAME).put({ ...record({ id: "broken" }), watermarkFileName: null }); await new Promise<void>((resolve) => { tx.oncomplete = () => resolve() }); next.close() })
    await broken
    await expect(readProject("broken")).rejects.toThrow(/incomplete or damaged/)
  })

  it("uses a dedicated database", () => expect(PROJECT_DATABASE_NAME).toBe("ghostframe.projects"))

  it("closes a connection delivered after a blocked open was rejected", async () => {
    const close = vi.fn(); const request: Record<string, unknown> = {}
    const opening = openProjectDatabase({ open: () => request as unknown as IDBOpenDBRequest } as unknown as IDBFactory)
    ;(request.onblocked as () => void)()
    await expect(opening).rejects.toThrow(/busy/)
    request.result = { close }
    ;(request.onsuccess as () => void)()
    expect(close).toHaveBeenCalledOnce()
  })
})
