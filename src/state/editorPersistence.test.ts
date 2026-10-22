import { describe, expect, it, vi } from "vitest"
import {
  EDITOR_SCHEMA_VERSION,
  EDITOR_STORAGE_KEY,
  LEGACY_PAGE_NAME_KEY,
  defaultEditorSnapshot,
  loadEditorSnapshot,
  serializeEditorSnapshot,
  validateEditorSnapshot,
  writeEditorSnapshot,
} from "./editorPersistence"

function memoryStorage(values: Record<string, string> = {}) {
  return {
    values,
    getItem: vi.fn((key: string) => values[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { values[key] = value }),
    removeItem: vi.fn((key: string) => { delete values[key] }),
  }
}

describe("editor persistence", () => {
  it("round trips every serializable field without image references", () => {
    const snapshot = defaultEditorSnapshot()
    snapshot.text = { ...snapshot.text, content: "Ánimo\n\n—sí—", pageName: "" }
    snapshot.filter = { active: "mist", intensity: 0.35 }
    snapshot.watermark = { opacity: 0.4, size: 21, position: "top-left" }
    snapshot.export = { resolution: "high", format: "image/png", quality: 0.75 }
    expect(validateEditorSnapshot(JSON.parse(serializeEditorSnapshot(snapshot)))).toEqual(snapshot)
    expect(Object.hasOwn(JSON.parse(serializeEditorSnapshot(snapshot)).watermark, "image")).toBe(false)
  })

  it("rejects malformed roots and defaults invalid or missing fields", () => {
    expect(validateEditorSnapshot(null)).toBeNull()
    expect(validateEditorSnapshot({ version: 99 })).toBeNull()
    const result = validateEditorSnapshot({
      version: EDITOR_SCHEMA_VERSION,
      text: { content: "kept", fontFamily: "Comic Sans", fontSize: Infinity, color: "red", position: "side", showOverlay: "yes" },
      filter: { active: "bad", intensity: 2 }, watermark: { opacity: -1, size: NaN, position: "bad" },
      export: { resolution: "huge", format: "gif", quality: -2 }, unknown: true,
    })!
    expect(result.text.content).toBe("kept")
    expect(result.text.fontFamily).toBe("Playfair Display")
    expect(result.text.fontSize).toBe(32)
    expect(result.text.color).toBe("#F2EBDD")
    expect(result.filter).toEqual({ active: "none", intensity: 1 })
    expect(result.watermark).toEqual({ opacity: 0.2, size: 15, position: "bottom-right" })
    expect(result.export).toEqual({ resolution: "low", format: "image/jpeg", quality: 0.92 })
  })

  it("preserves future snapshots without writing over them", () => {
    const storage = memoryStorage({ [EDITOR_STORAGE_KEY]: JSON.stringify({ version: 2, treasure: true }) })
    const loaded = loadEditorSnapshot(storage)
    expect(loaded.unsupportedVersion).toBe(true)
    expect(storage.setItem).not.toHaveBeenCalled()
    expect(storage.values[EDITOR_STORAGE_KEY]).toContain('"version":2')
  })

  it("recovers malformed new data from the legacy page name and preserves an empty new value", () => {
    const legacy = memoryStorage({ [EDITOR_STORAGE_KEY]: "{", [LEGACY_PAGE_NAME_KEY]: "Estoicos" })
    expect(loadEditorSnapshot(legacy)).toMatchObject({ restored: true, legacyMigrationPending: true, snapshot: { text: { pageName: "Estoicos" } } })
    const current = defaultEditorSnapshot(); current.text.pageName = ""
    const modern = memoryStorage({ [EDITOR_STORAGE_KEY]: serializeEditorSnapshot(current), [LEGACY_PAGE_NAME_KEY]: "Old" })
    expect(loadEditorSnapshot(modern).snapshot.text.pageName).toBe("")
    expect(loadEditorSnapshot(modern).legacyMigrationPending).toBe(false)
  })

  it("survives throwing reads and reports throwing writes", () => {
    expect(loadEditorSnapshot({ getItem: () => { throw new Error("blocked") } }).storageUnavailable).toBe(true)
    expect(() => writeEditorSnapshot({ setItem: () => { throw new Error("quota") } }, defaultEditorSnapshot())).toThrow("quota")
  })
})
