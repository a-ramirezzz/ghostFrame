import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ExportConfig, FilterConfig, TextConfig, WatermarkConfig } from "../types"
import {
  EDITOR_STORAGE_KEY,
  LEGACY_PAGE_NAME_KEY,
  defaultEditorSnapshot,
  getLocalStorage,
  serializeEditorSnapshot,
  type EditorSnapshot,
  type LoadedEditorSnapshot,
  writeEditorSnapshot,
} from "../state/editorPersistence"

export type PersistenceStatus = "idle" | "restored" | "saving" | "saved" | "unavailable" | "unsupported" | "reset" | "reset-error"

interface EditorData {
  textConfig: TextConfig
  filterConfig: FilterConfig
  watermarkConfig: WatermarkConfig
  exportConfig: ExportConfig
}

const makeSnapshot = ({ textConfig, filterConfig, watermarkConfig, exportConfig }: EditorData): EditorSnapshot => ({
  version: 1,
  text: { ...textConfig },
  filter: { ...filterConfig },
  watermark: { opacity: watermarkConfig.opacity, size: watermarkConfig.size, position: watermarkConfig.position },
  export: { ...exportConfig },
})

export default function useEditorPersistence(initial: LoadedEditorSnapshot, data: EditorData) {
  const initialString = serializeEditorSnapshot(initial.snapshot)
  const initialBaseline: PersistenceStatus = initial.storageUnavailable ? "unavailable" : initial.restored ? "restored" : "idle"
  const pendingRef = useRef<EditorSnapshot | null>(initial.legacyMigrationPending ? initial.snapshot : null)
  const timerRef = useRef<number | null>(null)
  const blockedRef = useRef(initial.unsupportedVersion)
  const legacyMigrationRef = useRef(initial.legacyMigrationPending)
  const resetFailureRef = useRef(false)
  const lastSavedRef = useRef(initialString)
  const baselineStatusRef = useRef<PersistenceStatus>(initialBaseline)
  const [status, setStatus] = useState<PersistenceStatus>(
    initial.unsupportedVersion ? "unsupported" : initialBaseline,
  )

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const flush = useCallback(() => {
    if (blockedRef.current) {
      clearTimer()
      pendingRef.current = null
      setStatus("unsupported")
      return false
    }
    const pending = pendingRef.current
    if (!pending) return false
    clearTimer()
    const storage = getLocalStorage()
    if (!storage) { setStatus("unavailable"); return false }
    try {
      writeEditorSnapshot(storage, pending)
      if (legacyMigrationRef.current) storage.removeItem(LEGACY_PAGE_NAME_KEY)
      legacyMigrationRef.current = false
      lastSavedRef.current = serializeEditorSnapshot(pending)
      pendingRef.current = null
      baselineStatusRef.current = "saved"
      resetFailureRef.current = false
      setStatus("saved")
      return true
    } catch {
      setStatus("unavailable")
      return false
    }
  }, [clearTimer])

  const { textConfig, filterConfig, watermarkConfig, exportConfig } = data
  const snapshot = useMemo(
    () => makeSnapshot({ textConfig, filterConfig, watermarkConfig, exportConfig }),
    [exportConfig, filterConfig, textConfig, watermarkConfig],
  )
  const serialized = serializeEditorSnapshot(snapshot)
  useEffect(() => {
    if (blockedRef.current) return
    if (serialized === lastSavedRef.current) {
      clearTimer()
      if (legacyMigrationRef.current) {
        pendingRef.current = snapshot
      } else {
        pendingRef.current = null
        // oxlint-disable-next-line react/set-state-in-effect -- canceling obsolete external work restores its baseline status.
        if (!resetFailureRef.current) setStatus(baselineStatusRef.current)
      }
      return
    }
    pendingRef.current = snapshot
    resetFailureRef.current = false
    // oxlint-disable-next-line react/set-state-in-effect -- the status reflects this external storage synchronization.
    setStatus("saving")
    clearTimer()
    timerRef.current = window.setTimeout(flush, 300)
  }, [clearTimer, flush, serialized, snapshot])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- legacy migration synchronizes external storage on mount.
    if (legacyMigrationRef.current) flush()
  }, [flush])

  useEffect(() => {
    const pageHide = () => flush()
    const visibility = () => { if (document.visibilityState === "hidden") flush() }
    window.addEventListener("pagehide", pageHide)
    document.addEventListener("visibilitychange", visibility)
    return () => {
      clearTimer()
      window.removeEventListener("pagehide", pageHide)
      document.removeEventListener("visibilitychange", visibility)
    }
  }, [clearTimer, flush])

  const retry = useCallback(() => {
    if (blockedRef.current) {
      resetFailureRef.current = false
      setStatus("unsupported")
      return false
    }
    pendingRef.current = makeSnapshot(data)
    setStatus("saving")
    return flush()
  }, [data, flush])

  const clearSavedEditor = useCallback(() => {
    const storage = getLocalStorage()
    if (!storage) {
      resetFailureRef.current = true
      setStatus("reset-error")
      return false
    }
    try {
      storage.removeItem(LEGACY_PAGE_NAME_KEY)
      storage.removeItem(EDITOR_STORAGE_KEY)
      clearTimer()
      pendingRef.current = null
      const defaults = defaultEditorSnapshot()
      lastSavedRef.current = serializeEditorSnapshot(defaults)
      legacyMigrationRef.current = false
      blockedRef.current = false
      resetFailureRef.current = false
      baselineStatusRef.current = "reset"
      setStatus("reset")
      return true
    } catch {
      resetFailureRef.current = true
      setStatus("reset-error")
      return false
    }
  }, [clearTimer])

  return { status, retry, clearSavedEditor }
}
